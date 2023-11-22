> [!WARNING]  
> This plugin is still in early development and not production ready just yet. Use with caution!
> You can check the current progress via [Milestone - V1](https://github.com/janbiasi/rollup-plugin-sbom/milestone/1).

![npm](https://img.shields.io/npm/v/rollup-plugin-sbom)
![npm type definitions](https://img.shields.io/npm/types/rollup-plugin-sbom)
![npm peer dependency version (scoped)](https://img.shields.io/npm/dependency-version/rollup-plugin-sbom/peer/rollup?logo=rollupdotjs&color=%23EA483F)

# rollup-plugin-sbom

Create SBOMs for your Vite or Rollup projects.

### Compatibility

| Plugin | Vite   | Rollup |
| ------ | ------ | ------ |
| v1     | v4, v5 | v3, v4 |

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
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/boostvolt"><img src="https://avatars.githubusercontent.com/u/51777660?v=4?s=100" width="100px;" alt="Jan Kott"/><br /><sub><b>Jan Kott</b></sub></a><br /><a href="https://github.com/janbiasi/rollup-plugin-sbom/commits?author=boostvolt" title="Code">💻</a> <a href="#ideas-boostvolt" title="Ideas, Planning, & Feedback">🤔</a> <a href="#content-boostvolt" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/janbiasi"><img src="https://avatars.githubusercontent.com/u/4563751?v=4?s=100" width="100px;" alt="Jan R. Biasi"/><br /><sub><b>Jan R. Biasi</b></sub></a><br /><a href="#business-janbiasi" title="Business development">💼</a> <a href="https://github.com/janbiasi/rollup-plugin-sbom/commits?author=janbiasi" title="Code">💻</a> <a href="#ideas-janbiasi" title="Ideas, Planning, & Feedback">🤔</a> <a href="#content-janbiasi" title="Content">🖋</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
