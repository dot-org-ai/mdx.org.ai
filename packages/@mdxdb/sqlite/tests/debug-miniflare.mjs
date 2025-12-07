/**
 * Debug script to test miniflare initialization
 */
import { createMiniflareBinding } from '../dist/miniflare.js'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TEST_PERSIST_PATH = join(tmpdir(), `mdxdb-test-debug-${Date.now()}`)

console.log('Starting miniflare initialization...')
console.log('Persist path:', TEST_PERSIST_PATH)

try {
  console.log('Calling createMiniflareBinding...')
  const binding = await createMiniflareBinding(TEST_PERSIST_PATH)
  console.log('Binding created successfully:', binding)

  const id = binding.idFromName('test.debug.local')
  console.log('ID created:', id.toString())

  const stub = binding.get(id)
  console.log('Stub created:', Object.keys(stub))

  console.log('SUCCESS!')
  process.exit(0)
} catch (error) {
  console.error('ERROR:', error)
  console.error('Stack:', error.stack)
  process.exit(1)
}
