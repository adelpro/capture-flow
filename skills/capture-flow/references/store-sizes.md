# Store sizes

Pixel sizes exported by `capture-flow build`. `default` means the size is produced
when `sizes` is omitted and the family has a capture. `required` marks the size the
store currently requires.

## App Store — iPhone

| id | pixels | devices | default | required |
| --- | --- | --- | --- | --- |
| `ios-6.9` | 1320 × 2868 | iPhone 17 Pro Max, 16 Pro Max | yes | yes |
| `ios-6.9-b` | 1290 × 2796 | iPhone 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max | no | no |
| `ios-6.5` | 1284 × 2778 | iPhone 14 Plus, 13 Pro Max, 12 Pro Max | no | no |
| `ios-6.5-b` | 1242 × 2688 | iPhone 11 Pro Max, XS Max | no | no |
| `ios-6.3` | 1206 × 2622 | iPhone 17 Pro, 17, 16 Pro | yes | yes |
| `ios-6.1` | 1170 × 2532 | iPhone 17e, 16e, 14, 13, 13 Pro, 12, 12 Pro | no | no |

## App Store — iPad

| id | pixels | devices | default | required |
| --- | --- | --- | --- | --- |
| `ipad-13` | 2064 × 2752 | iPad Pro 13″ (M4, M5), iPad Air 13″ | yes | yes |
| `ipad-12.9` | 2048 × 2732 | iPad Pro 12.9″ (2nd–6th gen) | no | no |
| `ipad-11` | 1668 × 2420 | iPad Pro 11″ (M4), iPad Air 11″ | no | no |

## Google Play — phone

| id | pixels | devices | default | required |
| --- | --- | --- | --- | --- |
| `play-phone` | 1080 × 1920 | all Android phones (9:16) | yes | yes |
| `play-phone-hd` | 1440 × 2560 | all Android phones (9:16, high resolution) | no | no |

## Google Play — tablet

| id | pixels | devices | default | required |
| --- | --- | --- | --- | --- |
| `play-tablet-7` | 1080 × 1920 | 7-inch Android tablets | yes | no |
| `play-tablet-10` | 1440 × 2560 | 10-inch Android tablets | yes | no |

## App Store — Mac

| id | pixels | default | required |
| --- | --- | --- | --- |
| `mac-2880` | 2880 × 1800 | yes | yes |
| `mac-2560` | 2560 × 1600 | no | no |
| `mac-1440` | 1440 × 900 | no | no |
| `mac-1280` | 1280 × 800 | no | no |

## Apple Watch

| id | pixels | default | required |
| --- | --- | --- | --- |
| `watch-ultra-3` | 422 × 514 | yes | yes |
| `watch-11` | 416 × 496 | no | no |
| `watch-ultra-2` | 410 × 502 | no | no |
| `watch-9` | 396 × 484 | no | no |
| `watch-6` | 368 × 448 | no | no |
| `watch-3` | 312 × 390 | no | no |

## Apple TV and Vision Pro

| id | pixels | default | required |
| --- | --- | --- | --- |
| `tv-4k` | 3840 × 2160 | yes | yes |
| `tv-hd` | 1920 × 1080 | no | no |
| `vision-pro` | 3840 × 2160 | yes | yes |

## Google Play feature graphic

| id | pixels | default | required |
| --- | --- | --- | --- |
| `play-feature` | 1024 × 500 | yes | yes |

## Landscape

Append `-land` and swap width and height. Supported for `iphone*`, `ipad*`, and
`play-phone*` sizes (for example `ios-6.9-land` = 2868 × 1320). Use the matching
`*-landscape` family with the capture taken in landscape.

## Capture aspect ratios

The device screen area uses these ratios. Match them to avoid cropping:

| Family | Screen aspect (w:h) | Notes |
| --- | --- | --- |
| `iphone` | 1320:2868 | 19.5:9, capture at 1320 × 2868 |
| `ipad` | 3:4 | 2064 × 2752 |
| `android-phone` | 20:9 | 1080 × 2400 or 1080 × 1920; 9:16 export crops top/bottom |
| `android-tablet` | 16:10 | 1600 × 2560 |
| `mac` | 16:10 | 2880 × 1800 |
| `watch` | 422:514 | — |
