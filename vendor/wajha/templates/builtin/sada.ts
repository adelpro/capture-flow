/**
 * Sada (صدى, "echo"): a minimal Arabic-first store frame drawn from Tilawah's
 * own palette. White paper, near-black ink, and the app's two spectrum blues
 * as the only colour: a soft wash behind the device and a spectrum strip drawn
 * from a real AnalyserNode snapshot. Cairo is used as the closest bundled match
 * to the app's IBM Plex Sans Arabic.
 */
import type { SlideElement } from '../../model/types';
import { F, METAL, background, circle, copyAt, device, r5, rect, ring, slide, solid, template, theme, typeset, type Cls } from '../kit';

const WAVE = '#1c4d78';
const WAVE_SOFT = '#5d97c9';
const WASH = '#f2f7fc';
const INK = '#111111';
const MUTED = '#6b6b6b';

/**
 * Real spectrum, not a decorative equaliser: the 28 bars Tilawah's player
 * draws, sampled from its AnalyserNode while it played at 0:07. This is the
 * app's own `downsample()` output, so the strip matches the screen. Replace
 * the array with a snapshot from your app to make the strip yours.
 */
const SPECTRUM = [
  0.38, 0.93, 1, 0.53, 0.44, 0.35, 0.36, 0.56, 0.68, 0.51, 0.49, 0.55, 0.52, 0.43, 0.49, 0.45,
  0.45, 0.46, 0.39, 0.51, 0.48, 0.42, 0.37, 0.36, 0.39, 0.39, 0.29, 0.21,
];

const t = typeset({
  heading: F.cairo,
  body: F.notoArabic,
  ink: INK,
  soft: MUTED,
  accent: WAVE,
  head: { weight: 700, size: 0.086, lineHeight: 1.18, letterSpacing: -0.01, maxLines: 2 },
  sub: { weight: 450, size: 0.038, lineHeight: 1.5, maxLines: 2 },
  eyebrow: { color: MUTED, highlight: WAVE, size: 0.024, letterSpacing: 0.14, weight: 600 },
});

const phone = (o: Parameters<typeof device>[0]) =>
  device({
    // Authored as an iPhone; the model swaps this default frame to the
    // Android phone / iPad frame when the family changes.
    frame: 'iphone',
    color: METAL.black,
    shadow: { color: '#11111124', blur: 0.06, x: 0, y: 0.025 },
    ...o,
  });

const laptop = (o: Parameters<typeof device>[0]) =>
  device({
    cls: 'wide',
    frame: 'macbook',
    color: METAL.black,
    shadow: { color: '#11111124', blur: 0.06, x: 0, y: 0.025 },
    ...o,
  });

/**
 * The app's spectrum, reduced to a single quiet mark. Bars share a baseline so
 * the strip reads as a level meter; colour alternates the two app blues.
 */
const spectrum = (centerX: number, baseY: number): SlideElement[] => {
  const count = SPECTRUM.length;
  const width = 0.0085;
  const gap = 0.0075;
  const total = count * width + (count - 1) * gap;
  return SPECTRUM.map((level, i) => {
    const height = r5(0.012 + level * 0.09);
    return rect({
      name: 'Spectrum',
      x: r5(centerX - total / 2 + width / 2 + i * (width + gap)),
      y: r5(baseY - height / 2),
      width,
      height,
      radius: r5(width / 2),
      color: i % 2 === 0 ? WAVE : WAVE_SOFT,
      opacity: r5(0.55 + level * 0.45),
    });
  });
};

/** Small label, headline and subtitle; shared by every slide so the rhythm stays identical. */
const top = (): SlideElement[] => [
  t.eyebrow({ y: 0.062 }),
  ...copyAt(t, { seam: 0.15, width: 0.86, subWidth: 0.74 }),
];

/** Copy centred in one half of a wide canvas, with the spectrum above the laptop. */
const wideTop = (x: number): SlideElement[] => [
  t.eyebrow({ x, y: 0.2, width: 0.44 }),
  ...copyAt(t, {
    cls: 'wide',
    seam: 0.55,
    x,
    width: 0.44,
    subWidth: 0.4,
    head: { size: 0.062 },
    sub: { size: 0.028 },
  }),
];

/** Wide canvas: copy and laptop trade sides, spectrum above the screen. */
const wideScene = (mirror: boolean, orbit = false): SlideElement[] => {
  const copyX = mirror ? 0.72 : 0.28;
  const lapX = mirror ? 0.29 : 0.72;
  return [
    circle({ name: 'Wash', x: lapX, y: 0.52, size: 0.92, color: WASH }),
    ...(orbit ? [ring({ name: 'Orbit', x: lapX, y: 0.52, size: 0.86, stroke: 0.0016, color: WAVE, opacity: 0.16 })] : []),
    ...spectrum(lapX, 0.3),
    ...wideTop(copyX),
    laptop({ width: 0.68, x: lapX, y: 0.55 }),
  ];
};

const hero = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.5, y: 0.655, size: 1.12, color: WASH }),
  ...spectrum(0.5, 0.3),
  ...top(),
  phone({ width: 0.74, top: 0.295 }),
];

const offset = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.6, y: 0.645, size: 1.02, color: WASH }),
  ...spectrum(0.58, 0.3),
  ...top(),
  phone({ width: 0.72, top: 0.3, x: 0.58 }),
];

const mirrored = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.4, y: 0.645, size: 1.02, color: WASH }),
  ...spectrum(0.42, 0.3),
  ...top(),
  phone({ width: 0.72, top: 0.3, x: 0.42 }),
];

const still = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.5, y: 0.66, size: 1.18, color: WASH }),
  ring({ name: 'Orbit', x: 0.5, y: 0.66, size: 1.05, stroke: 0.0016, color: WAVE, opacity: 0.16 }),
  ...spectrum(0.5, 0.3),
  ...top(),
  phone({ width: 0.78, top: 0.285 }),
];

/** Tall keeps the phone composition; wide gets the laptop and a two-column layout. */
const tallOrWide =
  (tall: () => SlideElement[], wide: (cls: Cls) => SlideElement[]) =>
  (cls: Cls): SlideElement[] =>
    cls === 'wide' ? wide(cls) : tall();

const classes = { classes: ['tall', 'wide'] as const };

export const sada = template({
  id: 'sada',
  name: 'Sada',
  description:
    "Minimal Arabic-first frame in Tilawah's own palette: white paper, near-black ink, the app's two spectrum blues, and a strip drawn from a real audio spectrum.",
  category: 'minimal',
  tags: ['arabic', 'minimal', 'blue', 'waveform', 'audio'],
  apps: ['music', 'meditation', 'tasks'],
  theme: theme({
    background: background(solid('#ffffff')),
    heading: F.cairo,
    body: F.notoArabic,
    palette: [WAVE, WAVE_SOFT, MUTED, INK, '#ffffff'],
  }),
  slides: [
    slide(
      {
        ar: { eyebrow: 'تلاوة', headline: 'استمع *بخشوع*', subtitle: 'تلاوة كاملة، بلا تشتيت.' },
        en: { eyebrow: 'Tilawah', headline: 'Listen with *presence*', subtitle: 'Full recitations, nothing in the way.' },
      },
      tallOrWide(hero, () => wideScene(false)),
      classes,
    ),
    slide(
      {
        ar: { eyebrow: 'تلاوة', headline: 'قارئك *المفضّل*', subtitle: 'نخبة من القرّاء، وبحث سريع.' },
        en: { eyebrow: 'Tilawah', headline: 'Your *favourite* reciter', subtitle: 'A curated list, one quick search.' },
      },
      tallOrWide(offset, () => wideScene(true)),
      classes,
    ),
    slide(
      {
        ar: { eyebrow: 'تلاوة', headline: 'تحكّم *كامل*', subtitle: 'السمة، اللغة، وسرعة التلاوة.' },
        en: { eyebrow: 'Tilawah', headline: 'Fully *yours*', subtitle: 'Theme, language and recitation speed.' },
      },
      tallOrWide(mirrored, () => wideScene(false, true)),
      classes,
    ),
    slide(
      {
        ar: { eyebrow: 'تلاوة', headline: 'حرّ *ومفتوح*', subtitle: 'بلا حسابات ولا تتبّع.' },
        en: { eyebrow: 'Tilawah', headline: 'Free and *open*', subtitle: 'No accounts, no tracking.' },
      },
      tallOrWide(still, () => wideScene(true, true)),
      classes,
    ),
  ],
});
