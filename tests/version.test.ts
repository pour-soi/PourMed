import { describe, expect, it } from "vitest";
import packageMetadata from "../package.json";
import { healthPayload } from "../src/shared/version";

describe("health endpoint version", () => {
  it("uses the canonical package version", () => {
    expect(healthPayload()).toEqual({
      service: "pourmed",
      version: packageMetadata.version,
    });
  });
});
