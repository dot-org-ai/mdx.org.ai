/**
 * Vitest globalSetup: make the mdxe suite independent of a prior `pnpm build`.
 *
 * Why this exists: mdxe depends on the registry-published `@mdxe/fumadocs`,
 * whose `mdxld` dependency the lockfile resolves to `link:packages/mdxld`
 * (the workspace package), while mdxe's own `mdxld` resolves to the registry
 * copy. The workspace copy has no `dist/` until it is built, so any test that
 * loads `@mdxe/fumadocs` at runtime (tests/type-safety.test.ts) fails in a
 * fresh `pnpm install` with
 *   Cannot find module '.../@mdxe+fumadocs.../node_modules/mdxld/dist/index.js'
 *
 * `turbo test` orders `build` before `test`, so it never sees this; a direct
 * `pnpm --filter mdxe test` or `pnpm exec vitest run` does. This setup makes
 * the suite state its precondition and satisfy it: if the workspace build
 * output is missing, build that package once, loudly, before any test runs.
 * When the output already exists (the turbo-ordered path) this is a no-op.
 *
 * Opt out with MDXE_SKIP_WORKSPACE_BUILD=1 (for example when a CI step has
 * already built the workspace and a rebuild must not happen inside tests).
 */

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const packagesDir = resolve(here, '..', '..', '..')
const repoRoot = resolve(packagesDir, '..')

/**
 * Workspace packages that mdxe tests load at runtime through a *published*
 * dependency whose lockfile entry links back into the workspace.
 * Each entry: the pnpm package name and the file that proves it is built.
 */
const REQUIRED_WORKSPACE_BUILDS: ReadonlyArray<{ name: string; builtFile: string }> = [
  { name: 'mdxld', builtFile: join(packagesDir, 'mdxld', 'dist', 'index.js') },
]

export default function ensureWorkspaceBuilt(): void {
  if (process.env.MDXE_SKIP_WORKSPACE_BUILD === '1') return

  for (const { name, builtFile } of REQUIRED_WORKSPACE_BUILDS) {
    if (existsSync(builtFile)) continue

    process.stderr.write(
      `[mdxe tests] workspace package "${name}" is not built (${builtFile} missing); ` +
        `running "pnpm --filter ${name} build" before the suite.\n`
    )

    const result = spawnSync('pnpm', ['--filter', name, 'build'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    })

    if (result.error) {
      throw new Error(`[mdxe tests] could not spawn pnpm to build "${name}": ${result.error.message}`)
    }
    if (result.status !== 0) {
      throw new Error(`[mdxe tests] "pnpm --filter ${name} build" exited with code ${result.status}`)
    }
    if (!existsSync(builtFile)) {
      throw new Error(`[mdxe tests] build of "${name}" succeeded but ${builtFile} still does not exist`)
    }
  }
}
