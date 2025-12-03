/**
 * Deploy docs.mdx.org.ai
 */

import { build, publish } from '../src/index.js'

const DOCS_DIR = '/Users/nathanclevenger/projects/mdx.org.ai/docs'

async function main() {
  console.log('Building docs...')

  const buildResult = await build({
    projectDir: DOCS_DIR,
    verbose: true,
  })

  if (!buildResult.success) {
    console.error('Build failed:', buildResult.error)
    console.log('Logs:', buildResult.logs)
    process.exit(1)
  }

  console.log('\nBuild successful!')
  console.log(`  Documents: ${buildResult.bundle!.content.count}`)
  console.log(`  Worker size: ${buildResult.bundle!.worker.main.length} bytes`)

  // Deploy
  console.log('\n--- Deploying to docs.mdx.org.ai ---')
  const deployResult = await publish(buildResult.bundle!, {
    namespace: 'mdx-org-ai-docs',
    accountId: 'b6641681fe423910342b9ffa1364c76d',
    verbose: true,
  })

  if (deployResult.success) {
    console.log('Deploy successful!')
    console.log('Logs:', deployResult.logs)
  } else {
    console.error('Deploy failed:', deployResult.error)
    console.log('Logs:', deployResult.logs)
  }
}

main().catch(console.error)
