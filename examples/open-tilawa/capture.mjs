#!/usr/bin/env node
/**
 * Capture the deployed Tilawah web app at the two store shapes.
 *
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node capture.mjs
 *
 * CAPTURE_DEVICES='[{"key":"android","viewport":{"width":360,"height":800},"scale":3}]'
 * overrides the device list; CAPTURE_OUT overrides the output folder.
 *
 * iPhone:  440 x 956 CSS @3x = 1320 x 2868 (App Store 6.9")
 * Android: 360 x 640 CSS @3x = 1080 x 1920 (Google Play 9:16)
 *
 * It shoots the deployed site like the project's own screenshots.mjs, so the
 * catalogue, reciter and page copy are real.
 *
 * Audio: the app streams through a service worker that feeds an
 * `<audio src="/webtorrent/...">` element from WebTorrent. Headless Chromium
 * (no WebRTC peers, no persistent SW) never gets a byte, so the player sits at
 * 0:00. Tilawah's own documented fallback is the `/media/<folder>/<file>` web
 * seed (docs/STREAMING.md); this script uses that same same-origin URL when
 * the service-worker stream is requested. The UI, times and spectrum are then
 * the real player playing the real recitation.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.CAPTURE_OUT ?? path.join(HERE, 'captures');
const SITE = process.env.SHOT_URL ?? 'https://tilawah.cc';
const MODULE = process.env.PLAYWRIGHT_MODULE ?? 'playwright';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = await import(pathToFileURL(require.resolve(MODULE)).href);
} catch (error) {
  console.error(`Cannot load ${MODULE}: ${error.message}`);
  console.error('  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}
const chromium = playwright.chromium ?? playwright.default?.chromium;
if (!chromium) {
  console.error(`${MODULE} has no chromium export.`);
  process.exit(1);
}

/** What the listener chose last time: the locale, the palette, the pin. */
const state = (theme) =>
  JSON.stringify({
    version: 3,
    reciterId: 1,
    lastSurahId: 1,
    positions: {},
    settings: { locale: 'ar', theme, rate: 1 },
    updatedAt: Date.now(),
  });

const devices = process.env.CAPTURE_DEVICES
  ? JSON.parse(process.env.CAPTURE_DEVICES)
  : [
      { key: 'iphone', viewport: { width: 440, height: 956 }, scale: 3 },
      { key: 'android', viewport: { width: 360, height: 640 }, scale: 3 },
      // Large screens. The pixel sizes match the frames the store sizes expect:
      // iPad 13" is 3:4 (2064×2752), Android tablet is 16:10 inside a 9:16 canvas
      // (1600×2560 capture, 1440×2560 export).
      { key: 'ipad', viewport: { width: 768, height: 1024 }, scale: 2.6875 },
      { key: 'android-tablet', viewport: { width: 800, height: 1280 }, scale: 2 },
    ];

const allScreens = [
  { name: 'player', hash: '#/', flow: 'play' },
  { name: 'reciters', hash: '#/', flow: 'reciters' },
  { name: 'settings', hash: '#/settings', gate: 'settings' },
  { name: 'about', hash: '#/about', gate: 'about' },
];
const only = process.env.CAPTURE_SCREENS?.split(',').map((s) => s.trim()).filter(Boolean);
const screens = only?.length ? allScreens.filter((s) => only.includes(s.name)) : allScreens;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch().catch(async (error) => {
  if (!/Executable doesn't exist/.test(error.message)) throw error;
  return chromium.launch({ channel: 'chrome' });
});

try {
  for (const device of devices) {
    for (const screen of screens) {
      // Number from the full screen list so `CAPTURE_SCREENS` writes the same
      // filenames as a full run instead of overwriting android-01.png.
      const shot = String(allScreens.indexOf(screen) + 1).padStart(2, '0');
      const context = await browser.newContext({
        viewport: device.viewport,
        deviceScaleFactor: device.scale,
        locale: 'ar',
        colorScheme: 'light',
        // The app installs a streaming service worker at boot; blocking it
        // keeps the `/webtorrent/` request visible so it can be pointed at the
        // web seed below. The shell renders identically.
        serviceWorkers: 'block',
      });

      await context.route('**/webtorrent/**', (route) => {
        const url = new URL(route.request().url());
        const rest = url.pathname.replace(/^\/webtorrent\/[^/]+\//, '');
        return route.continue({ url: `${SITE}/media/${rest}` });
      });

      await context.addInitScript(
        ({ blob, consent }) => {
          try {
            localStorage.setItem('tilawah:v3', blob);
            localStorage.setItem('tilawah:telemetry', consent);
            localStorage.setItem('tilawa.pinned.v1', '0');
            localStorage.setItem('tilawa.keys.v1', 'seen');
          } catch {
            // A fresh profile with storage blocked still renders.
          }
        },
        { blob: state('light'), consent: 'off' },
      );

      const page = await context.newPage();

      // The deployed app hydrates after the catalogue answers; attach the wait
      // before navigating so a fast response is never missed.
      const ready =
        screen.gate === 'settings'
          ? page.getByText('المظهر').first().waitFor({ timeout: 60_000 })
          : screen.gate === 'about'
            ? page.locator('h1').first().waitFor({ timeout: 60_000 })
            : page.getByRole('button', { name: 'تشغيل' }).first().waitFor({ timeout: 60_000 });

      await page.goto(`${SITE}/${screen.hash}`, { waitUntil: 'commit', timeout: 60_000 });
      await ready;
      await page.waitForTimeout(screen.gate === 'about' ? 4_000 : 1_200);

      // Declining telemetry is stored above; this is a belt-and-braces pass for
      // a build that ignores the stored answer.
      const dismissConsent = async () => {
        const later = page.getByRole('button', { name: 'ليس الآن' });
        if (await later.count()) await later.first().click().catch(() => {});
      };

      if (screen.flow === 'reciters') {
        // Mobile 1.13.20+ opens the picker from the "اختيار القارئ" pill under
        // the player; desktop shows a nav tab that opens the list inline. Older
        // builds had a "عرض الكل" section button. Try each so the shot keeps
        // working across releases and breakpoints.
        const visible = page.locator('button:visible');
        const nav = visible.filter({ hasText: /^القرّاء$/ }).first();
        const picker = visible.filter({ hasText: 'اختيار القارئ' }).first();
        if (await nav.count()) {
          await nav.click({ timeout: 20_000 });
        } else if (await picker.count()) {
          await picker.click({ timeout: 20_000 });
        } else {
          const showAll = page.getByRole('button', { name: 'عرض الكل' }).first();
          await showAll.waitFor({ timeout: 45_000 });
          await showAll.click({ timeout: 20_000 });
        }
        await page.getByPlaceholder('ابحث باسم القارئ').first().waitFor({ timeout: 15_000 });
        await page.waitForTimeout(900);
      } else if (screen.flow === 'play') {
        await page.waitForTimeout(4_000);
        await page.getByRole('button', { name: 'تشغيل' }).first().click({ timeout: 20_000 });

        // Let the recitation really play so the clock and the spectrum ribbon
        // show a listening state rather than a paused one.
        await page
          .waitForFunction(
            () => {
              const audio = document.querySelector('audio');
              return !!audio && audio.readyState >= 2 && audio.currentTime > 0;
            },
            { timeout: 30_000 },
          )
          .catch(() => {});
        await page.waitForTimeout(7_000);
        await dismissConsent();
      } else {
        await page.waitForTimeout(700);
      }

      await page.evaluate(() => document.fonts.ready);
      const file = path.join(OUT, `${device.key}-${shot}.png`);
      await page.screenshot({ path: file, timeout: 90_000, animations: 'disabled' });

      const info = await page.evaluate(() => {
        const audio = document.querySelector('audio');
        return {
          size: `${Math.round(window.innerWidth * devicePixelRatio)}x${Math.round(window.innerHeight * devicePixelRatio)}`,
          seconds: audio ? Math.floor(audio.currentTime) : null,
          consent: document.body.innerText.includes('إحصاءات الاستخدام'),
        };
      });
      console.log(
        `${path.basename(file)}  ${info.size}  ${info.seconds === null ? '' : `${info.seconds}s`}${info.consent ? '  CONSENT VISIBLE' : ''}`,
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
