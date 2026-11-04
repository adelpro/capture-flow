/**
 * Library entry point.
 *
 * The CLI is the primary interface; these exports are for pipelines that want
 * to call the stages directly. This package ships TypeScript, so consumers run
 * it through tsx (or a bundler) just like the CLI does.
 */
export { build, type BuildOptions, type BuildReport } from './build';
export { loadFlow, parseFlow, runCaptureFlow, type CaptureFlow, type CaptureStep } from './capture';
export { parseManifest, type ShotManifest, type ShotSlide } from './manifest';
export { verify, type VerifyResult, type VerifiedFile } from './verify';
