/**
 * @mdxe/bun README documentation tests
 *
 * TDD tests to verify README.md documentation completeness and accuracy.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const README_PATH = join(__dirname, 'README.md')

describe('@mdxe/bun README.md', () => {
  let readmeContent: string

  beforeAll(() => {
    readmeContent = existsSync(README_PATH) ? readFileSync(README_PATH, 'utf-8') : ''
  })

  describe('File Existence', () => {
    it('should have a README.md file', () => {
      expect(existsSync(README_PATH)).toBe(true)
    })
  })

  describe('Required Sections', () => {
    it('should have an Overview section describing what @mdxe/bun does', () => {
      // Check for title and description of Miniflare/workerd usage
      expect(readmeContent).toMatch(/^# @mdxe\/bun/m)
      expect(readmeContent).toMatch(/miniflare|workerd/i)
      expect(readmeContent).toMatch(/bun/i)
    })

    it('should have an Installation section', () => {
      expect(readmeContent).toMatch(/^## Installation/m)
      expect(readmeContent).toMatch(/pnpm add @mdxe\/bun|npm install @mdxe\/bun|bun add @mdxe\/bun/i)
    })

    it('should have a Quick Start section with minimal example', () => {
      expect(readmeContent).toMatch(/^## Quick Start/m)
      // Should have code example
      expect(readmeContent).toMatch(/```(typescript|ts)/m)
    })

    it('should have an API Reference section', () => {
      expect(readmeContent).toMatch(/^## API Reference/m)
    })

    it('should have an Examples section', () => {
      expect(readmeContent).toMatch(/^## Examples/m)
    })
  })

  describe('API Documentation', () => {
    it('should document the evaluate() function', () => {
      expect(readmeContent).toMatch(/### `?evaluate\(?/)
      expect(readmeContent).toMatch(/evaluate\s*\(/m)
    })

    it('should document the createEvaluator() function', () => {
      expect(readmeContent).toMatch(/createEvaluator/)
    })

    it('should document the run() function', () => {
      expect(readmeContent).toMatch(/### `?run\(?/)
    })

    it('should document the test() function', () => {
      expect(readmeContent).toMatch(/test\(\)/)
    })

    it('should document the disposeAll() function', () => {
      expect(readmeContent).toMatch(/disposeAll/)
    })

    it('should document evaluateFile() function', () => {
      expect(readmeContent).toMatch(/evaluateFile/)
    })

    it('should document runFile() function', () => {
      expect(readmeContent).toMatch(/runFile/)
    })
  })

  describe('Configuration Documentation', () => {
    it('should document EvaluateOptions type', () => {
      expect(readmeContent).toMatch(/EvaluateOptions/)
    })

    it('should document SandboxOptions type', () => {
      expect(readmeContent).toMatch(/SandboxOptions/)
    })

    it('should document MiniflareConfig type', () => {
      expect(readmeContent).toMatch(/MiniflareConfig|miniflareOptions/i)
    })

    it('should document EvaluateResult type', () => {
      expect(readmeContent).toMatch(/EvaluateResult/)
    })
  })

  describe('Code Examples', () => {
    it('should have a basic evaluation example', () => {
      // Should show how to evaluate MDX and call exported functions
      expect(readmeContent).toMatch(/evaluate\(/m)
      expect(readmeContent).toMatch(/result\.call/m)
    })

    it('should have an example calling exported functions', () => {
      expect(readmeContent).toMatch(/call\s*\(/)
    })

    it('should have a sandbox configuration example', () => {
      expect(readmeContent).toMatch(/sandbox:\s*\{/)
      expect(readmeContent).toMatch(/blockNetwork/i)
    })

    it('should demonstrate dispose pattern', () => {
      expect(readmeContent).toMatch(/dispose/)
    })
  })

  describe('TypeScript Examples Validity', () => {
    it('should have import statements in examples', () => {
      expect(readmeContent).toMatch(/import\s*\{[^}]*\}\s*from\s*['"]@mdxe\/bun['"]/m)
    })

    it('should use async/await correctly in examples', () => {
      // Evaluate returns a promise, so examples should use await
      expect(readmeContent).toMatch(/await\s+evaluate/m)
    })
  })

  describe('Server Documentation', () => {
    it('should document server functionality', () => {
      expect(readmeContent).toMatch(/createApp|createDevServer|createServer/)
    })

    it('should document ServerOptions', () => {
      expect(readmeContent).toMatch(/ServerOptions/)
    })
  })

  describe('Test Runner Documentation', () => {
    it('should document test runner functionality', () => {
      expect(readmeContent).toMatch(/runTests|runTestsFromFile|runTestsFromContent/)
    })

    it('should document test extraction', () => {
      expect(readmeContent).toMatch(/extractTests|TestBlock/)
    })

    it('should document MDX test file format', () => {
      expect(readmeContent).toMatch(/```ts test/)
    })
  })

  describe('Related Packages', () => {
    it('should have a Related Packages section', () => {
      expect(readmeContent).toMatch(/^## Related Packages/m)
    })

    it('should link to @mdxe/workers', () => {
      expect(readmeContent).toMatch(/@mdxe\/workers/)
    })

    it('should link to @mdxe/isolate', () => {
      expect(readmeContent).toMatch(/@mdxe\/isolate/)
    })

    it('should link to mdxld', () => {
      expect(readmeContent).toMatch(/mdxld/)
    })
  })

  describe('License', () => {
    it('should have a License section', () => {
      expect(readmeContent).toMatch(/^## License/m)
      expect(readmeContent).toMatch(/MIT/)
    })
  })
})
