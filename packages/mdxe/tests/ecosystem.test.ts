/**
 * ECOSYSTEM.md Documentation Tests
 *
 * Verifies that the ecosystem integration guide exists and contains
 * all required sections for understanding how mdxe integrates with
 * the broader mdx.org.ai ecosystem.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ECOSYSTEM_PATH = join(__dirname, '..', 'ECOSYSTEM.md')

describe('ECOSYSTEM.md', () => {
  it('should exist in packages/mdxe/', () => {
    expect(existsSync(ECOSYSTEM_PATH)).toBe(true)
  })

  describe('Required Sections', () => {
    let content: string

    // Only run these tests if file exists
    const fileExists = existsSync(ECOSYSTEM_PATH)

    if (fileExists) {
      content = readFileSync(ECOSYSTEM_PATH, 'utf-8')
    }

    it('should have Architecture Overview section', () => {
      expect(content).toContain('# ')
      expect(content.toLowerCase()).toContain('architecture')
    })

    it('should have ASCII architecture diagram', () => {
      // Check for common ASCII diagram characters indicating a diagram
      const hasBoxChars = content.includes('```') || content.includes('---') || content.includes('|')
      const hasDiagramIndicator = content.toLowerCase().includes('diagram') || content.includes('mdxld') && content.includes('mdxdb')
      expect(hasBoxChars && hasDiagramIndicator).toBe(true)
    })

    it('should document mdxe + mdxld integration', () => {
      expect(content.toLowerCase()).toContain('mdxld')
      expect(content.toLowerCase()).toContain('parsing')
    })

    it('should document mdxe + mdxdb integration', () => {
      expect(content.toLowerCase()).toContain('mdxdb')
      expect(content.toLowerCase()).toContain('database')
    })

    it('should document mdxe + mdxui integration', () => {
      expect(content.toLowerCase()).toContain('mdxui')
      expect(content.toLowerCase()).toContain('render')
    })

    it('should document mdxe + mdxai integration', () => {
      expect(content.toLowerCase()).toContain('mdxai')
      expect(content.toLowerCase()).toContain('ai')
    })

    it('should include a complete example', () => {
      expect(content.toLowerCase()).toContain('example')
      expect(content.includes('```typescript') || content.includes('```ts')).toBe(true)
    })

    it('should have Package Decision Tree section', () => {
      const hasDecisionTree = content.toLowerCase().includes('decision') || content.toLowerCase().includes('which package')
      expect(hasDecisionTree).toBe(true)
    })
  })
})
