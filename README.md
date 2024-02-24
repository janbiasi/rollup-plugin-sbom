[![CI](https://github.com/janbiasi/rollup-plugin-sbom/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/janbiasi/rollup-plugin-sbom/actions/workflows/ci.yml) ![npm](https://img.shields.io/npm/v/rollup-plugin-sbom)
![npm type definitions](https://img.shields.io/npm/types/rollup-plugin-sbom) [![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/janbiasi/rollup-plugin-sbom/badge)](https://securityscorecards.dev/viewer/?uri=github.com/janbiasi/rollup-plugin-sbom)
![npm peer dependency version (scoped)](https://img.shields.io/npm/dependency-version/rollup-plugin-sbom/peer/rollup?logo=rollupdotjs&color=%23EA483F) ![img](https://img.shields.io/badge/semver-2.0.0-green?logo=semver)

# rollup-plugin-sbom

Create [SBOMs]() _(Software Bill of Materials)_ in [CycloneDX](https://cyclonedx.org/) format for your [Vite](https://vitejs.dev/) and [Rollup](https://rollupjs.org/) projects, including only the software you're really shipping to production.

> A “software bill of materials” (SBOM) has emerged as a key building block in software security and software supply chain risk management. A SBOM is a nested inventory, a list of ingredients that make up software components.
>
> – [CISA (.gov)](https://www.cisa.gov) [[full article](https://www.cisa.gov/sbom)]

##### Content

- [Requirements and Compatibility](#requirements-and-compatibility)
- [Installation](#installation)
- [Usage](#usage)
  - [Usage with Vite](#usage-with-vite)
  - [Usage with Rollup](#usage-with-rollup)
  - [Configuration Options](#configuration-options)
- [Contributors](#contributors)

---

### Requirements and Compatibility

| Plugin | Vite   | Rollup | Node   |
| ------ | ------ | ------ | ------ |
| v1     | v4, v5 | v3, v4 | 18, 20 |

We're always supporting LTS Node.js versions and versions which still have security support. Plugin support will be dropped once a Node.js version reaches its final EOL.

### Installation

```sh
npm install --save-dev rollup-plugin-sbom
pnpm install -D rollup-plugin-sbom
yarn add --dev rollup-plugin-sbom
```

### Usage

#### Usage with [Vite](https://vitejs.dev/)

```ts
import { defineConfig } from "vite";
import sbom from "rollup-plugin-sbom";

export default defineConfig({
  plugins: [sbom()],
});
```

#### Usage with [Rollup](https://rollupjs.org/)

```js
import sbom from "rollup-plugin-sbom";

export default {
  plugins: [sbom()],
};
```

#### Configuration Options

| Name                | Default           | Description                                                |
| ------------------- | ----------------- | ---------------------------------------------------------- |
| `specVersion`       | `1.5`             | The CycloneDX specification version to use                 |
| `rootComponentType` | `application`     | The root component type, can be `library` or `application` |
| `outDir`            | `cyclonedx`       | The output directory where the BOM file will be saved.     |
| `outFilename`       | `bom`             | The base filename for the SBOM files.                      |
| `outFormats`        | `['json', 'xml']` | The formats to output. Can be any of `json` and `xml`.     |
| `saveTimestamp`     | `true`            | Whether to save the timestamp in the BOM metadata.         |
| `autodetect`        | `true`            | Whether to get the root package registered automatically.  |
| `generateSerial`    | `false`           | Whether to generate a serial number for the BOM.           |
| `includeWellKnown`  | `true`            | Whether to generate a SBOM in the `well-known` directory.  |

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/janbiasi"><img src="https://avatars.githubusercontent.com/u/4563751?v=4?s=100" width="100px;" alt="Jan R. Biasi"/><br /><sub><b>Jan R. Biasi</b></sub></a><br /><a href="#business-janbiasi" title="Business development">💼</a> <a href="#question-janbiasi" title="Answering Questions">💬</a> <a href="#mentoring-janbiasi" title="Mentoring">🧑‍🏫</a> <a href="https://github.com/janbiasi/rollup-plugin-sbom/commits?author=janbiasi" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/boostvolt"><img src="https://avatars.githubusercontent.com/u/51777660?v=4?s=100" width="100px;" alt="Jan Kott"/><br /><sub><b>Jan Kott</b></sub></a><br /><a href="https://github.com/janbiasi/rollup-plugin-sbom/commits?author=boostvolt" title="Code">💻</a> <a href="#ideas-boostvolt" title="Ideas, Planning, & Feedback">🤔</a> <a href="#content-boostvolt" title="Content">🖋</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
