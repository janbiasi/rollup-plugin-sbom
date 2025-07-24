import { describe, expect, test } from "vitest";
import { generatePackageId } from "../src/helpers";
import type { Package } from "normalize-package-data";

describe("Helpers", () => {
    test("It should generate module id's correctly", () => {
        expect(generatePackageId({ name: "a", version: "1.0.0" } as Package)).toEqual("a@1.0.0");
        expect(generatePackageId({ name: "b", version: "*" } as Package)).toEqual("b@*");
    });
});
