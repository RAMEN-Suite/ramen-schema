import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RAMEN_MODEL } from "@ramen-suite/core/ramen";

const origin = "https://ramen-schema.org";
const generated = fileURLToPath(new URL("../.generated/", import.meta.url));
const schemaDirectory = dirname(fileURLToPath(import.meta.resolve("@ramen-suite/core/schemas/model.schema.json")));
const corePackage = JSON.parse(await readFile(join(schemaDirectory, "../../../package.json"), "utf8"));

function publicPath(id) {
  const url = new URL(id);
  if (id !== origin + url.pathname || !/^\/(?:[\w.-]+\/)*[\w.-]+\.json$/.test(url.pathname)) {
    throw new Error(`Expected a canonical JSON URL on ${origin}, got ${id}`);
  }
  return url.pathname;
}

const files = (await readdir(schemaDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name)
  .sort();

const schemas = await Promise.all(
  files.map(async (filename) => {
    const contents = await readFile(join(schemaDirectory, filename));
    const schema = JSON.parse(contents.toString("utf8"));
    return { filename, path: publicPath(schema.$id), title: schema.title ?? filename, contents };
  }),
);

const referenceModel = {
  path: publicPath(RAMEN_MODEL.$id),
  contents: JSON.stringify(RAMEN_MODEL, null, 2) + "\n",
};

const resources = [...schemas, referenceModel];
if (!schemas.length || new Set(resources.map(({ path }) => path)).size !== resources.length) {
  throw new Error("Core must provide at least one schema and a unique canonical URL for each resource.");
}

await rm(generated, { recursive: true, force: true });
await Promise.all(
  resources.map(async ({ path, contents }) => {
    const destination = join(generated, "static", path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }),
);

const catalog = {
  coreVersion: corePackage.version,
  referenceModel: referenceModel.path,
  schemas: schemas.map(({ filename, path, title }) => ({ filename, path, title })),
};
await writeFile(join(generated, "specifications.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log(`Exported ${schemas.length} JSON schemas and the RAMEN reference model from Core ${corePackage.version}.`);
