#!/usr/bin/env node
/**
 * Scans the tracked files for committed credentials.
 *
 * Runs in CI on every pull request. It exists because this repository has
 * already leaked a MongoDB password and an API key once, and because docs about
 * those leaks are an easy place to accidentally paste the secret again.
 *
 *   node backend/scripts/secret-scan.mjs
 *
 * Exit code 1 = at least one finding. `.env.example` files are skipped (they
 * contain placeholders by design), and obvious documentation placeholders such
 * as `your-api-key-here` are ignored.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const PATTERNS = [
  { name: 'NVIDIA NIM API key', re: /nvapi-[A-Za-z0-9_-]{20,}/g },
  { name: 'OpenAI-style secret key', re: /\bsk-[A-Za-z0-9]{32,}/g },
  { name: 'Google API key', re: /AIza[A-Za-z0-9_-]{30,}/g },
  { name: 'MongoDB connection string with credentials', re: /mongodb(\+srv)?:\/\/[^\s"'`<>]*:[^\s"'`<>@]*@/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'JWT (looks like a live session token)', re: /\beyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: 'Private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/g }
]

// Placeholders and examples are expected in docs and .env.example files.
const ALLOWED_PATTERNS = [
  /your[-_]/i,
  /<[^>]+>/,          // <user>, <password>, <cluster>
  /example\.com/,
  /placeholder/i,
  /xxx+/i,
  /REDACTED/,
  /\.\.\./            // truncated values in docs, e.g. nvapi-yhk…
]

const isAllowed = (line) => ALLOWED_PATTERNS.some((re) => re.test(line))

const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.endsWith('.env.example'))
  .filter((file) => !/\.(png|jpg|jpeg|gif|webp|ico|pdf|crx|woff2?|ttf)$/i.test(file))

const findings = []

for (const file of files) {
  let contents
  try {
    contents = readFileSync(join(root, file), 'utf8')
  } catch {
    continue // binary or unreadable
  }
  if (!contents || contents.includes('\u0000')) continue

  contents.split('\n').forEach((line, index) => {
    if (isAllowed(line)) return
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0
      if (re.test(line)) findings.push({ file, line: index + 1, name })
    }
  })
}

if (findings.length) {
  console.error('\n❌ Potential secrets found in tracked files:\n')
  for (const { file, line, name } of findings) {
    console.error(`   ${file}:${line}  →  ${name}`)
  }
  console.error(
    '\n   Move the value into an environment variable (.env is git-ignored) and rotate it:' +
    '\n   a value that reached a public repository must be considered compromised.\n'
  )
  process.exit(1)
}

console.log(`✅ No secrets detected in ${files.length} tracked files.`)
