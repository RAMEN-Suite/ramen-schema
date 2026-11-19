import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';

import { exportSpecifications, type ExportOptions, type ExportResult } from './export-specifications.ts';

type ArchiveDirectories = Pick<ExportOptions, 'archiveDirectory' | 'generatedDirectory'>;
type ModelFixture = ExportOptions['referenceModel'] & { readonly $schema: string };

interface ReleaseFixture {
  readonly coreVersion: string;
  readonly schemas: readonly [ExportOptions['schemas'][number]];
  readonly referenceModel: ModelFixture;
}

function assertRecord(value: unknown): asserts value is Readonly<Record<string, unknown>> {
  assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value));
}

async function fixture(t: TestContext): Promise<ArchiveDirectories> {
  const root: string = await mkdtemp(join(tmpdir(), 'ramen-specifications-'));
  t.after((): Promise<void> => rm(root, { recursive: true, force: true }));
  return { archiveDirectory: join(root, 'archive'), generatedDirectory: join(root, 'generated') };
}

function release(version: string): ReleaseFixture {
  const id: string = `https://ramen-schema.org/model/${version}/schema.json`;
  return {
    coreVersion: version,
    schemas: [
      { filename: 'model.schema.json', contents: Buffer.from(JSON.stringify({ $id: id, title: 'Model', type: 'object' })) },
    ],
    referenceModel: {
      $schema: id,
      $id: `https://ramen-schema.org/ramen/${version}/model.json`,
      name: 'RAMEN',
      version,
    },
  };
}

function archiveFile(options: Pick<ExportOptions, 'archiveDirectory'>, path: string): string {
  return join(options.archiveDirectory, 'files', path);
}

test('a later release retains and exports earlier canonical URLs', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  const first: ReleaseFixture = release('1.0.0');
  await exportSpecifications({ ...options, ...first, updateArchive: true });
  const oldSchema: Buffer = await readFile(archiveFile(options, '/model/1.0.0/schema.json'));
  const second: ReleaseFixture = release('2.0.0');
  const result: ExportResult = await exportSpecifications({ ...options, ...second, updateArchive: true });
  assert.deepEqual(result, { added: 2, updated: 0, archived: 4 });
  for (const version of ['1.0.0', '2.0.0']) {
    assert.deepEqual(
      await readFile(join(options.generatedDirectory, 'static', `model/${version}/schema.json`)),
      await readFile(archiveFile(options, `/model/${version}/schema.json`)),
    );
    assert.deepEqual(
      await readFile(join(options.generatedDirectory, 'static', `ramen/${version}/model.json`)),
      await readFile(archiveFile(options, `/ramen/${version}/model.json`)),
    );
  }
  assert.deepEqual(await readFile(archiveFile(options, '/model/1.0.0/schema.json')), oldSchema);
  const catalog: unknown = JSON.parse(await readFile(join(options.generatedDirectory, 'specifications.json'), 'utf8'));
  assertRecord(catalog);
  const schemas: unknown = catalog['schemas'];
  assert.ok(Array.isArray(schemas));
  const currentSchema: unknown = schemas[0];
  assertRecord(currentSchema);
  assert.equal(currentSchema['path'], '/model/2.0.0/schema.json');
  const archivedResources: unknown = catalog['archivedResources'];
  assert.ok(Array.isArray(archivedResources));
  assert.deepEqual(
    archivedResources
      .map((resource: unknown): unknown => {
        assertRecord(resource);
        return resource['path'];
      })
      .sort(),
    ['/model/1.0.0/schema.json', '/ramen/1.0.0/model.json'],
  );
  const manifest: Buffer = await readFile(join(options.archiveDirectory, 'manifest.json'));
  const repeat: ExportResult = await exportSpecifications({ ...options, ...second, coreVersion: '2.0.1', updateArchive: true });
  assert.equal(repeat.added, 0);
  assert.deepEqual(await readFile(join(options.archiveDirectory, 'manifest.json')), manifest);
});

test('sync refreshes same-version schemas and models while retaining older version URLs', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  const first: ReleaseFixture = release('1.0.0');
  await exportSpecifications({ ...options, ...first, updateArchive: true });
  const oldSchema: Buffer = await readFile(archiveFile(options, '/model/1.0.0/schema.json'));
  const oldModel: Buffer = await readFile(archiveFile(options, '/ramen/1.0.0/model.json'));
  const second: ReleaseFixture = release('2.0.0');
  await exportSpecifications({ ...options, ...second, updateArchive: true });
  const manifest: Buffer = await readFile(join(options.archiveDirectory, 'manifest.json'));
  const changedSchema: Buffer = Buffer.from(JSON.stringify({ $id: second.referenceModel.$schema, type: 'string' }));
  const changedModel: ModelFixture = { ...second.referenceModel, name: 'Updated RAMEN', imports: ['b', 'a'] };
  const changes: ExportOptions = {
    ...options,
    ...second,
    schemas: [{ filename: 'model.schema.json', contents: changedSchema }],
    referenceModel: changedModel,
  };

  await assert.rejects(exportSpecifications(changes), /0 new and 2 changed resource.*schemas:sync/);
  assert.deepEqual(await readFile(join(options.archiveDirectory, 'manifest.json')), manifest);
  await assert.rejects(exportSpecifications({ ...changes, updateArchive: true }), /schemas:sync -- --replace/);
  assert.deepEqual(await readFile(join(options.archiveDirectory, 'manifest.json')), manifest);
  const result: ExportResult = await exportSpecifications({ ...changes, updateArchive: true, replaceExisting: true });
  assert.deepEqual(result, { added: 0, updated: 2, archived: 4 });
  assert.deepEqual(await readFile(archiveFile(options, '/model/2.0.0/schema.json')), changedSchema);
  assert.deepEqual(await readFile(join(options.generatedDirectory, 'static/model/2.0.0/schema.json')), changedSchema);
  const modelBytes: Buffer = Buffer.from(JSON.stringify(changedModel, null, 2) + '\n');
  assert.deepEqual(await readFile(archiveFile(options, '/ramen/2.0.0/model.json')), modelBytes);
  assert.deepEqual(await readFile(join(options.generatedDirectory, 'static/ramen/2.0.0/model.json')), modelBytes);
  assert.deepEqual(await readFile(archiveFile(options, '/model/1.0.0/schema.json')), oldSchema);
  assert.deepEqual(await readFile(archiveFile(options, '/ramen/1.0.0/model.json')), oldModel);
  const repeat: ExportResult = await exportSpecifications(changes);
  assert.deepEqual(repeat, { added: 0, updated: 0, archived: 4 });
});

test('build mode requires a synced archive and does not create missing releases', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  await assert.rejects(exportSpecifications({ ...options, ...release('1.0.0') }), /schemas:sync/);
  await assert.rejects(readFile(join(options.archiveDirectory, 'manifest.json')), { code: 'ENOENT' });
  await exportSpecifications({ ...options, ...release('1.0.0'), updateArchive: true });
  await assert.rejects(exportSpecifications({ ...options, ...release('2.0.0') }), /schemas:sync/);
  const result: ExportResult = await exportSpecifications({ ...options, ...release('1.0.0') });
  assert.equal(result.added, 0);
});

test('build rejects archive corruption and sync rejects a missing manifest', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  await exportSpecifications({ ...options, ...release('1.0.0'), updateArchive: true });
  await writeFile(archiveFile(options, '/model/1.0.0/schema.json'), '{}\n');
  await assert.rejects(exportSpecifications({ ...options, ...release('1.0.0') }), /Archived resource was changed/);
  await rm(join(options.archiveDirectory, 'manifest.json'));
  await assert.rejects(exportSpecifications({ ...options, ...release('1.0.0'), updateArchive: true }), /manifest is missing/);
});

test('missing old files fail even when the current release is intact', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  await exportSpecifications({ ...options, ...release('1.0.0'), updateArchive: true });
  await exportSpecifications({ ...options, ...release('2.0.0'), updateArchive: true });
  await rm(archiveFile(options, '/model/1.0.0/schema.json'));
  await assert.rejects(exportSpecifications({ ...options, ...release('2.0.0') }), { code: 'ENOENT' });
});

test('foreign or non-canonical IDs cannot become archive paths', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  for (const id of [
    'not a URL',
    'https://example.org/schema.json',
    'https://ramen-schema.org/../schema.json',
    'https://ramen-schema.org/schema.json?version=1',
  ]) {
    await assert.rejects(
      exportSpecifications({
        ...options,
        ...release('1.0.0'),
        schemas: [{ filename: 'invalid.schema.json', contents: Buffer.from(JSON.stringify({ $id: id })) }],
        updateArchive: true,
      }),
      /canonical JSON URL/,
    );
  }
});

test('invalid archive metadata is rejected before generated files are replaced', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  const first: ReleaseFixture = release('1.0.0');
  await exportSpecifications({ ...options, ...first, updateArchive: true });
  const catalog: Buffer = await readFile(join(options.generatedDirectory, 'specifications.json'));
  const manifest: unknown = JSON.parse(await readFile(join(options.archiveDirectory, 'manifest.json'), 'utf8'));
  assertRecord(manifest);
  const resources: unknown = manifest['resources'];
  assert.ok(Array.isArray(resources));
  const entry: unknown = resources[0];
  assertRecord(entry);
  const invalidManifests: readonly unknown[] = [
    null,
    { version: 1, resources: [null] },
    { version: 1, resources: [{ ...entry, id: 42 }] },
    { version: 1, resources: [{ ...entry, id: 'not a URL' }] },
    { version: 1, resources: [{ ...entry, id: 'https://example.org/schema.json' }] },
    { version: 1, resources: [{ ...entry, filename: 42 }] },
    { version: 1, resources: [entry, entry] },
  ];

  for (const invalidManifest of invalidManifests) {
    await writeFile(join(options.archiveDirectory, 'manifest.json'), JSON.stringify(invalidManifest));
    await assert.rejects(
      exportSpecifications({ ...options, ...release('2.0.0'), updateArchive: true }),
      /JSON object|archive entry/,
    );
    assert.deepEqual(await readFile(join(options.generatedDirectory, 'specifications.json')), catalog);
    await assert.rejects(readFile(archiveFile(options, '/model/2.0.0/schema.json')), { code: 'ENOENT' });
  }
});

test('invalid current schema metadata is rejected without changing the archive', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  const first: ReleaseFixture = release('1.0.0');
  await exportSpecifications({ ...options, ...first, updateArchive: true });
  const manifest: Buffer = await readFile(join(options.archiveDirectory, 'manifest.json'));
  const catalog: Buffer = await readFile(join(options.generatedDirectory, 'specifications.json'));
  const invalidSchemas: readonly unknown[] = [null, [], { $id: 42 }, { $id: first.referenceModel.$schema, title: [] }];

  for (const invalidSchema of invalidSchemas) {
    await assert.rejects(
      exportSpecifications({
        ...options,
        ...first,
        schemas: [{ filename: 'invalid.schema.json', contents: Buffer.from(JSON.stringify(invalidSchema)) }],
        updateArchive: true,
      }),
      /JSON object|Invalid schema metadata/,
    );
    assert.deepEqual(await readFile(join(options.archiveDirectory, 'manifest.json')), manifest);
    assert.deepEqual(await readFile(join(options.generatedDirectory, 'specifications.json')), catalog);
  }
});

test('sync registers identical files left by an interrupted update', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  await exportSpecifications({ ...options, ...release('1.0.0'), updateArchive: true });
  const newer: ReleaseFixture = release('2.0.0');
  const orphanPath: string = archiveFile(options, '/model/2.0.0/schema.json');
  await mkdir(join(options.archiveDirectory, 'files/model/2.0.0'), { recursive: true });
  await writeFile(orphanPath, newer.schemas[0].contents);

  const result: ExportResult = await exportSpecifications({ ...options, ...newer, updateArchive: true });
  assert.deepEqual(result, { added: 2, updated: 0, archived: 4 });
  assert.deepEqual(await readFile(orphanPath), newer.schemas[0].contents);
  assert.deepEqual(await readFile(join(options.generatedDirectory, 'static/model/2.0.0/schema.json')), newer.schemas[0].contents);
  const repeat: ExportResult = await exportSpecifications({ ...options, ...newer });
  assert.deepEqual(repeat, { added: 0, updated: 0, archived: 4 });
});

test('conflicting unregistered files are preserved and reported without replacing the manifest', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  await exportSpecifications({ ...options, ...release('1.0.0'), updateArchive: true });
  const manifest: Buffer = await readFile(join(options.archiveDirectory, 'manifest.json'));
  const catalog: Buffer = await readFile(join(options.generatedDirectory, 'specifications.json'));
  const orphanPath: string = archiveFile(options, '/model/2.0.0/schema.json');
  const conflictingContents: Buffer = Buffer.from('{"unrelated":true}');
  await mkdir(join(options.archiveDirectory, 'files/model/2.0.0'), { recursive: true });
  await writeFile(orphanPath, conflictingContents);

  await assert.rejects(
    exportSpecifications({ ...options, ...release('2.0.0'), updateArchive: true }),
    /Unregistered archive file has different contents/,
  );
  assert.deepEqual(await readFile(orphanPath), conflictingContents);
  assert.deepEqual(await readFile(join(options.archiveDirectory, 'manifest.json')), manifest);
  assert.deepEqual(await readFile(join(options.generatedDirectory, 'specifications.json')), catalog);
});

test('a first sync resumes from temporary metadata or a partially written initial release', async (t: TestContext): Promise<void> => {
  for (const stage of ['temporary-manifest', 'partial-release']) {
    const options: ArchiveDirectories = await fixture(t);
    const first: ReleaseFixture = release('1.0.0');
    await mkdir(options.archiveDirectory, { recursive: true });
    if (stage === 'temporary-manifest') {
      await writeFile(join(options.archiveDirectory, 'manifest.json.tmp'), '{');
    } else {
      await writeFile(join(options.archiveDirectory, 'manifest.json'), JSON.stringify({ version: 1, resources: [] }));
      await mkdir(join(options.archiveDirectory, 'files/model/1.0.0'), { recursive: true });
      await writeFile(archiveFile(options, '/model/1.0.0/schema.json'), first.schemas[0].contents);
    }

    const result: ExportResult = await exportSpecifications({ ...options, ...first, updateArchive: true });
    assert.deepEqual(result, { added: 2, updated: 0, archived: 2 });
    assert.deepEqual(
      await readFile(join(options.generatedDirectory, 'static/model/1.0.0/schema.json')),
      first.schemas[0].contents,
    );
    const repeat: ExportResult = await exportSpecifications({ ...options, ...first });
    assert.deepEqual(repeat, { added: 0, updated: 0, archived: 2 });
  }
});

test('sync can resume after replacing a registered file before its manifest was updated', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  const first: ReleaseFixture = release('1.0.0');
  await exportSpecifications({ ...options, ...first, updateArchive: true });
  const changedSchema: Buffer = Buffer.from(JSON.stringify({ $id: first.referenceModel.$schema, type: 'string' }));
  const changes: ExportOptions = {
    ...options,
    ...first,
    schemas: [{ filename: 'model.schema.json', contents: changedSchema }],
    referenceModel: { ...first.referenceModel, name: 'Updated RAMEN' },
  };
  const schemaPath: string = archiveFile(options, '/model/1.0.0/schema.json');
  await writeFile(schemaPath, changedSchema);
  await writeFile(`${schemaPath}.tmp`, '{');
  await rm(archiveFile(options, '/ramen/1.0.0/model.json'));

  await assert.rejects(exportSpecifications(changes), /Archived resource was changed/);
  const resumed: ExportResult = await exportSpecifications({ ...changes, updateArchive: true, replaceExisting: true });
  assert.deepEqual(resumed, { added: 0, updated: 2, archived: 2 });
  assert.deepEqual(await readFile(schemaPath), changedSchema);
  await assert.rejects(readFile(`${schemaPath}.tmp`), { code: 'ENOENT' });
  const checked: ExportResult = await exportSpecifications(changes);
  assert.deepEqual(checked, { added: 0, updated: 0, archived: 2 });
});

test('replacement permission requires explicit sync mode', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  await assert.rejects(
    exportSpecifications({ ...options, ...release('1.0.0'), replaceExisting: true }),
    /requires archive sync mode/,
  );
  await assert.rejects(readFile(join(options.archiveDirectory, 'manifest.json')), { code: 'ENOENT' });
});

test('an unapproved replacement also blocks new URLs in the same update', async (t: TestContext): Promise<void> => {
  const options: ArchiveDirectories = await fixture(t);
  const first: ReleaseFixture = release('1.0.0');
  await exportSpecifications({ ...options, ...first, updateArchive: true });
  const manifest: Buffer = await readFile(join(options.archiveDirectory, 'manifest.json'));
  const newer: ReleaseFixture = release('2.0.0');
  const changes: ExportOptions = {
    ...options,
    ...newer,
    schemas: [
      ...newer.schemas,
      {
        filename: 'changed.schema.json',
        contents: Buffer.from(JSON.stringify({ $id: first.referenceModel.$schema, type: 'string' })),
      },
    ],
    updateArchive: true,
  };
  await assert.rejects(exportSpecifications(changes), /schemas:sync -- --replace/);
  assert.deepEqual(await readFile(join(options.archiveDirectory, 'manifest.json')), manifest);
  assert.deepEqual(await readFile(archiveFile(options, '/model/1.0.0/schema.json')), first.schemas[0].contents);
  await assert.rejects(readFile(archiveFile(options, '/model/2.0.0/schema.json')), { code: 'ENOENT' });
  const result: ExportResult = await exportSpecifications({ ...changes, replaceExisting: true });
  assert.deepEqual(result, { added: 2, updated: 1, archived: 4 });
});
