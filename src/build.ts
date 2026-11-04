/**
 * capture-flow build: manifest + captures -> exact store screenshots.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { AssetInfo, FamilyId, LangCode, Project } from '../vendor/wajha/model/types';
import type { ImageLike } from '../vendor/wajha/engine/types';
import { FAMILIES, FAMILY_ORDER, sizeById } from '../vendor/wajha/model/catalog';
import { projectFromTemplate } from '../vendor/wajha/model/instantiate';
import { registerBundledFonts } from '../vendor/wajha/engine/testing/canvasNode';
import { BUILTIN_TEMPLATES } from '../vendor/wajha/templates';
import { exportPath } from '../vendor/wajha/export/paths';
import type { ShotManifest } from './manifest';
import { parseManifest } from './manifest';
import { loadCapture, renderSlidePng } from './render';

export interface BuildOptions {
  manifestPath: string;
  outDir?: string;
  log?: (line: string) => void;
}

export interface BuildReport {
  outDir: string;
  files: { path: string; width: number; height: number; family: FamilyId; lang: LangCode; slide: number }[];
  warnings: string[];
}

const isFamily = (value: string): value is FamilyId => Object.prototype.hasOwnProperty.call(FAMILIES, value);

const extOf = (path: string): 'png' | 'jpg' | 'webp' => {
  const lower = path.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
  if (lower.endsWith('.webp')) return 'webp';
  return 'png';
};

const assetId = (bytes: Uint8Array, ext: string) => `${createHash('sha256').update(bytes).digest('hex')}.${ext}`;

function pickTemplate(id: string) {
  const template = BUILTIN_TEMPLATES.find((t) => t.id === id);
  if (!template) {
    throw new Error(`Unknown template "${id}". Built-in templates: ${BUILTIN_TEMPLATES.map((t) => t.id).join(', ')}`);
  }
  return template;
}

/** All sizes the manifest asks for, or every default size of the used families. */
function pickSizes(manifest: ShotManifest, families: FamilyId[]) {
  if (manifest.sizes && manifest.sizes.length > 0) {
    return manifest.sizes.map((id) => {
      const size = sizeById(id);
      if (!size) throw new Error(`Unknown export size "${id}"`);
      return size;
    });
  }
  return FAMILY_ORDER.filter((f) => families.includes(f)).flatMap((f) => FAMILIES[f].sizes.filter((s) => s.default));
}

export async function build(opts: BuildOptions): Promise<BuildReport> {
  const log = opts.log ?? (() => {});
  const manifestPath = resolve(opts.manifestPath);
  const manifestDir = dirname(manifestPath);
  const manifest = parseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));

  const families = FAMILY_ORDER.filter((f) =>
    manifest.slides.some((slide) => Object.prototype.hasOwnProperty.call(slide.captures, f)),
  );
  if (families.length === 0) throw new Error('No slide has a capture for a known device family');

  for (const slide of manifest.slides) {
    for (const family of Object.keys(slide.captures)) {
      if (!isFamily(family)) throw new Error(`Unknown device family "${family}" (known: ${FAMILY_ORDER.join(', ')})`);
    }
  }

  const template = pickTemplate(manifest.template);
  const languages = [...new Set(manifest.languages)] as LangCode[];
  const project: Project = projectFromTemplate(template, {
    name: manifest.app,
    families,
    languages,
  });

  const chosen = manifest.slides.map((slide, i) => {
    const index = slide.templateSlide ?? i;
    const source = project.slides[index];
    if (!source) throw new Error(`slides[${i}] wants template slide ${index}, but "${template.id}" has ${project.slides.length}`);
    return source;
  });
  project.slides = chosen;

  const images = new Map<string, ImageLike>();
  const warnings: string[] = [];

  for (const [index, slide] of project.slides.entries()) {
    const spec = manifest.slides[index];
    for (const lang of languages) {
      slide.texts[lang] = {
        ...(slide.texts[lang] ?? {}),
        headline: spec.headline,
        ...(spec.subtitle !== undefined ? { subtitle: spec.subtitle } : {}),
      };
    }
    for (const [family, file] of Object.entries(spec.captures)) {
      if (!isFamily(family)) continue;
      const absolute = resolve(manifestDir, file);
      let bytes: Uint8Array;
      try {
        bytes = readFileSync(absolute);
      } catch {
        throw new Error(`slides[${index}] capture not found: ${absolute}`);
      }
      const ext = extOf(absolute);
      const id = assetId(bytes, ext);
      if (!project.assets[id]) {
        const image = await loadCapture(absolute);
        const info: AssetInfo = {
          id,
          name: file.split(/[\\/]/).pop() ?? `capture.${ext}`,
          width: image.width,
          height: image.height,
          bytes: bytes.byteLength,
          addedAt: Date.now(),
        };
        project.assets[id] = info;
      }
      images.set(id, await loadCapture(absolute));
      for (const lang of languages) {
        slide.shots[family] = { ...(slide.shots[family] ?? {}), main: { ...(slide.shots[family]?.main ?? {}), [lang]: id } };
      }
    }
  }

  const outDir = resolve(opts.outDir ?? resolve(manifestDir, manifest.out ?? 'store-assets'));
  const structure = manifest.structure ?? 'stores';
  const sizes = pickSizes(manifest, families);
  const files: BuildReport['files'] = [];

  registerBundledFonts();

  for (const size of sizes) {
    if (!families.includes(size.family)) continue;
    for (const lang of languages) {
      for (const [slideIndex, slide] of project.slides.entries()) {
        const shot = slide.shots[size.family]?.main?.[lang] ?? null;
        if (!shot) warnings.push(`slide ${slideIndex + 1} (${size.family}, ${lang}) has no screenshot`);
        const rendered = renderSlidePng({
          project,
          slide,
          slideIndex,
          family: size.family,
          lang,
          width: size.width,
          height: size.height,
          images,
        });
        if (rendered.result.overflowingText.length > 0) {
          warnings.push(`slide ${slideIndex + 1} (${size.family}, ${lang}) text overflows at ${size.width}x${size.height}`);
        }
        if (rendered.result.missingShots.length > 0) {
          warnings.push(`slide ${slideIndex + 1} (${size.family}, ${lang}) uses a placeholder screen`);
        }
        const relative = exportPath(
          structure,
          { family: size.family, sizeId: size.id, width: size.width, height: size.height, lang, slideIndex },
          'png',
          manifest.app,
        );
        const target = resolve(outDir, relative);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, rendered.bytes);
        files.push({ path: relative.replaceAll('\\', '/'), width: size.width, height: size.height, family: size.family, lang, slide: slideIndex + 1 });
        log(`${relative}  ${size.width}x${size.height}`);
      }
    }
  }

  writeFileSync(
    resolve(outDir, 'capture-flow-report.json'),
    `${JSON.stringify({ app: manifest.app, template: template.id, structure, files, warnings }, null, 2)}\n`,
  );

  return { outDir, files, warnings };
}
