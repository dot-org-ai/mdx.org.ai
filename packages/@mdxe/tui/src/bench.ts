/**
 * `pnpm --filter @mdxe/tui bench [installDir]` — benchmark the stub viewer and print JSON.
 * Implementation packages call `benchmark()` with their own factory and install directory.
 */

import { benchmark, formatReport } from './benchmark'
import { createStubViewer } from './stub'

async function main(): Promise<void> {
  const installDir = process.argv[2] ?? 'dist'
  const report = await benchmark(() => createStubViewer(), { installDir })
  process.stdout.write(formatReport(report) + '\n')
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})
