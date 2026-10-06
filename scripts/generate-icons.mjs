// Generates the PWA / favicon icons from code. Run: npm run icons
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";

const LEVELS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
// A tiny contribution graph that "heats up" toward the top-right.
const PATTERN = [
  [1, 2, 3, 4],
  [0, 2, 4, 3],
  [2, 4, 2, 1],
  [4, 3, 1, 0],
];

function svg({ size = 512, rounded = true, scale = 1 }) {
  const cell = 84 * scale;
  const gap = 20 * scale;
  const grid = cell * 4 + gap * 3;
  const offset = (512 - grid) / 2;
  const radius = 14 * scale;
  const cells = PATTERN.flatMap((row, y) =>
    row.map(
      (level, x) =>
        `<rect x="${offset + x * (cell + gap)}" y="${offset + y * (cell + gap)}" width="${cell}" height="${cell}" rx="${radius}" fill="${LEVELS[level]}"${
          level === 0 ? ' stroke="#30363d" stroke-width="3"' : ""
        }/>`,
    ),
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#0d1117"/>${cells}</svg>`;
}

mkdirSync("public/icons", { recursive: true });
const png = (source, size, out) => sharp(Buffer.from(source)).resize(size, size).png().toFile(out);

writeFileSync("src/app/icon.svg", svg({}));
await Promise.all([
  png(svg({}), 192, "public/icons/icon-192.png"),
  png(svg({}), 512, "public/icons/icon-512.png"),
  // Maskable: full-bleed background, artwork inside the 80% safe circle.
  png(svg({ rounded: false, scale: 0.7 }), 512, "public/icons/maskable-512.png"),
  // iOS rounds the corners itself.
  png(svg({ rounded: false, scale: 0.85 }), 180, "src/app/apple-icon.png"),
]);
console.log("Icons generated.");
