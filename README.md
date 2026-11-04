# capture-flow

**Capture once, ship store-ready screenshots.** `capture-flow` runs your own capture commands (Playwright, `simctl`, `adb`, Maestro, fastlane — anything that writes an image), then frames those captures in a polished template and exports exact App Store and Google Play sizes.

It is a small CLI and library, not a screenshot service. The capture half is bring-your-own so it can live in any pipeline; the build half is deterministic and store-aware.

```text
your app ──► capture commands ──► raw PNG/JPEG/WebP ──► capture-flow build ──► App Store + Google Play
             (flow.json)                                  (shots.json)           exact sizes, RGB PNG
```

## Install

```bash
npm install --save-dev capture-flow
npx capture-flow --help
```

Requires Node **22.18+**. The renderer uses `@napi-rs/canvas` (prebuilt binaries, no system Chrome), and the template fonts ship as dependencies.

To run the included Tilawah example you also need Playwright in your project:

```bash
npm install --save-dev playwright
npx playwright install chromium
```

## Install as an agent skill

The repository ships a `capture-flow` skill so coding agents know the manifest
contract, capture rules, and failure fixes without reading this README first.

```bash
npx skills add adelpro/capture-flow
```

Add `-g` for a global install, or `-a claude-code -a codex -a opencode` to target
specific agents. The skill also ships inside the npm package, so a local install works:

```bash
npx skills add ./node_modules/capture-flow
```

Skill source: [`skills/capture-flow/SKILL.md`](skills/capture-flow/SKILL.md).

## Quick start

A **flow** describes how to capture. A **manifest** describes how to frame it.

`flow.json`

```json
{
  "manifest": "./shots.json",
  "out": "./store-assets",
  "captures": [
    { "name": "iPhone", "command": "node capture-iphone.mjs" },
    { "name": "Android", "command": "node capture-android.mjs" }
  ]
}
```

`shots.json`

```json
{
  "app": "My App",
  "template": "noor",
  "structure": "stores",
  "languages": ["en-US", "ar-SA"],
  "sizes": ["ios-6.9", "ios-6.3", "play-phone"],
  "slides": [
    {
      "templateSlide": 0,
      "headline": "Listen with *focus*",
      "subtitle": "A calm player for long recordings.",
      "captures": {
        "iphone": "captures/iphone-01.png",
        "android-phone": "captures/android-01.png"
      }
    }
  ]
}
```

Run the whole flow:

```bash
npx capture-flow run --flow flow.json
```

Or run the stages separately:

```bash
npx capture-flow capture --flow flow.json
npx capture-flow build   --manifest shots.json
npx capture-flow verify  --dir store-assets
```

## Commands

| Command | What it does |
| --- | --- |
| `capture-flow capture --flow <file>` | Runs each flow step in order, stopping on the first failure. |
| `capture-flow build --manifest <file> [--out <dir>] [--json]` | Renders the manifest to store PNGs and writes `capture-flow-report.json`. |
| `capture-flow verify --dir <dir> [--json]` | Checks every PNG is 8-bit RGB (no alpha) at the exact size in the report, and that no planned file is missing. |
| `capture-flow run --flow <file> [--manifest <file>] [--out <dir>] [--json]` | `capture` → `build` → `verify` in one command. |

Paths inside a flow are relative to the flow file; paths inside a manifest are relative to the manifest file. Capture commands run with the caller's environment plus any `env` entries.

## Flow schema

| Field | Required | Meaning |
| --- | --- | --- |
| `captures` | yes | Ordered array of steps. |
| `captures[].command` | yes | Shell command (run with the system shell). |
| `captures[].name` | no | Label shown in the log. |
| `captures[].cwd` | no | Working directory, relative to the flow file. |
| `captures[].env` | no | Extra environment variables for this step. |
| `manifest` | no | Manifest to build after capture; used by `run`. |
| `out` | no | Output directory for `run`. Overrides the manifest's `out`. |

Because steps are plain commands, a native flow is just as natural as a web one:

```json
{
  "manifest": "./shots.json",
  "captures": [
    { "name": "iOS", "command": "xcrun simctl io booted screenshot captures/ios-01.png" },
    { "name": "Android", "command": "adb exec-out screencap -p > captures/android-01.png" }
  ]
}
```

## Manifest schema

| Field | Required | Meaning |
| --- | --- | --- |
| `app` | yes | Project name (also used by the renderer). |
| `template` | yes | Template id from the list below. |
| `languages` | yes | Store locale codes, e.g. `["en-US", "ar-SA"]`. `ar-SA` exports as `ar` for Google Play. |
| `slides` | yes | Ordered slides; each maps a device family to a capture. |
| `out` | no | Output directory, relative to the manifest. Default `store-assets`. |
| `structure` | no | `stores` (default), `flat`, or `fastlane`. |
| `sizes` | no | Subset of size ids. Defaults to every default size of the families used. |
| `slides[].headline` | yes | `*word*` highlights a run; a newline is a hard break. |
| `slides[].subtitle` | no | Secondary copy. |
| `slides[].templateSlide` | no | Which template slide layout to use (defaults to the slide's index). |
| `slides[].captures` | yes | Device family → image path. |

Device families: `iphone`, `iphone-landscape`, `ipad`, `ipad-landscape`, `android-phone`, `android-landscape`, `android-tablet`, `mac`, `watch`, `apple-tv`, `vision`, `play-feature`.

Store sizes: `ios-6.9`, `ios-6.9-b`, `ios-6.5`, `ios-6.5-b`, `ios-6.3`, `ios-6.1`, `ipad-13`, `ipad-12.9`, `ipad-11`, `play-phone`, `play-phone-hd`, `play-tablet-7`, `play-tablet-10`, plus the corresponding `-land` ids. Run `build` with an unknown id to get the full list in the error.

The default `stores` layout is what the stores expect:

```text
store-assets/
  App Store/
    ar-SA/
      iPhone 6.9/01.png … 04.png
      iPhone 6.3/01.png … 04.png
      iPad 13/01.png … 04.png
  Google Play/
    ar/
      Phone/01.png … 04.png
      Tablet 10/01.png … 04.png
  capture-flow-report.json
```

## Controlling the result

| You want to change | Where it lives |
| --- | --- |
| Which app screen is shown | Your capture command (Playwright route, simulator state, deep link). Map it to a slide with `slides[].captures`. |
| The slide layout / composition | `slides[].templateSlide` — picks one of the template's layouts (hero, tilted, hanging, …). |
| The copy | `slides[].headline` and `slides[].subtitle`. `*word*` renders as the highlighted accent run; a newline is a hard break. |
| Colours and fonts | The `template` you pick. Each built-in template ships a fixed palette, background, and heading/body typeface. |
| App light/dark screenshot | The capture script's stored setting (`settings.theme` in the example's `localStorage` blob). |
| Which store sizes | `sizes` (or omit it to get every default size of the families you captured). |

Manifest-level colour/font overrides are deliberately not exposed: a template is a designed system, and mixing in arbitrary colours usually breaks it. To go beyond the built-ins, copy a template under `vendor/wajha/templates/builtin/`, change its `theme`/`typeset`, and use its `id` in the manifest.

### Large screens

Capture tables are just another family:

```json
{
  "templateSlide": 0,
  "headline": "…",
  "captures": {
    "ipad": "captures/ipad-01.png",
    "android-tablet": "captures/android-tablet-01.png"
  }
}
```

and export them with `ipad-13` / `play-tablet-10`. Match the frame's screen aspect so nothing is distorted:

- **iPad 13″** — 3:4, e.g. capture at 2064×2752 (CSS 768×1024 @2.6875).
- **Android tablet** — 16:10 inside a 9:16 export, e.g. capture at 1600×2560 (CSS 800×1280 @2), exported at 1440×2560.

Templates with native tablet layouts (`mono-swiss`, `noir-gold`, `obsidian`, `panorama-*`, …) compose the tablet canvas directly. Phone-first templates such as `noor` adapt their tall layout and swap the frame to iPad/Android tablet automatically.

## Templates

| Category | Templates |
| --- | --- |
| `elegant` | `desert-dune`, `noir-gold`, `paper-and-ink` |
| `dark` | `midnight-neon`, `noor`, `obsidian` |
| `minimal` | `launchpad`, `mono-swiss`, `sada`, `sage` |
| `gradient` | `aurora`, `glass-prism`, `sunset-boulevard` |
| `playful` | `bubblegum`, `clay-garden` |
| `bold` | `citrus-pop`, `loud-and-clear`, `split-tone` |
| `panorama` | `panorama-peaks`, `panorama-ribbon`, `panorama-waves` |

`noor` (deep emerald, gold geometry, Cairo/Noto Sans Arabic) is the template used by the Tilawah App Store set. `sada` (صدى, "echo") is a minimal Arabic-first frame in Tilawah's own palette — white paper, near-black ink and the app's two spectrum blues — used by the Google Play minimal set.

## Example: open-tilawa

[`examples/open-tilawa`](examples/open-tilawa) captures the deployed [Tilawah](https://tilawah.cc) web app with Playwright and builds Arabic App Store and Google Play sets:

```bash
# Playwright lives outside the project in this workspace; point the example at it:
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright \
  npx capture-flow run --flow examples/open-tilawa/flow.json

# Rebuild the minimal Sada set from the checked-in captures:
npx tsx src/cli.ts build --manifest examples/open-tilawa/shots-minimal.json
npx tsx src/cli.ts build --manifest examples/open-tilawa/shots-desktop.json
npx tsx src/cli.ts verify --dir screenshots
```

The full Sada set is checked in at `screenshots` (24 files, grouped by store):

```
screenshots/
  App Store/ar-SA/
    iPhone 6.9/  iPhone 6.3/  iPad 13/
  Google Play/ar/
    Phone/  Tablet 10/
  Large screens/
    mac-2880/ar-SA/
```

The example has three manifests: `shots.json` builds the original Noor set in `store-assets`, `shots-minimal.json` builds the Sada App Store and Google Play sets, and `shots-desktop.json` builds the large-screen MacBook set under `screenshots/Large screens`. Four details in the example are worth copying:

- **Hydration:** the deployed app needs ~20 s to boot. The script waits for the real UI (`getByRole('button', { name: 'تشغيل' })`) rather than for `load`, and navigates with `waitUntil: 'commit'`.
- **Audio:** headless Chromium cannot use Tilawah's service-worker WebTorrent stream, so the script points `/webtorrent/…` at Tilawah's own documented `/media/` web seed. The player then shows real playback time and an active spectrum instead of a paused 0:00.
- **Spectrum:** `sada` draws the app's actual 28-bar player spectrum, captured from `AnalyserNode` during that playback; the template file records the snapshot so the strip can be replaced with another app's data.
- **Large screens:** the same four screens are captured at tablet and desktop viewports (`ipad`, `android-tablet`, `mac` at 1440×900 @2) and mapped to `ipad-13`, `play-tablet-10` and `mac-2880`. The desktop layout gets a two-column copy/laptop composition; the phone-first layouts adapt to tablet automatically.

## Library

The package ships TypeScript (the CLI runs it through `tsx`), so import it from a `tsx` script or a bundler:

```ts
import { build } from 'capture-flow';

const report = await build({ manifestPath: 'shots.json', outDir: 'store-assets' });
console.log(report.files, report.warnings);
```

Subpaths are available for the pieces: `capture-flow/build`, `capture-flow/capture`, `capture-flow/manifest`, `capture-flow/verify`. `build` returns the files it wrote and any layout warnings (overflowing text, missing screenshots).

## Original idea and credits

This project exists because of **[Wajha](https://github.com/M-Alkassem/Wajha)** by [M-Alkassem](https://github.com/M-Alkassem) and contributors — the original store-screenshot designer with the Canvas engine, templates, device frames and export rules.

capture-flow is a new orchestration layer around that idea: it adds the capture flow, the manifest/CLI contract, verify, and headless Node rendering. The rendering core is **vendored** from Wajha under `vendor/wajha/` (model, engine, export naming, templates, slide sorting) and is used under the MIT License. The full notice is in [`vendor/wajha/LICENSE`](vendor/wajha/LICENSE) and [`vendor/wajha/NOTICE`](vendor/wajha/NOTICE).

Wajha is MIT-licensed, copyright © 2026 Wajha contributors. capture-flow is MIT-licensed too; see [`LICENSE`](LICENSE).

If you only need to design screenshots interactively, use Wajha. If you need screenshots produced repeatedly by a pipeline, use capture-flow — and consider upstreaming improvements to the engine.
