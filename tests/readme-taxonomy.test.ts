import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('README.md package taxonomy', () => {
  const readmePath = resolve(__dirname, '../README.md')
  const readme = readFileSync(readmePath, 'utf-8')

  describe('@mdxe Package Taxonomy', () => {
    it('should have an @mdxe Packages section with detailed taxonomy', () => {
      expect(readme).toContain('## @mdxe Packages')
    })

    describe('Core Runtimes', () => {
      it('should document @mdxe/workers for Cloudflare Workers', () => {
        expect(readme).toContain('@mdxe/workers')
        expect(readme).toMatch(/workers.*cloudflare/i)
      })

      it('should document @mdxe/workers/local for local dev via Miniflare', () => {
        expect(readme).toMatch(/@mdxe\/workers\/local|miniflare/i)
      })

      it('should document @mdxe/bun for Bun runtime', () => {
        expect(readme).toContain('@mdxe/bun')
      })

      it('should document @mdxe/node with deprecation note', () => {
        expect(readme).toContain('@mdxe/node')
        expect(readme).toMatch(/node.*deprecated|deprecated.*node/i)
      })
    })

    describe('Framework Integrations', () => {
      it('should document @mdxe/next for Next.js App Router', () => {
        expect(readme).toContain('@mdxe/next')
        expect(readme).toMatch(/next.*app router|next\.js/i)
      })

      it('should document @mdxe/hono for Hono HTTP servers', () => {
        expect(readme).toContain('@mdxe/hono')
      })

      it('should document @mdxe/honox for HonoX full-stack', () => {
        expect(readme).toContain('@mdxe/honox')
      })
    })

    describe('Protocols', () => {
      it('should document @mdxe/rpc for capnweb RPC', () => {
        expect(readme).toContain('@mdxe/rpc')
        expect(readme).toMatch(/rpc.*capnweb/i)
      })

      it('should document @mdxe/mcp for Model Context Protocol', () => {
        expect(readme).toContain('@mdxe/mcp')
        expect(readme).toMatch(/mcp.*model context protocol/i)
      })
    })

    describe('Deployment', () => {
      it('should document @mdxe/cloudflare for Cloudflare Workers/Pages', () => {
        expect(readme).toMatch(/@mdxe\/cloudflare|cloudflare workers|cloudflare pages/i)
      })

      it('should document @mdxe/vercel for Vercel deployment', () => {
        expect(readme).toMatch(/@mdxe\/vercel|vercel/i)
      })
    })

    describe('Specialized', () => {
      it('should document @mdxe/vitest for Vitest integration', () => {
        expect(readme).toContain('@mdxe/vitest')
      })

      it('should document @mdxe/ink for Terminal UI', () => {
        expect(readme).toContain('@mdxe/ink')
        expect(readme).toMatch(/ink.*terminal/i)
      })

      it('should document @mdxe/electron for Desktop apps', () => {
        expect(readme).toContain('@mdxe/electron')
      })

      it('should document @mdxe/expo for React Native', () => {
        expect(readme).toContain('@mdxe/expo')
      })
    })
  })

  it('should be consistent with CLAUDE.md package descriptions', () => {
    const claudeMdPath = resolve(__dirname, '../CLAUDE.md')
    const claudeMd = readFileSync(claudeMdPath, 'utf-8')

    // Verify key packages mentioned in both files
    // CLAUDE.md uses both `@mdxe/name` and tree notation `├── name`
    const keyPackages = [
      { readme: '@mdxe/node', claudeMd: /(@mdxe\/node|├── node)/ },
      { readme: '@mdxe/bun', claudeMd: /(@mdxe\/bun|├── bun)/ },
      { readme: '@mdxe/workers', claudeMd: /(@mdxe\/workers|├── workers)/ },
      { readme: '@mdxe/hono', claudeMd: /(@mdxe\/hono|├── hono)/ },
      { readme: '@mdxe/next', claudeMd: /(@mdxe\/next|├── next)/ },
      { readme: '@mdxe/ink', claudeMd: /@mdxe\/ink/ },
      { readme: '@mdxe/rpc', claudeMd: /@mdxe\/rpc/ },
      { readme: '@mdxe/mcp', claudeMd: /@mdxe\/mcp/ },
      { readme: '@mdxe/vitest', claudeMd: /(@mdxe\/vitest|├── vitest)/ },
    ]

    for (const pkg of keyPackages) {
      expect(readme).toContain(pkg.readme)
      expect(claudeMd).toMatch(pkg.claudeMd)
    }
  })
})
