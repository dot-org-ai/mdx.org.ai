// @mdxdb/do builds with `dts: false`, so the declaration its package.json
// points at (dist/durable-object.d.ts) never exists (gap mdx-8je.59,
// same family as mdx-8je.43). The test worker only re-exports
// the class; declare it minimally here. Ambient (no imports) on purpose.
declare module '@mdxdb/do/durable-object' {
  export class MDXDurableObject {
    constructor(ctx: DurableObjectState, env: unknown)
  }
}
