/**
 * Renders a single contact sheet of the example's store screenshots.
 *   npx tsx scripts/contact-sheet.ts <example-dir>
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { registerBundledFonts } from '../vendor/wajha/engine/testing/canvasNode';

registerBundledFonts();

const dir = process.argv[2] ?? 'examples/open-tilawa';
const defaultRows = [
  { label: 'iPhone 6.9″  ·  App Store', folder: 'App Store/ar-SA/iPhone 6.9' },
  { label: 'iPhone 6.3″  ·  App Store', folder: 'App Store/ar-SA/iPhone 6.3' },
  { label: 'iPad 13″  ·  App Store', folder: 'App Store/ar-SA/iPad 13' },
  { label: 'Android phone  ·  Google Play', folder: 'Google Play/ar/Phone' },
  { label: 'Android tablet 10″  ·  Google Play', folder: 'Google Play/ar/Tablet 10' },
];
const rows = (process.env.SHEET_ROWS ? JSON.parse(process.env.SHEET_ROWS) : defaultRows).map((row: { label: string; folder: string }) => ({
  ...row,
  dir: `${dir}/${process.env.SHEET_ROOT ?? 'store-assets'}/${row.folder}`,
}));
const captions = process.env.SHEET_CAPTIONS
  ? JSON.parse(process.env.SHEET_CAPTIONS)
  : ['01 · Player', '02 · Reciters', '03 · Settings', '04 · About'];
const paper = process.env.SHEET_THEME === 'paper';
const sheet = paper
  ? { bg: '#f4f8fc', glow: 'rgba(93,151,201,0.20)', title: '#111111', sub: '#6b6b6b', label: '#1c4d78' }
  : { bg: '#071b17', glow: 'rgba(43,179,154,0.18)', title: '#fbf5e6', sub: '#9fc4b8', label: '#e9c98b' };

const margin = 40;
const gap = 24;
const cellW = 280;
const titleH = 150;
const rowLabelH = 46;
const captionH = 38;
const rowGap = 30;

const rowHeights = await Promise.all(
  rows.map(async (row) => {
    const image = await loadImage(`${row.dir}/01.png`);
    return Math.round((cellW * image.height) / image.width);
  }),
);

const width = margin * 2 + cellW * 4 + gap * 3;
const height =
  titleH +
  rowHeights.reduce((sum, h) => sum + rowLabelH + h + captionH + rowGap, 0) -
  rowGap +
  margin;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.fillStyle = sheet.bg;
ctx.fillRect(0, 0, width, height);

const glow = ctx.createRadialGradient(width / 2, height * 0.4, 0, width / 2, height * 0.4, width * 0.65);
glow.addColorStop(0, sheet.glow);
glow.addColorStop(1, 'rgba(0,0,0,0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, width, height);

const gold = sheet.label;
const cream = sheet.title;
const soft = sheet.sub;

ctx.fillStyle = cream;
ctx.font = '700 34px Inter';
ctx.fillText(process.env.SHEET_TITLE ?? 'Tilawah — store screenshots', margin, 70);

ctx.fillStyle = soft;
ctx.font = '500 20px Inter';
ctx.fillText(
  process.env.SHEET_SUBTITLE ?? 'Arabic (ar-SA)  ·  Noor template  ·  20 files  ·  8-bit RGB',
  margin,
  104,
);

let y = titleH;
for (const [rowIndex, row] of rows.entries()) {
  ctx.fillStyle = gold;
  ctx.font = '600 20px Inter';
  ctx.fillText(row.label, margin, y + 26);

  const imageTop = y + rowLabelH;
  const rowH = rowHeights[rowIndex];
  for (let i = 0; i < 4; i++) {
    const x = margin + i * (cellW + gap);
    const image = await loadImage(`${row.dir}/${String(i + 1).padStart(2, '0')}.png`);

    ctx.save();
    ctx.shadowColor = paper ? 'rgba(28,77,120,0.16)' : 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 12;
    ctx.beginPath();
    ctx.roundRect(x, imageTop, cellW, rowH, 14);
    ctx.fillStyle = paper ? '#ffffff' : '#04120f';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, imageTop, cellW, rowH, 14);
    ctx.clip();
    ctx.drawImage(image, x, imageTop, cellW, rowH);
    ctx.restore();

    ctx.fillStyle = soft;
    ctx.font = '500 15px Inter';
    ctx.fillText(captions[i], x + 3, imageTop + rowH + 24);
  }

  y = imageTop + rowH + captionH + rowGap;
}

const out = process.env.SHEET_OUT ?? `${dir}/contact-sheet.png`;
writeFileSync(out, canvas.toBuffer('image/png'));
console.log(`${out}  ${width}x${height}`);
