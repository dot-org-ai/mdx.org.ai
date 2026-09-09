/**
 * Test worker: exposes the @mdxdb/do Durable Object for the workers pool.
 *
 * This is exactly what a deployed Worker does — export the class named in
 * wrangler's `durable_objects.bindings` — so the suite runs against the
 * same code path production uses.
 */
export { MDXDurableObject } from '@mdxdb/do/durable-object'

export default {
  fetch(): Response {
    return new Response('mdxdb test worker', { status: 200 })
  },
}
