import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const sw = readFileSync("public/sw.js", "utf8");
describe("service worker contract", () => {
  it.each(["install", "activate", "fetch", "push", "notificationclick"])(
    "handles %s",
    (e) => expect(sw).toContain(`"${e}"`),
  );
  it("does not cache private APIs", () =>
    expect(sw).toContain('u.pathname.startsWith("/api/")'));
  it("focuses or opens the app", () => {
    expect(sw).toContain(".focus()");
    expect(sw).toContain('openWindow("/")');
  });
  it("waits for an explicit update command and reloads clients after activation", () => {
    expect(sw).toContain('CACHE = "pourmed-shell-v10"');
    expect(sw).toContain('e.data?.type === "SKIP_WAITING"');
    expect(sw).toContain("e.waitUntil(self.skipWaiting())");
    expect(sw).toContain("self.clients.claim()");
    expect(sw).toContain("client.navigate(client.url)");
    expect(sw).toContain('type: "POURMED_ACTIVATED"');
    expect(sw.match(/self\.skipWaiting\(\)/g)).toHaveLength(1);
  });
});
