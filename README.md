# rollup-plugin-sbom

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
