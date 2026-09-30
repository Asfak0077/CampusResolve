#!/usr/bin/env node
/**
 * Discovers and runs the backend unit tests.
 *
 * Why not just `node --test tests/`? Directory arguments and glob patterns are
 * only supported from Node 21+/22+, and CI runs Node 20 — so instead we resolve
 * the test files ourselves and hand Node explicit paths, which works on every
 * supported version (18+).
 *
 *   node backend/scripts/run-tests.mjs
 */

import { readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const testsDir = join(backendRoot, 'tests')

const collect = (dir, files = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collect(full, files)
    else if (entry.name.endsWith('.test.cjs') || entry.name.endsWith('.test.mjs')) files.push(full)
  }
  return files
}

const files = collect(testsDir)

if (!files.length) {
  console.error('❌ No test files found in backend/tests')
  process.exit(1)
}

console.log(`▶ Running ${files.length} test file(s): ${files.map((f) => relative(backendRoot, f)).join(', ')}\n`)

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: backendRoot,
  stdio: 'inherit'
})

process.exit(result.status ?? 1)
