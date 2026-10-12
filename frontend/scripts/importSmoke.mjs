/**
 * Import-time smoke test.
 *
 * Loads every frontend module through Vite's SSR pipeline with a minimal browser
 * shim, to catch module-scope code that throws before React ever renders
 * (the class of bug that produced a blank page when Supabase wasn't configured).
 */
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const noop = () => undefined
const el = () => ({
  style: {},
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  setAttribute: noop,
  removeAttribute: noop,
  getAttribute: () => null,
  appendChild: noop,
  removeChild: noop,
  addEventListener: noop,
  removeEventListener: noop,
  querySelector: () => null,
  querySelectorAll: () => [],
  getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
  focus: noop,
  blur: noop,
  click: noop,
  dataset: {},
  children: [],
  parentElement: null
})

const defineGlobal = (name, value) => {
  try {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true })
  } catch {
    /* non-configurable in this runtime — leave it */
  }
}

const store = new Map()
const localStorageShim = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
}

const documentShim = {
  documentElement: el(),
  body: el(),
  head: el(),
  createElement: () => el(),
  createTextNode: () => ({}),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  cookie: '',
  readyState: 'complete'
}

const navigatorShim = {
  userAgent: 'node-import-smoke-test',
  language: 'en-US',
  languages: ['en-US']
}

const windowShim = {
  document: documentShim,
  localStorage: localStorageShim,
  sessionStorage: localStorageShim,
  navigator: navigatorShim,
  location: {
    origin: 'http://localhost:5173',
    href: 'http://localhost:5173/',
    protocol: 'http:',
    host: 'localhost:5173',
    hash: '',
    pathname: '/',
    search: ''
  },
  matchMedia: () => ({
    matches: false,
    media: '',
    addEventListener: noop,
    removeEventListener: noop,
    addListener: noop,
    removeListener: noop
  }),
  addEventListener: noop,
  removeEventListener: noop,
  dispatchEvent: () => true,
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: noop,
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  scrollTo: noop,
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1
}

defineGlobal('localStorage', localStorageShim)
defineGlobal('sessionStorage', localStorageShim)
defineGlobal('document', documentShim)
defineGlobal('navigator', navigatorShim)
defineGlobal('window', windowShim)
defineGlobal('matchMedia', windowShim.matchMedia)
defineGlobal('requestAnimationFrame', windowShim.requestAnimationFrame)
defineGlobal('scrollTo', noop)
defineGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
defineGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
defineGlobal('MutationObserver', class { observe() {} disconnect() {} takeRecords() { return [] } })
defineGlobal('speechSynthesis', { getVoices: () => [], speak: noop, cancel: noop, addEventListener: noop })
defineGlobal('SpeechSynthesisUtterance', class {})
defineGlobal('WebSocket', class { close() {} addEventListener() {} })
defineGlobal('fetch', globalThis.fetch)
windowShim.fetch = globalThis.fetch
navigatorShim.sendBeacon = () => true

const ROOT = '/home/user/CampusResolve/frontend'

const walk = (dir) => {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

const files = walk(path.join(ROOT, 'src')).map((f) => '/' + path.relative(ROOT, f))

const server = await createServer({
  root: ROOT,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent'
})

const failures = []
let loaded = 0

for (const file of files) {
  try {
    await server.ssrLoadModule(file)
    loaded++
  } catch (error) {
    failures.push({ file, message: (error?.message || String(error)).split('\n')[0] })
  }
}

console.log(`modules loaded: ${loaded}/${files.length}`)
if (failures.length) {
  console.log('\nFAILURES:')
  for (const f of failures) console.log(`  x ${f.file}\n      ${f.message}`)
} else {
  console.log('no import-time failures')
}

await server.close()
