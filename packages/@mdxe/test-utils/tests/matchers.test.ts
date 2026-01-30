/**
 * Tests for custom vitest matchers
 * RED PHASE: These tests define the expected behavior
 */

import { describe, it, expect, beforeAll } from 'vitest'

// Import and setup matchers
import '../src/matchers'

describe('Custom Vitest Matchers', () => {
  describe('toBeValidMDX', () => {
    it('should pass for valid MDX content', () => {
      const validMDX = `---
title: Test
---

# Hello World

Some content here.
`
      expect(validMDX).toBeValidMDX()
    })

    it('should pass for MDX with exports', () => {
      const mdxWithExports = `
export function greet(name) {
  return \`Hello, \${name}!\`
}

# Title
`
      expect(mdxWithExports).toBeValidMDX()
    })

    it('should pass for MDX with JSX', () => {
      const mdxWithJSX = `
# Hello

<CustomComponent prop="value">
  Content
</CustomComponent>
`
      expect(mdxWithJSX).toBeValidMDX()
    })

    it('should fail for invalid MDX syntax', () => {
      const invalidMDX = '<Component unclosed'

      expect(() => {
        expect(invalidMDX).toBeValidMDX()
      }).toThrow()
    })
  })

  describe('toHaveFrontmatter', () => {
    it('should pass when frontmatter contains expected properties', () => {
      const mdx = `---
title: Test Document
author: John Doe
---

# Content
`
      expect(mdx).toHaveFrontmatter({ title: 'Test Document' })
    })

    it('should pass when checking multiple properties', () => {
      const mdx = `---
title: Test
author: Jane
version: 1.0.0
---

# Content
`
      expect(mdx).toHaveFrontmatter({
        title: 'Test',
        author: 'Jane',
      })
    })

    // Note: The simple frontmatter parser only handles flat key-value pairs.
    // For nested YAML structures, use mdxld's parse() function instead.
    it('should pass when checking simple frontmatter keys only', () => {
      const mdx = `---
title: Test
author: Jane
version: 1.0
---

# Content
`
      expect(mdx).toHaveFrontmatter({
        title: 'Test',
        author: 'Jane',
      })
    })

    it('should pass when checking $type and $id', () => {
      const mdx = `---
$type: BlogPost
$id: https://example.com/post/1
title: Test
---

# Content
`
      expect(mdx).toHaveFrontmatter({
        $type: 'BlogPost',
        $id: 'https://example.com/post/1',
      })
    })

    it('should fail when frontmatter does not contain expected property', () => {
      const mdx = `---
title: Test
---

# Content
`
      expect(() => {
        expect(mdx).toHaveFrontmatter({ author: 'John' })
      }).toThrow()
    })

    it('should fail when value does not match', () => {
      const mdx = `---
title: Test
---

# Content
`
      expect(() => {
        expect(mdx).toHaveFrontmatter({ title: 'Different' })
      }).toThrow()
    })

    it('should fail when MDX has no frontmatter', () => {
      const mdx = '# Just content'

      expect(() => {
        expect(mdx).toHaveFrontmatter({ title: 'Test' })
      }).toThrow()
    })
  })

  describe('toHaveExports', () => {
    it('should pass when MDX has expected exports', () => {
      const mdx = `
export function greet(name) {
  return \`Hello, \${name}!\`
}

export const PI = 3.14159

# Content
`
      expect(mdx).toHaveExports(['greet', 'PI'])
    })

    it('should pass when checking single export', () => {
      const mdx = `
export function helper() {}

# Content
`
      expect(mdx).toHaveExports(['helper'])
    })

    it('should pass when MDX has more exports than checked', () => {
      const mdx = `
export function a() {}
export function b() {}
export function c() {}

# Content
`
      expect(mdx).toHaveExports(['a', 'b'])
    })

    it('should pass for async exports', () => {
      const mdx = `
export async function fetchData() {
  return {}
}

# Content
`
      expect(mdx).toHaveExports(['fetchData'])
    })

    it('should pass for class exports', () => {
      const mdx = `
export class Calculator {
  add(a, b) { return a + b }
}

# Content
`
      expect(mdx).toHaveExports(['Calculator'])
    })

    it('should fail when export is missing', () => {
      const mdx = `
export function greet() {}

# Content
`
      expect(() => {
        expect(mdx).toHaveExports(['greet', 'missing'])
      }).toThrow()
    })

    it('should fail when MDX has no exports', () => {
      const mdx = '# Just content'

      expect(() => {
        expect(mdx).toHaveExports(['something'])
      }).toThrow()
    })
  })

  describe('toHaveDefaultExport', () => {
    it('should pass when MDX has default export', () => {
      const mdx = `
export default function Main() {
  return <div>Hello</div>
}
`
      expect(mdx).toHaveDefaultExport()
    })

    it('should pass for default arrow function', () => {
      const mdx = 'export default () => <div>Hello</div>'

      expect(mdx).toHaveDefaultExport()
    })

    it('should pass for default class', () => {
      const mdx = `
export default class Component {
  render() { return <div /> }
}
`
      expect(mdx).toHaveDefaultExport()
    })

    it('should fail when no default export', () => {
      const mdx = `
export function named() {}

# Content
`
      expect(() => {
        expect(mdx).toHaveDefaultExport()
      }).toThrow()
    })
  })

  describe('toBeCompiledMDX', () => {
    it('should pass for valid compiled MDX code', () => {
      // This represents the output of MDX compilation
      const compiledCode = `
import {jsx as _jsx} from "react/jsx-runtime";
export const title = "Test";
function _createMdxContent(props) {
  return _jsx("h1", { children: "Hello" });
}
export default function MDXContent(props) {
  return _jsx(_createMdxContent, props);
}
`
      expect(compiledCode).toBeCompiledMDX()
    })

    it('should pass when code has jsx-runtime import', () => {
      const code = `import {jsx} from "react/jsx-runtime";
export default function() { return jsx("div", {}); }`

      expect(code).toBeCompiledMDX()
    })

    it('should fail for non-compiled code', () => {
      const rawMDX = `# Hello World`

      expect(() => {
        expect(rawMDX).toBeCompiledMDX()
      }).toThrow()
    })
  })

  describe('toHaveCodeBlock', () => {
    it('should pass when MDX has code block with language', () => {
      const mdx = `
# Title

\`\`\`typescript
const x: number = 42;
\`\`\`
`
      expect(mdx).toHaveCodeBlock('typescript')
    })

    it('should pass when checking for any code block', () => {
      const mdx = `
\`\`\`js
console.log("hello")
\`\`\`
`
      expect(mdx).toHaveCodeBlock()
    })

    it('should pass when checking code block content', () => {
      const mdx = `# Example

\`\`\`ts
const PI = 3.14159;
\`\`\`

Some text after.`
      expect(mdx).toHaveCodeBlock('ts', { contains: 'PI' })
    })

    it('should pass when checking for test code block', () => {
      const mdx = `
\`\`\`ts test name="should work"
expect(1 + 1).toBe(2)
\`\`\`
`
      expect(mdx).toHaveCodeBlock('ts', { meta: 'test' })
    })

    it('should fail when language does not match', () => {
      const mdx = `
\`\`\`javascript
code
\`\`\`
`
      expect(() => {
        expect(mdx).toHaveCodeBlock('typescript')
      }).toThrow()
    })

    it('should fail when no code blocks exist', () => {
      const mdx = '# Just content'

      expect(() => {
        expect(mdx).toHaveCodeBlock('js')
      }).toThrow()
    })
  })

  describe('toMatchMDXSnapshot', () => {
    // Note: Snapshot tests require vitest's snapshot functionality
    it('should compare MDX structure (not exact string)', () => {
      const mdx = `---
title: Test
---

# Hello

Content here.
`
      // This matcher normalizes whitespace and compares structure
      expect(mdx).toMatchMDXSnapshot()
    })
  })

  describe('Negated matchers', () => {
    it('should support .not.toBeValidMDX()', () => {
      expect('<broken unclosed').not.toBeValidMDX()
    })

    it('should support .not.toHaveFrontmatter()', () => {
      expect('# No frontmatter').not.toHaveFrontmatter({ title: 'Test' })
    })

    it('should support .not.toHaveExports()', () => {
      expect('# No exports').not.toHaveExports(['missing'])
    })

    it('should support .not.toHaveDefaultExport()', () => {
      expect('export const x = 1').not.toHaveDefaultExport()
    })
  })
})
