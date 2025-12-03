/**
 * BuilderCSS Documentation Worker
 *
 * Cloudflare Worker entry point for docs.buildercss.dev
 * Uses @mdxe/hono to serve MDX documentation
 */

import { Hono } from 'hono'
import { createMdxApp } from '@mdxe/hono'

// Create the Hono app for BuilderCSS documentation
const app = new Hono()

// Create MDX handler for this directory
const mdxApp = createMdxApp({
  projectDir: '.',
  baseUrl: 'https://docs.buildercss.dev',
})

// Mount the MDX app
app.route('/', mdxApp)

// Export for Cloudflare Workers
export default app
