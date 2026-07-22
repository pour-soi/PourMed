import { readFile, access } from "node:fs/promises";
import sharp from "sharp";
const m = JSON.parse(await readFile("dist/manifest.webmanifest", "utf8"));
for (const k of [
  "name",
  "short_name",
  "start_url",
  "scope",
  "display",
  "theme_color",
  "background_color",
])
  if (!m[k]) throw new Error(`Manifest missing ${k}`);
if (
  m.display !== "standalone" ||
  !m.icons.some((i) => i.purpose === "maskable")
)
  throw new Error("Manifest install metadata invalid");
for (const icon of m.icons) {
  const p = `dist${icon.src}`;
  await access(p);
  const meta = await sharp(p).metadata();
  const n = Number(icon.sizes.split("x")[0]);
  if (meta.width !== n || meta.height !== n)
    throw new Error(`Wrong dimensions: ${p}`);
}
for (const p of ["dist/sw.js", "dist/icons/apple-touch-icon.png"])
  await access(p);
console.log("Manifest, service worker, and icon assets verified.");
