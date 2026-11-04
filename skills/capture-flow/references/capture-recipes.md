# Capture recipes

`capture-flow` never takes screenshots itself. Each flow step is a shell command, so
use whatever produces correct native-resolution images.

Before building, check every raw capture:

```bash
magick identify -format '%f %wx%h %[channels]\n' captures/*.png
# macOS without ImageMagick:
sips -g pixelWidth -g pixelHeight captures/iphone-01.png
```

The output must be opaque (no alpha). Flatten if needed:

```bash
magick in.png -background '#000000' -alpha remove -alpha off out.png
```

## Web app with Playwright

Install Playwright outside the project if you do not want it in dependencies:

```bash
npm install --prefix /tmp/pw playwright
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw npx --prefix /tmp/pw playwright install chromium
```

`capture.mjs`:

```js
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,          // 440×956 → 1320×2868
  isMobile: true,
  hasTouch: true,
  locale: 'ar-SA',
  timezoneId: 'Asia/Riyadh',
  colorScheme: 'dark',
  serviceWorkers: 'block',       // stale caches hide new UI
});
const page = await context.newPage();

// Seed settings before the app boots (consent, theme, onboarding).
await context.addInitScript(() => {
  localStorage.setItem('app:telemetry', 'off');
  localStorage.setItem('app:onboarded', 'true');
});

await page.goto('https://example.com', { waitUntil: 'commit', timeout: 120_000 });
await page.getByRole('button', { name: 'تشغيل' }).waitFor({ timeout: 120_000 });
await page.waitForTimeout(700);  // let fonts, audio state, and animation settle

await page.screenshot({ path: 'captures/iphone-01.png' });
await browser.close();
```

Rules of thumb:

- `waitUntil: 'commit'` plus an explicit UI wait beats `networkidle` on hydrated apps.
- Hydration on a cold CDN can take 20 s. Give `waitFor` a real timeout.
- Take one browser context per family, or resize the viewport and repeat.
- Keep `omitBackground` off; transparency fails `verify`.
- If a consent dialog appears, dismiss it once with a real click **and** seed the
  setting, so retries stay clean.
- For audio/video states, start playback and wait for the visible time counter to move.

### When the app depends on a service worker or peer transport

If playback in the browser uses a transport the headless run cannot provide (WebTorrent,
WebRTC), point the request at a local/web seed instead of screenshotting an empty player:

```js
await context.route('**/webtorrent/**', async (route) => {
  const url = new URL(route.request().url());
  await route.continue({ url: url.toString().replace('/webtorrent/', '/media/') });
});
```

Document the fallback in the capture script so the next person knows why it exists.

## iOS Simulator

```bash
xcrun simctl boot "iPhone 17 Pro Max" 2>/dev/null || true
xcrun simctl bootstatus booted -b

# Deterministic status bar.
xcrun simctl status_bar booted override \
  --time "9:41" --batteryState charged --batteryLevel 100 \
  --wifiBars 3 --cellularBars 4

# Drive the app: deep link, Maestro, or XCTest.
xcrun simctl openurl booted "myapp://player"

xcrun simctl io booted screenshot captures/iphone-01.png
xcrun simctl status_bar booted clear
```

`simctl io screenshot` captures at the simulated device's native pixel size. Pick a
device whose native resolution matches the size you export (iPhone 17 Pro Max →
1320 × 2868). For iPad, boot an iPad Pro 13″ simulator.

## Android emulator or device

```bash
adb shell screencap -p /sdcard/shot.png
adb pull /sdcard/shot.png captures/android-01.png
# or, without a temp file:
adb exec-out screencap -p > captures/android-01.png
```

Deterministic status bar:

```bash
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
```

Use an emulator profile with the right resolution (1080 × 2400 for a modern phone,
1600 × 2560 for a 10-inch tablet in landscape) and set the locale:

```bash
adb shell "setprop persist.sys.locale ar-SA; setprop persist.sys.language ar; setprop persist.sys.country SA"
adb shell am force-stop com.example.app
```

## Maestro

```yaml
appId: com.example.app
---
- launchApp:
    clearState: false
- tapOn: "Get started"
- takeScreenshot: captures/android-01
```

`takeScreenshot` writes `<name>.png` in the working directory of the Maestro run.

## Native app deep links

Prefer a deep link or launch argument over scripted tapping: it is stable across UI
changes and skips onboarding.

```bash
xcrun simctl openurl booted "myapp://track/123?autoplay=1"
adb shell am start -a android.intent.action.VIEW -d "myapp://track/123?autoplay=1" com.example.app
```
