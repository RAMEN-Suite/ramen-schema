# RAMEN Schema

Documentation website for **RAMEN** — the _Reusable Abstraction Model for Editorial Needs_.

## Overview

RAMEN is a reusable conceptual model for structuring heterogeneous data in digital scholarly editions. It organises sources, annotations, entities, collections, and their relationships within a shared model. This structure supports tools for modelling, capturing, connecting, and publishing editorial data.

**RAMEN Schema** documents the conceptual model and publishes the machine-readable specifications supplied by [RAMEN Core](https://github.com/RAMEN-Suite/ramen-core). It is intended for researchers, editors, developers, and Digital Humanities projects that work with structured editorial data.

The site is built with [Docusaurus](https://docusaurus.io/).

## Features

- Conceptual documentation for RAMEN
- Shared terminology for RAMEN-based project models
- Markdown/MDX-based documentation content
- Docusaurus-powered static website

## Citation

Please cite RAMEN as follows:

> Enns, Sebastian, and Andreas Kuczera. _RAMEN: Reusable Abstraction Model for Editorial Needs_. RAMEN Schema. https://ramen-schema.org/ (accessed YYYY-MM-DD).

Machine-readable citation metadata is available in [`CITATION.cff`](./CITATION.cff). See the website's [Citation](https://ramen-schema.org/citation) page for BibTeX.

## Configuration

The main configuration files are:

```text
docusaurus.config.ts   # Main Docusaurus configuration
sidebars.ts            # Documentation sidebar configuration
```

Static assets such as logos and images are stored in:

```text
static/
```

Documentation content is written in Markdown or MDX inside:

```text
docs/
```

## Development

Use Node.js `>=22.18.0` and npm. Clone the repository and select the Node version used by CI:

```bash
git clone https://github.com/RAMEN-Suite/RAMEN-Schema.git
cd RAMEN-Schema
nvm install
nvm use
```

Install dependencies:

```bash
npm ci
```

Start local development:

```bash
npm start
```

The development server opens the site in your browser and reloads when documentation or components change.

Check formatting and TypeScript before building:

```bash
npm run format
npm run typecheck
```

Use `npm run format:fix` to format documentation, source code, and configuration files.

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run serve
```

The generated static site is written to:

```text
build/
```

Concept and specification diagrams are editable SVGs in `static/images/concepts/` and `static/images/specification/`. Keep their round nodes, base-type colours, soft arrow paths, outer frames, and subtle worn texture consistent. Place relationship labels clear of arrow paths and node borders. Presentation changes must preserve project type names, refinement relationships, annotation `type` values, and property nesting. Keep annotation types distinct from selector types. Content is green, collections violet, annotations ochre, and entities red. Background areas mark the modelling perspective: content is green, context violet, and knowledge pink. Annotations can appear in any of these areas; show only the areas relevant to the example.

## Publishing specifications

`npm start` and `npm run build` automatically run `npm run schemas:export`. The script reads the JSON schemas bundled with the locked version of `@ramen-suite/core` and copies each file byte for byte to the path declared by its `$id` on `https://ramen-schema.org`. It also writes the reference model exported by Core and generates the catalogue for the Specification page.

GitHub Actions checks formatting and TypeScript, runs the production build, and publishes the full `build/` directory to GitHub Pages. Broken internal links and anchors fail the build. To update Core, run `npm install --save-dev --save-exact @ramen-suite/core@<version>` and commit both package files. If a new format supersedes a published `$id`, keep the previously published JSON at its original path under `static/`.

## Project Structure

```text
.
├── docs/                  # Documentation pages
├── scripts/               # Schema and reference model export
├── src/                   # Custom React components and CSS
├── static/                # Static assets such as logos and images
├── docusaurus.config.ts   # Main Docusaurus configuration
├── sidebars.ts            # Documentation sidebar configuration
├── package.json           # Project scripts and dependencies
└── README.md
```

## License

The documentation content, website text, diagrams, and conceptual explanations in this repository are licensed under the
[Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

Website source code, configuration files, scripts, and build-related project files are licensed under the
[Apache License 2.0](./LICENSE).

The published JSON schemas and reference model are supplied by the MIT-licensed RAMEN Core package.

## Maintainers / Contact

RAMEN Schema is maintained by the RAMEN project contributors.

- Sebastian Enns — <[mail@sebenns.com](mailto:mail@sebenns.com)>
- Maximilian Michel — <[maximilian.michel@adwmainz.de](mailto:maximilian.michel@adwmainz.de)>
- Vincent Neeb — <[vincent.neeb@mni.thm.de](mailto:vincent.neeb@mni.thm.de)>
- Andreas Kuczera — <[andreas.kuczera@mni.thm.de](mailto:andreas.kuczera@mni.thm.de)>
