import { describe, expect, test } from "vitest";
import { generatePackageId } from "../src/helpers";
import type { NormalizedPackageJson } from "../src/package-reader";

describe("Helpers", () => {
    test("it should generate module id's correctly", () => {
        expect(generatePackageId({ name: "a", version: "1.0.0" } as NormalizedPackageJson)).toEqual("a@1.0.0");
        expect(generatePackageId({ name: "b", version: "*" } as NormalizedPackageJson)).toEqual("b@*");
    });
});
