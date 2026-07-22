import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const html = readFileSync("src/client/index.html", "utf8");
const client = readFileSync("src/client/main.ts", "utf8");
const css = readFileSync("src/client/style.css", "utf8");

describe("authentication runtime diagnostics", () => {
  it("disables iPhone token capitalization and correction", () => {
    expect(html).toContain('autocapitalize="none"');
    expect(html).toContain('autocorrect="off"');
  });
  it("normalizes and verifies locally stored tokens", () => {
    expect(client).toContain("token.value.trim()");
    expect(client).toContain('localStorage.getItem("pourmed-token")');
    expect(client).toContain('localStorage.setItem("pourmed-token"');
    expect(client).toContain("Token could not be read back");
    expect(client).toContain('$("local-token-length").textContent');
    expect(client).toContain('$("token-trimmed").textContent');
  });
  it("reports server acceptance independently of notification support", () => {
    expect(client).toContain('"Authenticated"');
    expect(client).toContain("notificationDiagnostics()");
    expect(client).toContain("serviceWorker.getRegistration()");
    expect(client).toContain("pushManager.getSubscription()");
    expect(client).toContain("note(errorMessage(error))");
    expect(html).toContain('id="server-token-length"');
  });
  it("sends the update command to a waiting worker and reloads on activation", () => {
    expect(client).toContain('updateViaCache: "none"');
    expect(client).toContain('waiting.postMessage({ type: "SKIP_WAITING" })');
    expect(client).toContain('addEventListener("controllerchange"');
    expect(client).toContain("location.reload()");
    expect(client).toContain("if (!reg.waiting)");
    expect(client).toContain("banner.hidden = true");
    expect(client).toContain('event.data?.type === "POURMED_ACTIVATED"');
    expect(css).toContain("#update-banner[hidden]");
    expect(css).toContain("display: none");
  });
  it("keeps immediate testing and adds a separate delayed test action", () => {
    expect(html).toContain('id="test">Send Test Notification');
    expect(html).toContain('id="test-delayed"');
    expect(html).toContain("Delayed Test Notification (10 seconds)");
    expect(client).toContain('mutate("/api/push/test")');
    expect(client).toContain('mutate("/api/push/test-delayed")');
  });
});
