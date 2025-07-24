import { describe, expect, test } from "vitest";
import { filterExternalModuleId } from "../src/analyzer";

describe("Analyzer", () => {
    test("it should filterExternalModuleId correctly", () => {
        expect(filterExternalModuleId("\0diskless:index.js")).toBeFalsy();
        expect(filterExternalModuleId("./src/custom/module")).toBeFalsy();
        expect(filterExternalModuleId("/project/node_modules/vendor")).toBeTruthy();
    });
});
