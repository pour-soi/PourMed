import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const listed = spawnSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
);
if (listed.status !== 0) throw new Error(listed.stderr);
const patterns = [
  /(VAPID_PRIVATE_KEY|ACCESS_TOKEN_HASH)=[A-Za-z0-9_-]{20,}/,
  /authorization:\s*Bearer\s+[A-Za-z0-9_-]{20,}/i,
];
const hits = [];
for (const file of listed.stdout.trim().split("\n").filter(Boolean)) {
  if (file === ".dev.vars.example") continue;
  const content = readFileSync(file);
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  if (patterns.some((pattern) => pattern.test(text))) hits.push(file);
}
if (hits.length)
  throw new Error(`Possible credential in source files: ${hits.join(", ")}`);
console.log(
  "No likely credentials found in tracked or untracked source files.",
);
