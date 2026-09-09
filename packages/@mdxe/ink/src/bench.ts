/**
 * `pnpm --filter @mdxe/ink bench` — benchmark the Ink viewer on the shared harness and print JSON.
 *
 * `installBytes` covers `ink`, `react` and their transitive dependencies as resolved from this
 * package, deduplicated by real path, so pnpm's symlinked layout is measured honestly rather than
 * reporting the `ink` directory alone.
 */

import { readFile, realpath, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { benchmark, formatReport, measureInstallBytes } from '@mdxe/tui/benchmark'
import { createInkViewer } from './viewer'

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  )
}

/** Node's lookup, minus `exports`: walk up from `from` for `node_modules/<name>/package.json`. */
async function findPackage(from: string, name: string): Promise<string | null> {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (await exists(join(candidate, 'package.json'))) return candidate
    if (dirname(dir) === dir) return null
  }
}

/** Bytes on disk for the named roots plus everything they depend on, each package counted once. */
export async function transitiveInstallBytes(from: string, roots: readonly string[]): Promise<{ bytes: number; packages: number }> {
  const seen = new Set<string>()
  let bytes = 0
  const visit = async (dir: string): Promise<void> => {
    const real = await realpath(dir)
    if (seen.has(real)) return
    seen.add(real)
    bytes += await measureInstallBytes(real)
    const pkg = JSON.parse(await readFile(join(real, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> }
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      const found = await findPackage(real, dep)
      if (found) await visit(found)
    }
  }
  for (const root of roots) {
    const found = await findPackage(from, root)
    if (found) await visit(found)
  }
  return { bytes, packages: seen.size }
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url))
  const install = await transitiveInstallBytes(here, ['ink', 'react'])
  const report = await benchmark(() => createInkViewer(), { installBytes: install.bytes, repaints: 50 })
  process.stdout.write(formatReport({ ...report, installPackages: install.packages }) + '\n')
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`)
  process.exitCode = 1
})
