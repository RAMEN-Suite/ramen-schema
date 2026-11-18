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

## Installation

### Requirements

- Node.js `>=22.18.0`
- npm

Check your local versions:

```bash
node --version
npm --version
```

Install dependencies:

```bash
npm ci
```

## Usage

Start the local development server:

```bash
npm start
```

This opens the documentation site in your browser. Most changes to Markdown, React components, and configuration files are reflected automatically while the development server is running.

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

Clone the repository:

```bash
git clone <repository-url>
cd <repository-name>
```

Install dependencies:

```bash
npm ci
```

Start local development:

```bash
npm start
```

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

Concept figures live in `static/images/concepts/`. The selector example SVGs include editable draw.io data. To make a change, open the SVG in draw.io and export it again with **Include a copy of my diagram** enabled.

## Publishing specifications

`npm start` and `npm run build` automatically run `npm run schemas:export`. The script reads the JSON schemas bundled with the locked version of `@ramen-suite/core` and copies each file byte for byte to the path declared by its `$id` on `https://ramen-schema.org`. It also writes the reference model exported by Core and generates the catalogue for the Specification page.

GitHub Actions runs the production build and publishes the full `build/` directory to GitHub Pages. To update Core, run `npm install --save-dev --save-exact @ramen-suite/core@<version>` and commit both package files. If a new format supersedes a published `$id`, keep the previously published JSON at its original path under `static/`.

## Project Structure

```text
.
├── docs/                  # Documentation pages
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
