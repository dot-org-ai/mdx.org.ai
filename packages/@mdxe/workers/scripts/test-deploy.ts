/**
 * Test script for deploying a sample site
 */

import { build, publish } from '../src/index.js'
import { join } from 'node:path'

const FIXTURES_DIR = join(import.meta.dirname, '..', 'tests', 'fixtures', 'sample-site')

async function main() {
  console.log('Building sample site...')

  const buildResult = await build({
    projectDir: FIXTURES_DIR,
    verbose: true,
  })

  if (!buildResult.success) {
    console.error('Build failed:', buildResult.error)
    process.exit(1)
  }

  console.log('\nBuild successful!')
  console.log(`  Documents: ${buildResult.bundle!.content.count}`)
  console.log(`  Worker size: ${buildResult.bundle!.worker.main.length} bytes`)
  console.log(`  Content hash: ${buildResult.bundle!.content.hash}`)

  // Dry run publish first
  console.log('\n--- Dry Run ---')
  const dryResult = await publish(buildResult.bundle!, {
    namespace: 'mdxe-test-site',
    dryRun: true,
    verbose: true,
  })

  console.log('Logs:', dryResult.logs)

  // Ask to proceed with real deploy
  const args = process.argv.slice(2)
  if (args.includes('--deploy')) {
    console.log('\n--- Real Deploy ---')
    const deployResult = await publish(buildResult.bundle!, {
      namespace: 'mdxe-test-site',
      accountId: 'b6641681fe423910342b9ffa1364c76d', // .do account
      verbose: true,
    })

    if (deployResult.success) {
      console.log('Deploy successful!')
      console.log('Logs:', deployResult.logs)
    } else {
      console.error('Deploy failed:', deployResult.error)
      console.log('Logs:', deployResult.logs)
    }
  } else {
    console.log('\nRun with --deploy to actually deploy')
  }
}

main().catch(console.error)
