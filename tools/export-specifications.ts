import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RAMEN_MODEL } from '@ramen-suite/core/ramen';

type JsonObject = Readonly<Record<string, unknown>>;
type ResourceKind = 'schema' | 'reference-model';

interface ResourceMetadata {
  readonly id: string;
  readonly path: string;
  readonly title: string;
  readonly kind: ResourceKind;
  readonly filename?: string;
}

interface CurrentResource extends ResourceMetadata {
  readonly contents: Buffer;
}

interface CurrentSchema extends CurrentResource {
  readonly kind: 'schema';
  readonly filename: string;
}

interface ArchivedResource extends ResourceMetadata {
  readonly coreVersion: string;
  readonly sha256: string;
}

interface ArchiveManifest {
  readonly version: 1;
  readonly resources: readonly ArchivedResource[];
}

interface ArchiveState {
  readonly manifest: ArchiveManifest;
  readonly contentsByPath: ReadonlyMap<string, Buffer>;
  readonly manifestExists: boolean;
}

interface SchemaFile {
  readonly filename: string;
  readonly contents: Buffer;
}

interface ReferenceModel {
  readonly $id: string;
  readonly name: string;
  readonly version: string;
  readonly [key: string]: unknown;
}

interface CurrentSpecifications {
  readonly schemas: readonly CurrentSchema[];
  readonly resources: readonly CurrentResource[];
  readonly paths: ReadonlySet<string>;
  readonly referenceModelPath: string;
}

interface SyncPlan {
  readonly changes: readonly CurrentResource[];
  readonly added: number;
  readonly updated: number;
}

interface CoreSpecifications {
  readonly coreVersion: string;
  readonly schemas: readonly SchemaFile[];
}

interface CommandOptions {
  readonly sync: boolean;
  readonly install: boolean;
  readonly replaceExisting: boolean;
}

type SchemaDownload = Pick<CurrentSchema, 'filename' | 'id' | 'path' | 'title'>;
type ArchivedDownload = Pick<ResourceMetadata, 'id' | 'path' | 'title' | 'kind'>;

interface SpecificationCatalog {
  readonly coreVersion: string;
  readonly referenceModel: string;
  readonly schemas: readonly SchemaDownload[];
  readonly archivedResources: readonly ArchivedDownload[];
}

/** Inputs for publishing current Core resources together with the permanent archive. */
export interface ExportOptions {
  /** Archive directory containing the manifest and canonical resource files. */
  readonly archiveDirectory: string;
  /** Rebuilt output directory; its previous generated contents are removed after validation. */
  readonly generatedDirectory: string;
  /** Core package release supplying the current resources. */
  readonly coreVersion: string;
  /** Original schema bytes and package filenames. */
  readonly schemas: readonly SchemaFile[];
  /** Complete reference model, serialised from the current Core package. */
  readonly referenceModel: ReferenceModel;
  /** Add current Core resources to the archive; existing URLs require explicit replacement permission. */
  readonly updateArchive?: boolean;
  /** Permit replacing existing snapshots during an explicitly requested archive sync. */
  readonly replaceExisting?: boolean;
}

/** Resource counts after a successful archive check and export. */
export interface ExportResult {
  /** Canonical resources added by this invocation. */
  readonly added: number;
  /** Existing canonical resources refreshed from Core by this invocation. */
  readonly updated: number;
  /** Total canonical resources retained, including the current release. */
  readonly archived: number;
}

const SPECIFICATION_ORIGIN: string = 'https://ramen-schema.org';
const COMMAND_USAGE: string = 'Usage: node tools/export-specifications.ts [--sync [--replace]|--install].';

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseObject(contents: string, source: string): JsonObject {
  const value: unknown = JSON.parse(contents);
  if (!isRecord(value)) throw new Error(`Expected a JSON object in ${source}.`);
  return value;
}

function readStringProperty(record: JsonObject, key: string, source: string): string {
  const value: unknown = record[key];
  if (typeof value !== 'string') throw new Error(`Invalid ${source}: ${key} must be a string.`);
  return value;
}

function readOptionalString(value: unknown, source: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`Invalid ${source}: expected a string.`);
  return value;
}

function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error['code'] === 'ENOENT';
}

function resolvePublicPath(id: string): string {
  if (!URL.canParse(id)) throw new Error(`Expected a canonical JSON URL on ${SPECIFICATION_ORIGIN}, got ${id}.`);
  const url: URL = new URL(id);

  const canonicalId: string = SPECIFICATION_ORIGIN + url.pathname;
  const validPath: boolean = /^\/(?:[\w.-]+\/)*[\w.-]+\.json$/.test(url.pathname);
  if (id !== canonicalId || !validPath) {
    throw new Error(`Expected a canonical JSON URL on ${SPECIFICATION_ORIGIN}, got ${id}.`);
  }
  return url.pathname;
}

function computeChecksum(contents: Buffer): string {
  return createHash('sha256').update(contents).digest('hex');
}

function parseResourceKind(value: unknown): ResourceKind {
  if (value === 'schema' || value === 'reference-model') return value;
  throw new Error('Invalid archive entry: unknown resource kind.');
}

function parseResourceFilename(value: unknown, kind: ResourceKind): string | undefined {
  const filename: string | undefined = readOptionalString(value, 'archive entry filename');
  if (kind === 'schema' && filename === undefined) throw new Error('Invalid archive entry: a schema needs a filename.');
  return filename;
}

function validateArchivedMetadata(resource: ArchivedResource): void {
  let expectedPath: string;
  try {
    expectedPath = resolvePublicPath(resource.id);
  } catch (error: unknown) {
    throw new Error(`Invalid archive entry: ${resource.id}.`, { cause: error });
  }

  if (resource.path !== expectedPath) throw new Error(`Invalid archive entry: ${resource.id}.`);
  if (!/^[a-f0-9]{64}$/.test(resource.sha256)) throw new Error(`Invalid archive entry: ${resource.id}.`);
}

function parseArchivedResource(value: unknown): ArchivedResource {
  if (!isRecord(value)) throw new Error('Invalid archive entry: expected resource metadata.');
  const kind: ResourceKind = parseResourceKind(value['kind']);
  const filename: string | undefined = parseResourceFilename(value['filename'], kind);

  const resource: ArchivedResource = {
    id: readStringProperty(value, 'id', 'archive entry'),
    path: readStringProperty(value, 'path', 'archive entry'),
    title: readStringProperty(value, 'title', 'archive entry'),
    kind,
    coreVersion: readStringProperty(value, 'coreVersion', 'archive entry'),
    sha256: readStringProperty(value, 'sha256', 'archive entry'),
    ...(filename === undefined ? {} : { filename }),
  };

  validateArchivedMetadata(resource);
  return resource;
}

function parseManifest(contents: string): ArchiveManifest {
  const manifest: JsonObject = parseObject(contents, 'archive manifest');
  if (manifest['version'] !== 1) throw new Error('Unsupported specification archive manifest.');

  const entries: unknown = manifest['resources'];
  if (!Array.isArray(entries)) throw new Error('Unsupported specification archive manifest.');
  const resources: readonly ArchivedResource[] = entries.map(parseArchivedResource);
  return { version: 1, resources };
}

async function validateEmptyArchive(directory: string): Promise<void> {
  const entries: string[] = await readdir(directory).catch((error: unknown): string[] => {
    if (!isMissingFileError(error)) throw error;
    return [];
  });

  const hasArchiveFiles: boolean = entries.some((entry: string): boolean => entry !== 'manifest.json.tmp');
  if (hasArchiveFiles) throw new Error('The specification archive exists but its manifest is missing.');
}

async function readManifest(directory: string): Promise<ArchiveManifest | undefined> {
  let contents: string;
  try {
    contents = await readFile(join(directory, 'manifest.json'), 'utf8');
  } catch (error: unknown) {
    if (!isMissingFileError(error)) throw error;
    await validateEmptyArchive(directory);
    return undefined;
  }

  return parseManifest(contents);
}

function validateArchivedContents(resource: ArchivedResource, contents: Buffer): void {
  const document: JsonObject = parseObject(contents.toString('utf8'), resource.id);
  const checksum: string = computeChecksum(contents);
  if (checksum !== resource.sha256 || document['$id'] !== resource.id) {
    throw new Error(`Archived resource was changed: ${resource.id}.`);
  }
}

async function readArchivedResource(
  directory: string,
  resource: ArchivedResource,
  canRefresh: boolean,
): Promise<Buffer | undefined> {
  let contents: Buffer;
  try {
    contents = await readFile(join(directory, 'files', resource.path));
  } catch (error: unknown) {
    if (canRefresh && isMissingFileError(error)) return undefined;
    throw error;
  }

  // A retry may find current files already replaced while their old checksums remain in the manifest.
  if (!canRefresh) validateArchivedContents(resource, contents);
  return contents;
}

async function readArchive(
  directory: string,
  currentPaths: ReadonlySet<string>,
  replaceExisting: boolean,
): Promise<ArchiveState> {
  const manifest: ArchiveManifest | undefined = await readManifest(directory);
  if (manifest === undefined) {
    return { manifest: { version: 1, resources: [] }, contentsByPath: new Map<string, Buffer>(), manifestExists: false };
  }

  const contentsByPath: Map<string, Buffer> = new Map<string, Buffer>();
  const registeredPaths: Set<string> = new Set<string>();
  for (const resource of manifest.resources) {
    if (registeredPaths.has(resource.path)) throw new Error(`Duplicate archive entry: ${resource.id}.`);
    registeredPaths.add(resource.path);

    const canRefresh: boolean = replaceExisting && currentPaths.has(resource.path);
    const contents: Buffer | undefined = await readArchivedResource(directory, resource, canRefresh);
    if (contents !== undefined) contentsByPath.set(resource.path, contents);
  }

  return { manifest, contentsByPath, manifestExists: true };
}

function parseCurrentSchema({ filename, contents }: SchemaFile): CurrentSchema {
  const schema: JsonObject = parseObject(contents.toString('utf8'), filename);
  const source: string = `schema metadata in ${filename}`;
  const id: string = readStringProperty(schema, '$id', source);
  const title: string = readOptionalString(schema['title'], source) ?? filename;

  return { filename, id, path: resolvePublicPath(id), title, kind: 'schema', contents };
}

function collectCurrentSpecifications(schemas: readonly SchemaFile[], referenceModel: ReferenceModel): CurrentSpecifications {
  if (schemas.length === 0) {
    throw new Error('Core must provide at least one schema and a unique canonical URL for each resource.');
  }
  const currentSchemas: readonly CurrentSchema[] = schemas.map(parseCurrentSchema);
  const referenceModelPath: string = resolvePublicPath(referenceModel.$id);

  const resources: readonly CurrentResource[] = [
    ...currentSchemas,
    {
      id: referenceModel.$id,
      path: referenceModelPath,
      title: `${referenceModel.name} reference model ${referenceModel.version}`,
      kind: 'reference-model',
      contents: Buffer.from(JSON.stringify(referenceModel, null, 2) + '\n'),
    },
  ];
  const paths: ReadonlySet<string> = new Set(resources.map((resource: CurrentResource): string => resource.path));
  if (paths.size !== resources.length) {
    throw new Error('Core must provide at least one schema and a unique canonical URL for each resource.');
  }

  return { schemas: currentSchemas, resources, paths, referenceModelPath };
}

function planArchiveSync(current: CurrentSpecifications, archive: ArchiveState): SyncPlan {
  const metadataByPath: ReadonlyMap<string, ArchivedResource> = new Map(
    archive.manifest.resources.map((resource: ArchivedResource): readonly [string, ArchivedResource] => [
      resource.path,
      resource,
    ]),
  );
  const changes: readonly CurrentResource[] = current.resources.filter((resource: CurrentResource): boolean => {
    const previous: Buffer | undefined = archive.contentsByPath.get(resource.path);
    const metadata: ArchivedResource | undefined = metadataByPath.get(resource.path);
    return !previous || !previous.equals(resource.contents) || metadata?.sha256 !== computeChecksum(resource.contents);
  });
  const added: number = changes.filter((resource: CurrentResource): boolean => !metadataByPath.has(resource.path)).length;

  return { changes, added, updated: changes.length - added };
}

function validateSyncPermissions(plan: SyncPlan, options: ExportOptions): void {
  const syncCommand: string = plan.updated > 0 ? 'npm run schemas:sync -- --replace' : 'npm run schemas:sync';
  if (plan.changes.length > 0 && !options.updateArchive) {
    throw new Error(
      `Core ${options.coreVersion} has ${plan.added} new and ${plan.updated} changed resource(s) not yet synced to the archive. ` +
        `Run ${syncCommand} locally and commit specifications/ with the Core update.`,
    );
  }

  if (plan.updated > 0 && !options.replaceExisting) {
    throw new Error(
      `Core ${options.coreVersion} changes ${plan.updated} existing resource(s). ` +
        'Run npm run schemas:sync -- --replace to explicitly replace their archived snapshots.',
    );
  }
}

async function writeManifest(path: string, manifest: ArchiveManifest): Promise<void> {
  await writeFile(`${path}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
  await rename(`${path}.tmp`, path);
}

async function writeArchivedResource(path: string, contents: Buffer, replace: boolean): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (replace) {
    await writeFile(`${path}.tmp`, contents);
    await rename(`${path}.tmp`, path);
    return;
  }

  try {
    await writeFile(path, contents, { flag: 'wx' });
  } catch (error: unknown) {
    if (!isRecord(error) || error['code'] !== 'EEXIST') throw error;
    const existing: Buffer = await readFile(path);
    if (!existing.equals(contents)) {
      throw new Error(`Unregistered archive file has different contents: ${path}. Restore or remove it before syncing again.`, {
        cause: error,
      });
    }
  }
}

function createArchivedMetadata(resource: CurrentResource, coreVersion: string): ArchivedResource {
  return {
    id: resource.id,
    path: resource.path,
    title: resource.title,
    kind: resource.kind,
    coreVersion,
    sha256: computeChecksum(resource.contents),
    ...(resource.filename === undefined ? {} : { filename: resource.filename }),
  };
}

async function synchroniseArchive(options: ExportOptions, archive: ArchiveState, plan: SyncPlan): Promise<ArchiveState> {
  if (plan.changes.length === 0) return archive;
  const directory: string = options.archiveDirectory;
  const manifestPath: string = join(directory, 'manifest.json');
  const resourcesByPath: Map<string, ArchivedResource> = new Map<string, ArchivedResource>(
    archive.manifest.resources.map((resource: ArchivedResource): readonly [string, ArchivedResource] => [
      resource.path,
      resource,
    ]),
  );
  const contentsByPath: Map<string, Buffer> = new Map<string, Buffer>(archive.contentsByPath);

  if (!archive.manifestExists) {
    // Establish a valid empty manifest so an interrupted first sync can also resume.
    await mkdir(directory, { recursive: true });
    await writeManifest(manifestPath, archive.manifest);
  }

  for (const resource of plan.changes) {
    const path: string = join(directory, 'files', resource.path);
    await writeArchivedResource(path, resource.contents, resourcesByPath.has(resource.path));
    resourcesByPath.set(resource.path, createArchivedMetadata(resource, options.coreVersion));
    contentsByPath.set(resource.path, resource.contents);
  }

  const resources: readonly ArchivedResource[] = [...resourcesByPath.values()].sort(
    (left: ArchivedResource, right: ArchivedResource): number => left.path.localeCompare(right.path),
  );
  const manifest: ArchiveManifest = { version: 1, resources };
  await writeManifest(manifestPath, manifest);
  return { manifest, contentsByPath, manifestExists: true };
}

function createCatalog(coreVersion: string, current: CurrentSpecifications, archive: ArchiveState): SpecificationCatalog {
  const schemas: readonly SchemaDownload[] = current.schemas.map(
    (schema: CurrentSchema): SchemaDownload => ({
      filename: schema.filename,
      id: schema.id,
      path: schema.path,
      title: schema.title,
    }),
  );
  const archivedResources: readonly ArchivedDownload[] = archive.manifest.resources
    .filter((resource: ArchivedResource): boolean => !current.paths.has(resource.path))
    .sort((left: ArchivedResource, right: ArchivedResource): number => left.path.localeCompare(right.path))
    .map(
      (resource: ArchivedResource): ArchivedDownload => ({
        id: resource.id,
        path: resource.path,
        title: resource.title,
        kind: resource.kind,
      }),
    );

  return { coreVersion, referenceModel: current.referenceModelPath, schemas, archivedResources };
}

async function exportArchive(directory: string, archive: ArchiveState, catalog: SpecificationCatalog): Promise<void> {
  await rm(directory, { recursive: true, force: true });
  await Promise.all(
    [...archive.contentsByPath].map(async ([path, contents]: [string, Buffer]): Promise<void> => {
      const destination: string = join(directory, 'static', path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, contents);
    }),
  );

  await writeFile(join(directory, 'specifications.json'), JSON.stringify(catalog, null, 2) + '\n');
}

/** Preserve canonical resources, then export the entire archive and a catalogue of the current Core release. */
export async function exportSpecifications(options: ExportOptions): Promise<ExportResult> {
  const replaceExisting: boolean = options.replaceExisting ?? false;
  const updateArchive: boolean = options.updateArchive ?? false;
  if (replaceExisting && !updateArchive) throw new Error('Replacing existing resources requires archive sync mode.');

  const current: CurrentSpecifications = collectCurrentSpecifications(options.schemas, options.referenceModel);
  const archive: ArchiveState = await readArchive(options.archiveDirectory, current.paths, replaceExisting && updateArchive);
  const plan: SyncPlan = planArchiveSync(current, archive);
  validateSyncPermissions(plan, options);

  const synchronised: ArchiveState = await synchroniseArchive(options, archive, plan);
  const catalog: SpecificationCatalog = createCatalog(options.coreVersion, current, synchronised);
  await exportArchive(options.generatedDirectory, synchronised, catalog);

  return { added: plan.added, updated: plan.updated, archived: synchronised.contentsByPath.size };
}

function parseCommandOptions(cliArguments: readonly string[]): CommandOptions {
  if (cliArguments.length > 2) throw new Error(COMMAND_USAGE);
  const validArguments: readonly string[] = ['--sync', '--install', '--replace'];
  const invalidArgument: string | undefined = cliArguments.find(
    (argument: string): boolean => !validArguments.includes(argument),
  );
  if (invalidArgument !== undefined) throw new Error(COMMAND_USAGE);

  const sync: boolean = cliArguments.includes('--sync');
  const install: boolean = cliArguments.includes('--install');
  const replaceExisting: boolean = cliArguments.includes('--replace');
  if (sync && install) throw new Error('--sync and --install cannot be combined.');
  if (replaceExisting && !sync) throw new Error('--replace requires --sync.');

  return { sync, install, replaceExisting };
}

async function readCoreSpecifications(): Promise<CoreSpecifications> {
  const directory: string = dirname(fileURLToPath(import.meta.resolve('@ramen-suite/core/schemas/model.schema.json')));
  const corePackage: JsonObject = parseObject(
    await readFile(join(directory, '../../../package.json'), 'utf8'),
    'Core package.json',
  );
  const coreVersion: string = readStringProperty(corePackage, 'version', 'Core package metadata');

  const entries: Dirent[] = await readdir(directory, { withFileTypes: true });
  const filenames: readonly string[] = entries
    .filter((entry: Dirent): boolean => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry: Dirent): string => entry.name)
    .sort();
  const schemas: readonly SchemaFile[] = await Promise.all(
    filenames.map(
      async (filename: string): Promise<SchemaFile> => ({
        filename,
        contents: await readFile(join(directory, filename)),
      }),
    ),
  );

  return { coreVersion, schemas };
}

async function main(): Promise<void> {
  const command: CommandOptions = parseCommandOptions(process.argv.slice(2));
  const core: CoreSpecifications = await readCoreSpecifications();
  const directory: string = fileURLToPath(new URL('../', import.meta.url));
  const ciValue: string | undefined = process.env['CI'];
  const ci: boolean = Boolean(ciValue && ciValue !== 'false');

  const result: ExportResult = await exportSpecifications({
    archiveDirectory: join(directory, 'specifications'),
    generatedDirectory: join(directory, '.generated'),
    coreVersion: core.coreVersion,
    schemas: core.schemas,
    referenceModel: RAMEN_MODEL,
    updateArchive: command.sync || (command.install && !ci),
    replaceExisting: command.replaceExisting,
  });

  console.log(
    `Exported ${core.schemas.length} current schemas from Core ${core.coreVersion}; ` +
      `${result.archived} canonical resources retained (${result.added} added, ${result.updated} updated).`,
  );
}

const entryPoint: string | undefined = process.argv[1];
if (entryPoint && resolve(entryPoint) === fileURLToPath(import.meta.url)) {
  await main();
}
