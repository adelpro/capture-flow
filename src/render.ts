/**
 * Render one slide at one exact size to an RGB PNG.
 * The Wajha engine is pure Canvas 2D; @napi-rs/canvas supplies the context in Node.
 */
import { loadImage, type Image } from '@napi-rs/canvas';
import type { AssetInfo, FamilyId, LangCode, Project, Slide } from '../vendor/wajha/model/types';
import type { Ctx2D, ImageLike, RenderResult } from '../vendor/wajha/engine/types';
import { renderSlide } from '../vendor/wajha/engine';
import { isRtl } from '../vendor/wajha/model/catalog';
import { mirrorsLayout } from '../vendor/wajha/model/mirror';
import { resolveLayout } from '../vendor/wajha/model/resolve';
import { languageTypography } from '../vendor/wajha/model/typography';
import { nodeEnv } from '../vendor/wajha/engine/testing/canvasNode';
import { encodePng } from '../vendor/wajha/export/png';

export interface RenderedPng {
  bytes: Uint8Array;
  result: RenderResult;
}

export interface RenderOptions {
  project: Project;
  slide: Slide;
  slideIndex: number;
  family: FamilyId;
  lang: LangCode;
  width: number;
  height: number;
  images: Map<string, ImageLike>;
}

const imageCache = new Map<string, Image>();

/** Loads a capture once per process; the engine only needs drawImage + width/height. */
export async function loadCapture(path: string): Promise<ImageLike> {
  const cached = imageCache.get(path);
  if (cached) return cached as unknown as ImageLike;
  const image = await loadImage(path);
  imageCache.set(path, image);
  return image as unknown as ImageLike;
}

/** Built from AssetInfo so layout does not wait on decoding. */
export function assetAspect(info: AssetInfo | undefined): number | null {
  if (!info) return null;
  const { width, height } = info;
  return width > 0 && height > 0 ? height / width : null;
}

export function renderSlidePng(opts: RenderOptions): RenderedPng {
  const { project, slide, slideIndex, family, lang, width, height, images } = opts;
  const layout = resolveLayout(project, slide, family);
  const { ctx } = nodeEnv.createCanvas(width, height);
  const result = renderSlide(ctx as Ctx2D, {
    width,
    height,
    family,
    slide,
    layout,
    theme: project.theme,
    lang,
    baseLang: project.languages[0] ?? lang,
    rtl: isRtl(lang),
    mirror: mirrorsLayout(project, lang),
    typography: languageTypography(project, lang),
    slideIndex,
    slideCount: project.slides.length,
    getImage: (assetId) => images.get(assetId) ?? null,
    getAssetAspect: (assetId) => assetAspect(project.assets[assetId]),
    placeholder: 'empty',
    env: nodeEnv,
  });
  const data = ctx.getImageData(0, 0, width, height).data;
  return { bytes: encodePng(data, width, height), result };
}
