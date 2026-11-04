#!/usr/bin/env node
/**
 * capture-flow CLI.
 *
 *   capture-flow capture --flow flow.json
 *   capture-flow build   --manifest shots.json [--out dir]
 *   capture-flow verify  --dir dir
 *   capture-flow run     --flow flow.json [--manifest shots.json] [--out dir]
 */
import { dirname, resolve } from 'node:path';
import { build } from './build';
import { loadFlow, runCaptureFlow } from './capture';
import { verify } from './verify';

interface Args {
  command: string;
  manifest?: string;
  flow?: string;
  out?: string;
  dir?: string;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const [command = 'help', ...rest] = argv;
  const args: Args = { command, json: false };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--manifest') args.manifest = rest[++i];
    else if (arg === '--flow') args.flow = rest[++i];
    else if (arg === '--out') args.out = rest[++i];
    else if (arg === '--dir') args.dir = rest[++i];
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice('--manifest='.length);
    else if (arg.startsWith('--flow=')) args.flow = arg.slice('--flow='.length);
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else if (arg.startsWith('--dir=')) args.dir = arg.slice('--dir='.length);
    else throw new Error(`Unknown argument "${arg}"`);
  }
  return args;
}

function help(): void {
  console.log(`capture-flow — store screenshots from raw captures

  capture-flow capture --flow flow.json
  capture-flow build   --manifest shots.json [--out dir] [--json]
  capture-flow verify  --dir store-assets [--json]
  capture-flow run     --flow flow.json [--manifest shots.json] [--out dir] [--json]

Flow and manifest paths are relative to their own file.
Capture steps are shell commands: Playwright, simctl, adb, Maestro, anything.`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    help();
    return;
  }

  const doBuild = async (manifestPath: string, outDir?: string, print = true) => {
    const report = await build({
      manifestPath,
      outDir,
      log: args.json || !print ? undefined : (line) => console.log(line),
    });
    if (!print) return report;
    if (args.json) {
      console.log(JSON.stringify({ outDir: report.outDir, files: report.files, warnings: report.warnings }, null, 2));
    } else {
      console.log(`\n${report.files.length} files in ${report.outDir}`);
      for (const warning of report.warnings) console.warn(`warning: ${warning}`);
    }
    return report;
  };

  if (args.command === 'capture') {
    if (!args.flow) throw new Error('capture needs --flow <file>');
    runCaptureFlow(args.flow, args.json ? undefined : (line) => console.log(line));
    return;
  }

  if (args.command === 'build') {
    if (!args.manifest) throw new Error('build needs --manifest <file>');
    await doBuild(args.manifest, args.out);
    return;
  }

  if (args.command === 'run') {
    if (!args.flow) throw new Error('run needs --flow <file>');
    const flow = loadFlow(resolve(args.flow));
    runCaptureFlow(args.flow, args.json ? undefined : (line) => console.log(line));
    const manifest = args.manifest ?? flow.manifest;
    if (!manifest) throw new Error('run needs a manifest: set "manifest" in the flow or pass --manifest');
    const base = dirname(resolve(args.flow));
    const report = await doBuild(
      resolve(base, manifest),
      args.out ?? (flow.out ? resolve(base, flow.out) : undefined),
      !args.json,
    );
    const result = verify(report.outDir);
    if (args.json) {
      console.log(
        JSON.stringify({ outDir: report.outDir, files: report.files, warnings: report.warnings, verify: result }, null, 2),
      );
    } else {
      for (const error of result.errors) console.error(`error: ${error}`);
      console.log(result.ok ? `verified ${result.files.length} files` : `verification failed: ${result.errors.length} errors`);
    }
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (args.command === 'verify') {
    if (!args.dir) throw new Error('verify needs --dir <directory>');
    const result = verify(args.dir);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      for (const file of result.files) {
        console.log(`${file.path}  ${file.width}x${file.height}  RGB${file.colorType === 2 ? '' : ` (colour type ${file.colorType})`}`);
      }
      for (const error of result.errors) console.error(`error: ${error}`);
      console.log(result.ok ? `\nOK — ${result.files.length} files` : `\nFAILED — ${result.errors.length} errors`);
    }
    if (!result.ok) process.exitCode = 1;
    return;
  }

  help();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`capture-flow: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
