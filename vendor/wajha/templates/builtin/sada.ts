/**
 * Sada (صدى, "echo"): a minimal Arabic-first store frame drawn from Tilawah's
 * own palette. White paper, near-black ink, and the app's two spectrum blues
 * as the only colour: a soft wash behind the device and a five-bar waveform.
 * Cairo is used as the closest bundled match to the app's IBM Plex Sans Arabic.
 */
import type { SlideElement } from '../../model/types';
import { F, METAL, background, circle, copyAt, device, r5, rect, ring, slide, solid, template, theme, typeset } from '../kit';

const WAVE = '#1c4d78';
const WAVE_SOFT = '#5d97c9';
const WASH = '#f2f7fc';
const INK = '#111111';
const MUTED = '#6b6b6b';

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
    frame: 'android-phone',
    color: METAL.black,
    shadow: { color: '#11111124', blur: 0.06, x: 0, y: 0.025 },
    ...o,
  });

/** Five rounded bars: the app's spectrum, reduced to a single quiet mark. */
const bars = (): SlideElement[] => {
  const heights = [0.026, 0.05, 0.078, 0.046, 0.03];
  const base = 0.252;
  const gap = 0.027;
  const width = 0.012;
  return heights.map((height, i) =>
    rect({
      name: 'Waveform',
      x: r5(0.5 + (i - 2) * gap),
      y: r5(base - height / 2),
      width,
      height,
      radius: r5(width / 2),
      color: i % 2 === 0 ? WAVE : WAVE_SOFT,
      opacity: i === 2 ? 1 : 0.65,
    }),
  );
};

/** Small label, headline and subtitle; shared by every slide so the rhythm stays identical. */
const top = (): SlideElement[] => [
  t.eyebrow({ y: 0.062 }),
  ...copyAt(t, { seam: 0.15, width: 0.86, subWidth: 0.74 }),
];

const hero = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.5, y: 0.655, size: 1.12, color: WASH }),
  ...bars(),
  ...top(),
  phone({ width: 0.74, top: 0.295 }),
];

const offset = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.6, y: 0.645, size: 1.02, color: WASH }),
  ...bars(),
  ...top(),
  phone({ width: 0.72, top: 0.3, x: 0.58 }),
];

const mirrored = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.4, y: 0.645, size: 1.02, color: WASH }),
  ...bars(),
  ...top(),
  phone({ width: 0.72, top: 0.3, x: 0.42 }),
];

const still = (): SlideElement[] => [
  circle({ name: 'Wash', x: 0.5, y: 0.66, size: 1.18, color: WASH }),
  ring({ name: 'Orbit', x: 0.5, y: 0.66, size: 1.05, stroke: 0.0016, color: WAVE, opacity: 0.16 }),
  ...bars(),
  ...top(),
  phone({ width: 0.78, top: 0.285 }),
];

export const sada = template({
  id: 'sada',
  name: 'Sada',
  description: "Minimal Arabic-first frame in Tilawah's own palette: white paper, near-black ink, and the app's two spectrum blues as the only colour.",
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
      hero,
    ),
    slide(
      {
        ar: { eyebrow: 'تلاوة', headline: 'قارئك *المفضّل*', subtitle: 'نخبة من القرّاء، وبحث سريع.' },
        en: { eyebrow: 'Tilawah', headline: 'Your *favourite* reciter', subtitle: 'A curated list, one quick search.' },
      },
      offset,
    ),
    slide(
      {
        ar: { eyebrow: 'تلاوة', headline: 'تحكّم *كامل*', subtitle: 'السمة، اللغة، وسرعة التلاوة.' },
        en: { eyebrow: 'Tilawah', headline: 'Fully *yours*', subtitle: 'Theme, language and recitation speed.' },
      },
      mirrored,
    ),
    slide(
      {
        ar: { eyebrow: 'تلاوة', headline: 'حرّ *ومفتوح*', subtitle: 'بلا حسابات ولا تتبّع.' },
        en: { eyebrow: 'Tilawah', headline: 'Free and *open*', subtitle: 'No accounts, no tracking.' },
      },
      still,
    ),
  ],
});
