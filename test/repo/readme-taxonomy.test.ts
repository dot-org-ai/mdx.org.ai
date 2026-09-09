import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('README.md package taxonomy', () => {
  const readmePath = resolve(__dirname, '../../README.md')
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

      it('should document @mdxe/isolate for isolated Worker modules', () => {
        expect(readme).toContain('@mdxe/isolate')
      })

      it('should state that the Cloudflare-native prune removed the node/bun runtimes (mdx-8je.7)', () => {
        expect(readme).toMatch(/Cloudflare-native only/)
        expect(readme).toMatch(/@mdxe\/node.*removed|removed.*@mdxe\/node/s)
        expect(readme).not.toMatch(/\|\s*\*\*@mdxe\/(node|bun|next|honox|electron|expo|remotion|slidev|vercel|github|payload)\*\*/)
      })
    })

    describe('Framework Integrations', () => {
      it('should document @mdxe/hono for Hono HTTP servers', () => {
        expect(readme).toContain('@mdxe/hono')
      })

      it('should document @mdxe/fumadocs for docs sites on Workers via OpenNext', () => {
        expect(readme).toContain('@mdxe/fumadocs')
        expect(readme).toMatch(/OpenNext/)
      })
    })

    describe('Protocols', () => {
      it('should point RPC users at rpc.do instead of a removed @mdxe/rpc package (mdx-8je.29)', () => {
        expect(readme).toMatch(/RPC is not an `@mdxe` package/)
        expect(readme).toMatch(/rpc\.do/)
        // ai-functions@2.4 ships no RPC / RPCPromise; the README must not send RPC users there,
        // nor link the primitives submodule path that mdx-8je.2 deleted.
        expect(readme).not.toMatch(/import\s*\{[^}]*\bRPC\b[^}]*\}\s*from\s*['"]ai-functions['"]/)
        expect(readme).not.toMatch(/primitives\/packages\/ai-functions/)
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

      it('should document @mdxe/do and @mdxe/deploy, and no Vercel / GitHub Pages target', () => {
        expect(readme).toContain('@mdxe/do')
        expect(readme).toContain('@mdxe/deploy')
        expect(readme).not.toMatch(/\|\s*\*\*@mdxe\/(vercel|github)\*\*/)
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

      it('should document @mdxe/tui as the viewer seam', () => {
        expect(readme).toContain('@mdxe/tui')
      })
    })
  })

  it('should be consistent with CLAUDE.md package descriptions', () => {
    const claudeMdPath = resolve(__dirname, '../../CLAUDE.md')
    const claudeMd = readFileSync(claudeMdPath, 'utf-8')

    // Verify key packages mentioned in both files
    // CLAUDE.md uses both `@mdxe/name` and tree notation `├── name`
    const keyPackages = [
      { readme: '@mdxe/workers', claudeMd: /(@mdxe\/workers|├── workers)/ },
      { readme: '@mdxe/isolate', claudeMd: /(@mdxe\/isolate|├── isolate)/ },
      { readme: '@mdxe/hono', claudeMd: /(@mdxe\/hono|├── hono)/ },
      { readme: '@mdxe/deploy', claudeMd: /(@mdxe\/deploy|├── deploy)/ },
      { readme: '@mdxe/ink', claudeMd: /@mdxe\/ink/ },
      { readme: '@mdxe/mcp', claudeMd: /@mdxe\/mcp/ },
      { readme: '@mdxe/vitest', claudeMd: /(@mdxe\/vitest|├── vitest)/ },
    ]

    for (const pkg of keyPackages) {
      expect(readme).toContain(pkg.readme)
      expect(claudeMd).toMatch(pkg.claudeMd)
    }
  })
})
