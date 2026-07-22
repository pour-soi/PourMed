import { readFile } from "node:fs/promises";

const base = process.argv.at(-1);
if (!base?.startsWith("https://"))
  throw new Error("Usage: node scripts/verify-production.mjs https://HOST");
const token = (await readFile("secrets/access-token.txt", "utf8")).trim();
const auth = { authorization: `Bearer ${token}` };
const checks = [];
const check = (condition, label) => {
  if (!condition) throw new Error(`Production check failed: ${label}`);
  checks.push(label);
};
const request = (path, init = {}) => fetch(`${base}${path}`, init);

let markedTaken = false;
try {
  let response = await request("/api/health");
  check(response.status === 200, "health endpoint");
  response = await request("/api/status");
  check(response.status === 401, "unauthorized status rejected");
  response = await request("/api/taken", { method: "POST" });
  check(response.status === 401, "unauthorized taken rejected");
  response = await request("/api/status", { headers: auth });
  const initial = await response.json();
  check(response.status === 200 && initial.ok, "authorized status");
  response = await request("/api/taken", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: "{}",
  });
  const taken = await response.json();
  check(response.status === 200 && taken.data?.taken, "authorized taken");
  markedTaken = true;
  response = await request("/api/taken", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: "{}",
  });
  const repeated = await response.json();
  check(
    response.status === 200 && repeated.data?.takenAt === taken.data?.takenAt,
    "repeated taken is idempotent",
  );
  response = await request("/api/push/subscribe", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: "{}",
  });
  check(response.status === 400, "malformed subscription rejected");
  for (const [path, type] of [
    ["/", "text/html"],
    ["/manifest.webmanifest", "application/manifest+json"],
    ["/sw.js", "javascript"],
    ["/icons/icon-192.png", "image/png"],
  ]) {
    response = await request(path);
    check(
      response.status === 200 &&
        (response.headers.get("content-type") ?? "").includes(type),
      `${path} asset`,
    );
  }
} finally {
  if (markedTaken) {
    const response = await request("/api/not-taken", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: "{}",
    });
    const corrected = await response.json();
    check(
      response.status === 200 && corrected.data?.taken === false,
      "production state restored to not taken",
    );
  }
}
console.log(`Production verification passed (${checks.length} checks).`);
