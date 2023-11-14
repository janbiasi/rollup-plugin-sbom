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

| Name                | Default | Description                                            |
| ------------------- | ------- | ------------------------------------------------------ |
| `specVersion`       | TODO    | The CycloneDX specification version to use             |
| `rootComponentType` | TODO    | The root component type, can be library or application |
| `outDir`            | TODO    | TODO                                                   |
| `saveTimestamp`     | TODO    | TODO                                                   |
| `autodetect`        | TODO    | TODO                                                   |
| `generateSerial`    | TODO    | TODO                                                   |
