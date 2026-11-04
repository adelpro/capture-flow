/**
 * A shots manifest: the small, framework-agnostic input contract.
 * Paths are relative to the manifest file itself.
 */
export interface ShotSlide {
  /** Index in the template's slide list (default: the manifest slide's index). */
  templateSlide?: number;
  headline: string;
  subtitle?: string;
  /** Device family -> captured PNG/JPEG/WebP path. */
  captures: Record<string, string>;
}

export interface ShotManifest {
  app: string;
  template: string;
  out?: string;
  structure?: 'stores' | 'flat' | 'fastlane';
  languages: string[];
  /** Optional subset of catalog size ids (default: every default size of the used families). */
  sizes?: string[];
  slides: ShotSlide[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(message: string): never {
  throw new Error(`Invalid manifest: ${message}`);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(`"${path}" must be a non-empty string`);
  return value;
}

function parseSlide(value: unknown, index: number): ShotSlide {
  if (!isRecord(value)) fail(`slides[${index}] must be an object`);
  const headline = nonEmptyString(value.headline, `slides[${index}].headline`);

  let subtitle: string | undefined;
  if (value.subtitle !== undefined) subtitle = nonEmptyString(value.subtitle, `slides[${index}].subtitle`);

  let templateSlide: number | undefined;
  if (value.templateSlide !== undefined) {
    if (!Number.isInteger(value.templateSlide) || (value.templateSlide as number) < 0) {
      fail(`slides[${index}].templateSlide must be a non-negative integer`);
    }
    templateSlide = value.templateSlide as number;
  }

  if (!isRecord(value.captures) || Object.keys(value.captures).length === 0) {
    fail(`slides[${index}].captures must map a device family to a file`);
  }
  const captures: Record<string, string> = {};
  for (const [family, file] of Object.entries(value.captures)) {
    captures[family] = nonEmptyString(file, `slides[${index}].captures.${family}`);
  }

  return { headline, subtitle, templateSlide, captures };
}

/** Validates the manifest just enough that build errors name the offending field. */
export function parseManifest(raw: unknown): ShotManifest {
  if (!isRecord(raw)) fail('expected an object');

  const app = nonEmptyString(raw.app, 'app');
  const template = nonEmptyString(raw.template, 'template');

  if (!Array.isArray(raw.languages) || raw.languages.length === 0) {
    fail('"languages" must be a non-empty array of language codes');
  }
  const languages = raw.languages.map((lang, i) => nonEmptyString(lang, `languages[${i}]`));

  if (!Array.isArray(raw.slides) || raw.slides.length === 0) fail('"slides" must be a non-empty array');
  const slides = raw.slides.map(parseSlide);

  const structure = raw.structure;
  if (structure !== undefined && structure !== 'stores' && structure !== 'flat' && structure !== 'fastlane') {
    fail('"structure" must be "stores", "flat" or "fastlane"');
  }

  let sizes: string[] | undefined;
  if (raw.sizes !== undefined) {
    if (!Array.isArray(raw.sizes) || raw.sizes.length === 0) fail('"sizes" must be a non-empty array of size ids');
    sizes = raw.sizes.map((size, i) => nonEmptyString(size, `sizes[${i}]`));
  }

  return {
    app,
    template,
    out: raw.out === undefined ? undefined : nonEmptyString(raw.out, 'out'),
    structure: structure as ShotManifest['structure'],
    languages,
    sizes,
    slides,
  };
}
