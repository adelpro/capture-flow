---
name: capture-flow
description: Turn raw device or browser captures into App Store and Google Play screenshot sets. Use when asked to generate, polish, resize, frame, or validate store screenshots, to add headlines and device frames to app screens, or to set up a repeatable screenshot pipeline with Playwright, simctl, adb, or Maestro.
metadata:
  author: adelpro
  version: "0.1.1"
---

# capture-flow

`capture-flow` is a CLI that takes plain screenshots plus a small JSON manifest and
renders exact-size store assets with device frames and composed copy.

It has three stages:

1. **capture** — run your own screenshot commands (Playwright, `simctl`, `adb`, Maestro, anything).
2. **build** — map each raw capture to a slide and render every store size.
3. **verify** — check that every PNG is the exact size, 8-bit RGB, and has no alpha.

Do not invent your own resizing pipeline. Capture at native resolution, let `build` do the rest.

## Setup

```bash
npm install --save-dev capture-flow
npx capture-flow --help
```

Node.js **22.18+** is required. Playwright, Xcode, or Android tools are only needed for
the capture stage; `build` and `verify` run on Node alone.

If the project already has `capture-flow` in `package.json`, use `npx capture-flow`
or the local `node_modules/.bin/capture-flow`.

## Workflow

1. **Decide the target set** — device families, store sizes, languages, and slide count.
2. **Write a capture command** that saves full-resolution PNGs into a folder.
3. **Write `flow.json`** to run that command (or run it manually first).
4. **Write `shots.json`** mapping captures to slides.
5. **Run** everything and read the warnings.
6. **Fix** overflow / missing-screen warnings, rebuild.
7. **Verify** and inspect the first image of each output folder.

```bash
npx capture-flow run --flow flow.json
npx capture-flow verify --dir store-assets
```

Use `--json` on `build`, `run`, or `verify` when another program consumes the result.

## Capture rules

These prevent the most common bad output.

- Capture at the device's **native pixel size**, never upscale. The renderer can scale
  down but cannot invent detail.
- Match the frame's screen aspect ratio. A mismatched capture is cropped or distorted.
- No transparency. `verify` rejects alpha; use an opaque background when capturing.
- One file per screen per family. Name them predictably (`iphone-01.png`, `android-01.png`, …).
- Hide dev tooling, cursors, toasts, cookie banners, and consent dialogs before the shot.
- Wait for real content (fonts, data, animation end) before `screenshot()`. A skeleton
  or empty state is not a store screenshot.
- Keep text in screenshots readable at thumbnail size; avoid dense tables.

Reference dimensions (portrait):

| Family | Capture at | Typical CSS viewport |
| --- | --- | --- |
| `iphone` | 1320 × 2868 | 440 × 956 @3 |
| `ipad` | 2064 × 2752 | 768 × 1024 @2.6875 |
| `android-phone` | 1080 × 1920 or higher (9:16) | 360 × 640 @3 |
| `android-tablet` | 1600 × 2560 (16:10) | 800 × 1280 @2 |
| `mac` | 2880 × 1800 | — |

Native capture recipes for Playwright, iOS Simulator, and Android are in
[references/capture-recipes.md](references/capture-recipes.md).

## flow.json

A flow is an ordered list of shell commands. Paths are relative to the flow file.

```json
{
  "manifest": "./shots.json",
  "out": "./store-assets",
  "captures": [
    { "name": "web (Playwright)", "command": "node capture.mjs" },
    { "name": "iOS", "command": "xcrun simctl io booted screenshot captures/ios-01.png" }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `captures[].command` | yes | Shell command, run with the system shell. |
| `captures[].name` | no | Label in the log. |
| `captures[].cwd` | no | Working directory, relative to the flow file. |
| `captures[].env` | no | Extra environment variables for the step. |
| `manifest` | no | Manifest used by `run`. |
| `out` | no | Output directory used by `run`. |

Steps stop at the first non-zero exit code. Use `capture-flow capture --flow flow.json`
to run only the capture stage.

## shots.json

```json
{
  "app": "My App",
  "template": "noor",
  "languages": ["ar-SA"],
  "sizes": ["ios-6.9", "ios-6.3", "ipad-13", "play-phone", "play-tablet-10"],
  "slides": [
    {
      "templateSlide": 0,
      "headline": "استمع *بخشوع*",
      "subtitle": "تلاوات كاملة ومؤشر طيفي.",
      "captures": {
        "iphone": "captures/iphone-01.png",
        "android-phone": "captures/android-01.png",
        "ipad": "captures/ipad-01.png",
        "android-tablet": "captures/android-tablet-01.png"
      }
    }
  ]
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `app` | yes | Project name; also used in the report and fastlane paths. |
| `template` | yes | Built-in template id. |
| `languages` | yes | Store locales, e.g. `["en-US", "ar-SA"]`. `ar-SA` exports as `ar` on Google Play. |
| `slides` | yes | Ordered slides; each maps device family → capture. |
| `out` | no | Output directory, relative to the manifest. Default `store-assets`. |
| `structure` | no | `stores` (default), `flat`, or `fastlane`. |
| `sizes` | no | Subset of size ids; defaults to the default size of every family used. |
| `slides[].headline` | yes | `*word*` marks the accent run; `\n` is a hard break. |
| `slides[].subtitle` | no | Secondary copy. |
| `slides[].templateSlide` | no | Which template layout to use; defaults to the slide index. |
| `slides[].captures` | yes | Device family → image path (`png`, `jpg`, `jpeg`, `webp`). |

Families: `iphone`, `iphone-landscape`, `ipad`, `ipad-landscape`, `android-phone`,
`android-landscape`, `android-tablet`, `mac`, `watch`, `apple-tv`, `vision`, `play-feature`.

Store limits: App Store accepts up to 10 slides per size, Google Play up to 8.
Respect them before designing a long story.

Store sizes: `ios-6.9`, `ios-6.9-b`, `ios-6.5`, `ios-6.5-b`, `ios-6.3`, `ios-6.1`,
`ipad-13`, `ipad-12.9`, `ipad-11`, `play-phone`, `play-phone-hd`, `play-tablet-7`,
`play-tablet-10`, plus `-land` variants. Full pixel dimensions are in
[references/store-sizes.md](references/store-sizes.md).

Every slide must supply every family you want in the output. A slide without a family
produces a placeholder warning and an image with an empty frame — treat that as a bug.

## Choosing a template

| Category | Templates |
| --- | --- |
| `elegant` | `desert-dune`, `noir-gold`, `paper-and-ink` |
| `dark` | `midnight-neon`, `noor`, `obsidian` |
| `minimal` | `launchpad`, `mono-swiss`, `sage` |
| `gradient` | `aurora`, `glass-prism`, `sunset-boulevard` |
| `playful` | `bubblegum`, `clay-garden` |
| `bold` | `citrus-pop`, `loud-and-clear`, `split-tone` |
| `panorama` | `panorama-peaks`, `panorama-ribbon`, `panorama-waves` |

- Arabic-first copy: `noor` (Cairo + Noto Sans Arabic, emerald and gold).
- Native tablet composition: `mono-swiss`, `noir-gold`, `obsidian`, `panorama-*`.
- Phone-first templates adapt to iPad/Android tablet by swapping the frame and
  reflowing the tall layout. This is acceptable but less deliberate.

A template owns the palette and typefaces. There are deliberately no per-manifest colour
or font overrides — mixing arbitrary colours into a designed system usually breaks it.
To customize, copy a template from `node_modules/capture-flow/vendor/wajha/templates/builtin/`,
edit its `theme`/`typeset`, and register it in your own build. Ask the user before
forking a template.

`templateSlide` selects a composition (hero, tilted, pair, hanging, …). Layouts differ
per template. To see the available layouts and their default copy, read the template
file:

```bash
sed -n '/slides: \[/,/^  ]/p' node_modules/capture-flow/vendor/wajha/templates/builtin/noor.ts
```

Out-of-range values fail with `"<template>" has <n>` — that number is the layout count.

## Output

The default `stores` structure is store-upload ready:

```text
store-assets/
  App Store/
    ar-SA/
      iPhone 6.9/01.png … 10.png
      iPhone 6.3/01.png …
      iPad 13/01.png …
  Google Play/
    ar/
      Phone/01.png …
      Tablet 10/01.png …
  capture-flow-report.json
```

`capture-flow-report.json` lists every file with its `width`, `height`, `family`,
`lang`, and `slide`, plus `warnings`. Read it instead of guessing what was produced.

`flat` writes `01-iphone-en-US.png`-style names; `fastlane` writes
`fastlane/screenshots/<locale>/`.

## Warnings and failures

| Symptom | Fix |
| --- | --- |
| `text overflows at WxH` | Shorten copy, remove a line break, use a different `templateSlide`, or pick a template with more copy room. |
| `uses a placeholder screen` | That slide has no capture for the family. Add one or drop the family/size. |
| `has no screenshot` | Slide → family mapping is incomplete for an exported size. |
| `Unknown device family` | Use a family from the list above. |
| `Unknown export size` | Use a size id from the table; `-land` is a suffix, not a family. |
| `capture not found` | Manifest paths are relative to the manifest file, not the terminal's cwd. |
| `verify` alpha error | Flatten the capture onto an opaque background; PNG must be 8-bit RGB. |
| Wrong dimensions in `verify` | Do not post-process built files; re-run `build` for that size. |

## Library use

```ts
import { build, verify, runCaptureFlow } from 'capture-flow';

await runCaptureFlow('flow.json');
const report = await build({ manifestPath: 'shots.json', outDir: 'store-assets' });
const result = verify('store-assets');
```

The package ships TypeScript, so run it through `tsx` or a bundler.

## Example

A complete, real setup (Playwright capture of a web app, Arabic RTL, five device
sizes, 20 output files) lives in the repository:

<https://github.com/adelpro/capture-flow/tree/main/examples/open-tilawa>

It shows consent-dialog dismissal, waiting for hydration, live audio state, and the
`عرض الكل` reciter flow. Adapt it rather than starting from a blank page.
