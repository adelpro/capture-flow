#!/usr/bin/env node
/**
 * npm entry point.
 *
 * The tool ships as TypeScript (its vendored engine is TypeScript too), so the
 * launcher registers tsx and then loads the CLI. Keeping one source of truth
 * beats a separate build output that can drift from the examples.
 */
import { register } from 'tsx/esm/api';

register();
await import(new URL('../src/cli.ts', import.meta.url).href);
