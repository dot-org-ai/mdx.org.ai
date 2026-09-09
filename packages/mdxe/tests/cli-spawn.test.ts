/**
 * The front door THROUGH the real spawned bin (`dist/cli.js`, built once here via tsup).
 *
 * Pins the mdx-8je.16 acceptance: a bare invocation under an agent harness (CLAUDECODE=1) renders
 * the orientation as static text on stdout, exits 0, and never reads stdin — the child's stdin is a
 * pipe we deliberately keep OPEN, so a CLI that waited on it would hang until the timeout. Also
 * pins: help never loads a runtime (fast), stdout is a pure payload (errors go to stderr only), and
 * the exit codes are the stable USAGE=2 for a bad --format / unknown flag / unknown command.
 */

import { describe, expect, test, beforeAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const PKG = dirname(dirname(fileURLToPath(import.meta.url)))
/** Built here by esbuild the way tsup builds `dist/cli.js` (ESM, node, deps external, CODE-SPLIT so
 *  every `await import('./commands/…')` stays a lazy chunk) — without tsup's library DTS step, which
 *  is red on pre-existing type drift unrelated to the CLI. */
const OUT = join(PKG, 'dist', 'e2e')
const BIN = join(OUT, 'cli.js')

interface Run {
  code: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

/** Spawn the bin with stdin as an OPEN pipe (never closed, never written) and a hard timeout. */
function run(args: string[], env: Record<string, string | undefined>, timeoutMs = 15_000): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      cwd: PKG,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    child.stdout.on('data', (d) => (stdout += String(d)))
    child.stderr.on('data', (d) => (stderr += String(d)))
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, timedOut })
    })
  })
}

/** A clean env: no agent markers, no CI, no NO_COLOR — so each test sets exactly what it asserts. */
const CLEAN: Record<string, string | undefined> = {
  CLAUDECODE: undefined,
  CLAUDE_CODE_CHILD_SESSION: undefined,
  CURSOR_AGENT: undefined,
  GEMINI_CLI: undefined,
  OPENCODE: undefined,
  AI_AGENT: undefined,
  AGENT: undefined,
  MDXE_AGENT: undefined,
  CI: undefined,
  GITHUB_ACTIONS: undefined,
  NO_COLOR: undefined,
  FORCE_COLOR: undefined,
}

beforeAll(async () => {
  // Build the bin once. A failed build is a hard failure, never a skipped test.
  await build({
    entryPoints: [join(PKG, 'src', 'cli.ts')],
    outdir: OUT,
    bundle: true,
    splitting: true,
    platform: 'node',
    format: 'esm',
    target: 'es2022',
    packages: 'external',
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'silent',
  })
  if (!existsSync(BIN)) throw new Error(`build produced no ${BIN}`)
}, 120_000)

describe('the entry chunk is LIGHT — help/orientation never load a runtime', () => {
  test('the built entry has no static import of a runtime, server, deploy adapter, or oauth.do', () => {
    // The entry chunk's static imports are exactly what `mdxe --help` and a bare `mdxe` load. Every
    // command arm must stay behind an `import("./…")` chunk. (Without code splitting, esbuild would
    // hoist e.g. `oauth.do` to the top and the front door would crash on any export drift there.)
    // Walk the STATIC import graph from the entry through every shared `./chunk-*` it pulls in.
    const seen = new Set<string>()
    const statics: string[] = []
    const walk = (file: string): void => {
      if (seen.has(file)) return
      seen.add(file)
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/^import\s[^;]*?from\s*"([^"]+)"/gm)) {
        const spec = m[1]!
        statics.push(spec)
        if (spec.startsWith('./')) walk(join(dirname(file), spec))
      }
    }
    walk(BIN)
    expect(statics.length).toBeGreaterThan(0)
    for (const spec of statics) {
      expect(spec.startsWith('node:') || ['glob', 'esbuild', '@mdxe/cli-core'].includes(spec) || spec.startsWith('./chunk-'), `entry statically imports ${spec}`).toBe(true)
    }
    expect(readFileSync(BIN, 'utf8')).toMatch(/import\("\.\/[^"]+"\)/) // the command arms are lazy chunks
  })
})

describe('bare invocation — the orientation, fail-closed to the agent', () => {
  test('agent env (CLAUDECODE=1) + open stdin → static text orientation on stdout, exit 0, no hang', async () => {
    const r = await run([], { ...CLEAN, CLAUDECODE: '1' })
    expect(r.timedOut).toBe(false)
    expect(r.code).toBe(0)
    expect(r.stderr).toBe('')
    expect(r.stdout).toContain('mdxe\tversion=')
    expect(r.stdout).toContain('caller=agent\tdetected=env')
    expect(r.stdout).toContain('next\tmdxe help')
    expect(r.stdout).not.toContain('\x1b[') // never colored for a machine
  })

  test('piped human (no env) → text orientation, exit 0, no stdin read', async () => {
    const r = await run([], CLEAN)
    expect(r.timedOut).toBe(false)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('caller=human\tdetected=tty')
  })

  test('--json → the orientation as one JSON object', async () => {
    const r = await run(['--json'], { ...CLEAN, CI: '1' })
    expect(r.code).toBe(0)
    const o = JSON.parse(r.stdout) as { name: string; caller: { kind: string; detectedBy: string } }
    expect(o.name).toBe('mdxe')
    expect(o.caller).toEqual({ kind: 'agent', harness: 'CI', detectedBy: 'ci' })
  })
})

describe('meta fast-paths and fail-closed exits through the real bin', () => {
  test('--help exits 0 with the usage on stdout and nothing on stderr', async () => {
    const r = await run(['--help'], { ...CLEAN, CLAUDECODE: '1' })
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('mdxe - Execute, Test, & Deploy')
    expect(r.stderr).toBe('')
  })

  test('--version exits 0', async () => {
    const r = await run(['--version'], CLEAN)
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/^mdxe version \d+\.\d+\.\d+/)
  })

  test('bad --format → USAGE exit 2, error on stderr ONLY, stdout empty', async () => {
    const r = await run(['--format', 'xml'], { ...CLEAN, CLAUDECODE: '1' })
    expect(r.code).toBe(2)
    expect(r.stdout).toBe('')
    expect(r.stderr).toContain('error\tcode=USAGE')
    expect(r.stderr).toContain('--format must be json|text|human')
  })

  test('bad --format under --json renders the JSON error envelope (stderr)', async () => {
    // --json is peeled first; the resolver then rejects --format — but resolution failed, so the
    // fail-safe (text) context renders. Pin THAT: the error is still machine-parseable and exit 2.
    const r = await run(['--json', '--format', 'xml'], CLEAN)
    expect(r.code).toBe(2)
    expect(r.stdout).toBe('')
    expect(r.stderr).toMatch(/code=USAGE|"code":"USAGE"/)
  })

  test('unknown command → USAGE exit 2 (never the dev server)', async () => {
    const r = await run(['dpeloy'], { ...CLEAN, CLAUDECODE: '1' })
    expect(r.timedOut).toBe(false)
    expect(r.code).toBe(2)
    expect(r.stdout).toBe('')
    expect(r.stderr).toContain('unknown command "dpeloy"')
  })

  test('unknown flag → USAGE exit 2, rejected before its value is consumed', async () => {
    const r = await run(['deploy', '--nmae', 'x'], { ...CLEAN, CLAUDECODE: '1' })
    expect(r.code).toBe(2)
    expect(r.stdout).toBe('')
    expect(r.stderr).toContain('unknown flag --nmae')
  })

  test('--json error envelope on a command-level USAGE error', async () => {
    const r = await run(['deploy', '--nmae', '--json'], CLEAN)
    expect(r.code).toBe(2)
    expect(JSON.parse(r.stderr)).toMatchObject({ error: { code: 'USAGE' } })
  })
})
