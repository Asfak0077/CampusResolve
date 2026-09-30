#!/usr/bin/env node
/**
 * Parses every backend JavaScript file with Node's own parser.
 *
 * Catches syntax errors (and merge-conflict leftovers) across the whole tree —
 * including scripts and the serverless entry — without needing a test framework
 * or a database. Cross-platform: no shell utilities required.
 *
 *   node backend/scripts/syntax-check.mjs
 */

import { readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const targets = ['backend/src', 'backend/scripts', 'backend', 'api']
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'uploads', 'data', 'templates'])

const collect = (dir, files = []) => {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return files
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) collect(full, files)
    } else if (entry.name.endsWith('.js')) {
      files.push(full)
    }
  }
  return files
}

const files = [...new Set(targets.flatMap((target) => collect(join(root, target))))]
let failures = 0

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (error) {
    failures++
    console.error(`❌ ${relative(root, file)}`)
    console.error(String(error.stderr || error.message).split('\n').slice(0, 6).join('\n'))
  }
}

if (failures) {
  console.error(`\n${failures} file(s) failed to parse.\n`)
  process.exit(1)
}

console.log(`✅ ${files.length} backend files parsed successfully.`)
