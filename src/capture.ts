/**
 * Capture flow: the tool never pretends to know your simulator.
 * A flow lists shell commands (Playwright, simctl, adb, Maestro, fastlane,
 * anything) that write raw captures; `run` executes them, then builds and
 * verifies. Commands inherit the caller's environment.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface CaptureStep {
  name?: string;
  command: string;
  /** Relative to the flow file. */
  cwd?: string;
  env?: Record<string, string>;
}

export interface CaptureFlow {
  /** Manifest to build after capturing (relative to the flow file). */
  manifest?: string;
  out?: string;
  captures: CaptureStep[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseFlow(raw: unknown): CaptureFlow {
  if (!isRecord(raw)) throw new Error('Invalid flow: expected an object');
  if (!Array.isArray(raw.captures) || raw.captures.length === 0) {
    throw new Error('Invalid flow: "captures" must be a non-empty array of steps');
  }
  const captures = raw.captures.map((step, i): CaptureStep => {
    if (!isRecord(step)) throw new Error(`Invalid flow: captures[${i}] must be an object`);
    if (typeof step.command !== 'string' || step.command.trim() === '') {
      throw new Error(`Invalid flow: captures[${i}].command must be a non-empty string`);
    }
    if (step.cwd !== undefined && typeof step.cwd !== 'string') throw new Error(`Invalid flow: captures[${i}].cwd must be a string`);
    let env: Record<string, string> | undefined;
    if (step.env !== undefined) {
      if (!isRecord(step.env)) throw new Error(`Invalid flow: captures[${i}].env must be an object`);
      env = Object.fromEntries(Object.entries(step.env).map(([k, v]) => [k, String(v)]));
    }
    return { name: typeof step.name === 'string' ? step.name : undefined, command: step.command, cwd: step.cwd, env };
  });
  return {
    manifest: typeof raw.manifest === 'string' ? raw.manifest : undefined,
    out: typeof raw.out === 'string' ? raw.out : undefined,
    captures,
  };
}

export function loadFlow(path: string): CaptureFlow {
  return parseFlow(JSON.parse(readFileSync(path, 'utf8')));
}

/** Runs each step in order and stops at the first failure. */
export function runCaptureFlow(flowPath: string, log: (line: string) => void = () => {}): void {
  const absolute = resolve(flowPath);
  const base = dirname(absolute);
  const flow = loadFlow(absolute);

  for (const [index, step] of flow.captures.entries()) {
    const label = step.name ?? `capture ${index + 1}`;
    const cwd = step.cwd ? resolve(base, step.cwd) : base;
    log(`▶ ${label}: ${step.command}`);
    const result = spawnSync(step.command, {
      cwd,
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, ...step.env },
    });
    if (result.error) throw new Error(`${label} failed to start: ${result.error.message}`);
    if (result.status !== 0) throw new Error(`${label} exited with code ${result.status ?? 'unknown'}`);
  }
}
