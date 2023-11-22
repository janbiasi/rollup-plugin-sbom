# rollup-plugin-sbom
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Create SBOMs for your Vite or Rollup projects.

### Compatibility

| Plugin | Vite | Rollup |
| ------ | ---- | ------ |
| v1     | v4   | v4     |

### Installation and usage

```sh
npm install --save-dev rollup-plugin-sbom
```

```ts
import { defineConfig } from "vite";
import sbom from "rollup-plugin-sbom";

export default defineConfig({
  plugins: [sbom()],
});
```

### Options

| Name                | Default       | Description                                                |
| ------------------- | ------------- | ---------------------------------------------------------- |
| `specVersion`       | `1.5`         | The CycloneDX specification version to use                 |
| `rootComponentType` | `application` | The root component type, can be `library` or `application` |
| `outDir`            | `cyclonedx`   | The output directory where the BOM file will be saved.     |
| `saveTimestamp`     | `true`        | Whether to save the timestamp in the BOM metadata.         |
| `autodetect`        | `true`        | Whether to get the root package registered automatically.  |
| `generateSerial`    | `false`       | Whether to generate a serial number for the BOM.           |

## Contributors

<!-- readme: contributors -start -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/boostvolt"><img src="https://avatars.githubusercontent.com/u/51777660?v=4?s=100" width="100px;" alt="Jan Kott"/><br /><sub><b>Jan Kott</b></sub></a><br /><a href="https://github.com/janbiasi/rollup-plugin-sbom/commits?author=boostvolt" title="Code">💻</a> <a href="#ideas-boostvolt" title="Ideas, Planning, & Feedback">🤔</a> <a href="#content-boostvolt" title="Content">🖋</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- readme: contributors -end -->
