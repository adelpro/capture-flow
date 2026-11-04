import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { registerBundledFonts } from '../vendor/wajha/engine/testing/canvasNode';

registerBundledFonts();
const families = GlobalFonts.families.map((f) => f.family);
console.log('fonts:', families.filter((f) => /Cairo|Noto Sans Arabic|Inter/i.test(f)).join(', '));
console.log('total font families:', families.length);

const root = process.argv[2] ?? 'examples/open-tilawa/store-assets';
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.png$/i.test(name) ? [full] : [];
  });

const classify = ([r, g, b]: number[]): string => {
  if (r < 40 && g < 80 && b < 80) return '.'; // deep emerald
  if (r > 200 && g > 200 && b > 200) return '#'; // light / screenshot
  if (r > 140 && g > 110 && b < 190 && r > b + 20) return '*'; // gold / warm
  if (r + g + b < 180) return ':'; // dark
  return '+';
};

for (const file of walk(root)) {
  const image = await loadImage(file);
  const cols = 48;
  const rows = Math.round((cols * image.height) / image.width / 2.1);
  const canvas = createCanvas(cols, rows);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const lines: string[] = [];
  const counts: Record<string, number> = {};
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const ch = classify([data[i], data[i + 1], data[i + 2]]);
      counts[ch] = (counts[ch] ?? 0) + 1;
      line += ch;
    }
    lines.push(line);
  }
  console.log(`\n=== ${file.replace(root + '/', '')} ${image.width}x${image.height} ${JSON.stringify(counts)}`);
  console.log(lines.join('\n'));
}
