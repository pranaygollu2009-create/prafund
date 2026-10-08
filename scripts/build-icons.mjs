/**
 * Builds the Prafund icon assets from public/favicon.svg:
 *   - public/favicon.ico          (16/32/48/256, PNG-compressed entries)
 *   - public/apple-touch-icon.png (180x180)
 *
 * Run:  npm i --no-save sharp && node scripts/build-icons.mjs
 * (sharp is intentionally not saved to package.json — it is only needed when
 * the brand mark changes.)
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../public/", import.meta.url);
const svg = readFileSync(new URL("favicon.svg", root));

async function png(size) {
  return sharp(svg, { density: (72 * size) / 64 })
    .resize(size, size)
    .png()
    .toBuffer();
}

const icoSizes = [16, 32, 48, 256];
const blobs = [];
for (const size of icoSizes) blobs.push(await png(size));

// ICONDIR: reserved, type=1 (icon), count
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);

// ICONDIRENTRY per image, then the image data
let offset = 6 + 16 * icoSizes.length;
const entries = icoSizes.map((size, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width  (0 means 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height (0 means 256)
  entry.writeUInt8(0, 2); // palette count (truecolor)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(blobs[i].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += blobs[i].length;
  return entry;
});

writeFileSync(new URL("favicon.ico", root), Buffer.concat([header, ...entries, ...blobs]));
writeFileSync(new URL("apple-touch-icon.png", root), await png(180));

console.log("Wrote public/favicon.ico (16/32/48/256) and public/apple-touch-icon.png (180)");
