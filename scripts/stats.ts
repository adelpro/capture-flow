import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : /\.png$/i.test(name) ? [full] : [];
  });

for (const file of walk(process.argv[2] ?? 'examples/open-tilawa/captures')) {
  const image = await loadImage(file);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  let nonWhite = 0;
  let dark = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = 0;
  let maxY = 0;
  const colors = new Map<string, number>();
  for (let y = 0; y < image.height; y += 3) {
    for (let x = 0; x < image.width; x += 3) {
      const i = (y * image.width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r < 245 || g < 245 || b < 245) {
        nonWhite++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      if (r + g + b < 330) dark++;
      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      colors.set(key, (colors.get(key) ?? 0) + 1);
    }
  }
  const sampled = Math.ceil(image.width / 3) * Math.ceil(image.height / 3);
  const top = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log(
    `${file.split('/').slice(-1)[0]} ${image.width}x${image.height} nonWhite=${((100 * nonWhite) / sampled).toFixed(1)}% dark=${((100 * dark) / sampled).toFixed(1)}% bbox=${minX},${minY}-${maxX},${maxY} top=${JSON.stringify(top)}`,
  );
}
