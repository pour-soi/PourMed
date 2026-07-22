import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const m = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
describe("manifest", () => {
  it("is installable", () => {
    expect(m).toMatchObject({
      name: "PourMed",
      short_name: "PourMed",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
    expect(
      m.icons.some((i: { purpose?: string }) => i.purpose === "maskable"),
    ).toBe(true);
  });
});
