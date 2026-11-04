/**
 * capture-flow verify: checks the built tree, not the renderer's intent.
 * A file is valid only when its IHDR says 8-bit RGB (colour type 2) at the
 * exact size the store asks for.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { BuildReport } from './build';

export interface VerifiedFile {
  path: string;
  width: number;
  height: number;
  colorType: number;
  bitDepth: number;
  bytes: number;
}

const pngHeader = (file: string): Omit<VerifiedFile, 'path' | 'bytes'> | null => {
  const data = readFileSync(file);
  if (data.length < 33) return null;
  const signature = data.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  if (data.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data[24],
    colorType: data[25],
  };
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(png|jpe?g)$/i.test(name)) out.push(full);
  }
  return out;
}

export interface VerifyResult {
  ok: boolean;
  files: VerifiedFile[];
  errors: string[];
}

export function verify(dir: string): VerifyResult {
  const root = resolve(dir);
  const errors: string[] = [];
  const files: VerifiedFile[] = [];
  const reportPath = join(root, 'capture-flow-report.json');
  if (!existsSync(root)) return { ok: false, files, errors: [`missing output directory: ${root}`] };

  const found = new Map<string, string>();
  for (const file of walk(root)) {
    const rel = relative(root, file).replaceAll('\\', '/');
    const header = pngHeader(file);
    if (!header) {
      if (file.toLowerCase().endsWith('.png')) errors.push(`${rel}: not a readable PNG`);
      continue;
    }
    found.set(rel, file);
    files.push({ ...header, path: rel, bytes: statSync(file).size });
    if (!file.toLowerCase().endsWith('.png')) continue;
    if (header.bitDepth !== 8 || header.colorType !== 2) {
      errors.push(`${rel}: expected 8-bit RGB without alpha, got bit depth ${header.bitDepth}, colour type ${header.colorType}`);
    }
  }

  if (existsSync(reportPath)) {
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as BuildReport;
    for (const expected of report.files) {
      const file = found.get(expected.path);
      if (!file) {
        errors.push(`${expected.path}: missing`);
        continue;
      }
      const header = pngHeader(file);
      if (header && (header.width !== expected.width || header.height !== expected.height)) {
        errors.push(`${expected.path}: expected ${expected.width}x${expected.height}, got ${header.width}x${header.height}`);
      }
    }
  } else {
    errors.push('capture-flow-report.json: missing, cannot check the plan against the files');
  }

  return { ok: errors.length === 0, files, errors };
}
