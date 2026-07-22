import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const dir = "public/icons";
await mkdir(dir, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#173b36"/><g transform="rotate(-38 256 256)"><rect x="116" y="196" width="280" height="120" rx="60" fill="#f7eee2"/><path d="M256 196h80a60 60 0 010 120h-80z" fill="#e09635"/><path d="M256 196v120" stroke="#173b36" stroke-width="10"/></g></svg>`;
await writeFile(`${dir}/icon.svg`, svg);
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`${dir}/${name}`);
