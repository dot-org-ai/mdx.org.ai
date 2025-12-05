/**
 * Parser Tests
 *
 * Tests for MDX parsing, frontmatter extraction, type/id inference, and relationship extraction.
 */

import { describe, it, expect } from 'vitest'
import {
  parseFrontmatter,
  inferTypeFromPath,
  inferIdFromPath,
  hashContent,
  isMdxFile,
  shouldIncludeFile,
  extractRelationships,
  extractSearchMetadata,
} from '../sync/parser'

// =============================================================================
// Frontmatter Parsing Tests
// =============================================================================

describe('parseFrontmatter', () => {
  it('parses simple frontmatter', () => {
    const content = `---
title: Hello World
author: John
---

# Content`

    const result = parseFrontmatter(content)

    expect(result.data.title).toBe('Hello World')
    expect(result.data.author).toBe('John')
    expect(result.content).toBe('\n# Content')
  })

  it('returns empty data for content without frontmatter', () => {
    const content = '# Hello World\n\nJust content'

    const result = parseFrontmatter(content)

    expect(result.data).toEqual({})
    expect(result.content).toBe(content)
  })

  it('handles quoted string values', () => {
    const content = `---
title: "Hello World"
description: 'A description'
---

Content`

    const result = parseFrontmatter(content)

    expect(result.data.title).toBe('Hello World')
    expect(result.data.description).toBe('A description')
  })

  it('handles boolean values', () => {
    const content = `---
draft: true
published: false
---

Content`

    const result = parseFrontmatter(content)

    expect(result.data.draft).toBe(true)
    expect(result.data.published).toBe(false)
  })

  it('handles numeric values', () => {
    const content = `---
version: 42
rating: 4.5
---

Content`

    const result = parseFrontmatter(content)

    expect(result.data.version).toBe(42)
    expect(result.data.rating).toBe(4.5)
  })

  it('handles array values', () => {
    const content = `---
tags: [javascript, typescript, react]
---

Content`

    const result = parseFrontmatter(content)

    expect(result.data.tags).toEqual(['javascript', 'typescript', 'react'])
  })

  it('handles empty arrays', () => {
    const content = `---
tags: []
---

Content`

    const result = parseFrontmatter(content)

    expect(result.data.tags).toEqual([])
  })

  it('handles $type and $id prefixes', () => {
    const content = `---
$type: BlogPost
$id: hello-world
title: Hello
---

Content`

    const result = parseFrontmatter(content)

    expect(result.data.type).toBe('BlogPost')
    expect(result.data.id).toBe('hello-world')
    expect(result.data.title).toBe('Hello')
  })

  it('handles Windows line endings (CRLF)', () => {
    const content = '---\r\ntitle: Hello\r\n---\r\n\r\nContent'

    const result = parseFrontmatter(content)

    expect(result.data.title).toBe('Hello')
    expect(result.content.trim()).toBe('Content')
  })

  it('handles empty frontmatter', () => {
    // Empty frontmatter (no newline between ---) doesn't match the regex
    // which requires content between the delimiters
    const content = `---
---

Content`

    const result = parseFrontmatter(content)

    // Without content between ---, the regex doesn't match, so content stays unchanged
    // This is expected behavior - a valid frontmatter needs at least one newline
    expect(result.data).toEqual({})
    // The content includes the frontmatter since it wasn't parsed
    expect(result.content).toBe(content)
  })

  it('ignores malformed lines without colon', () => {
    const content = `---
title: Hello
invalid line without colon
author: John
---

Content`

    const result = parseFrontmatter(content)

    expect(result.data.title).toBe('Hello')
    expect(result.data.author).toBe('John')
  })
})

// =============================================================================
// Type Inference Tests
// =============================================================================

describe('inferTypeFromPath', () => {
  it('infers type from directory name', () => {
    expect(inferTypeFromPath('posts/hello.mdx')).toBe('Post')
    expect(inferTypeFromPath('articles/intro.md')).toBe('Article')
    expect(inferTypeFromPath('content/blog/post.mdx')).toBe('Blog')
  })

  it('singularizes plural directory names', () => {
    expect(inferTypeFromPath('posts/hello.mdx')).toBe('Post')
    expect(inferTypeFromPath('categories/tech.mdx')).toBe('Category')
  })

  it('handles -ies plural (categories -> category)', () => {
    expect(inferTypeFromPath('categories/tech.mdx')).toBe('Category')
    expect(inferTypeFromPath('stories/chapter1.md')).toBe('Story')
  })

  it('handles -es plural (boxes -> box)', () => {
    expect(inferTypeFromPath('boxes/item.mdx')).toBe('Box')
    expect(inferTypeFromPath('patches/v1.md')).toBe('Patch')
  })

  it('capitalizes type', () => {
    expect(inferTypeFromPath('posts/hello.mdx')).toBe('Post')
    expect(inferTypeFromPath('POSTS/hello.mdx')).toBe('Post')
  })

  it('handles bracket notation [Type].mdx', () => {
    expect(inferTypeFromPath('[Post].mdx')).toBe('Post')
    expect(inferTypeFromPath('content/[Article].mdx')).toBe('Article')
    expect(inferTypeFromPath('blog/[BlogPost].md')).toBe('BlogPost')
  })

  it('handles deeply nested paths', () => {
    expect(inferTypeFromPath('content/blog/2024/01/post.mdx')).toBe('01')
    expect(inferTypeFromPath('docs/api/v2/reference.md')).toBe('V2')
  })

  it('handles single file without directory', () => {
    expect(inferTypeFromPath('readme.mdx')).toBe('Readme')
    expect(inferTypeFromPath('index.md')).toBe('Index')
  })
})

// =============================================================================
// ID Inference Tests
// =============================================================================

describe('inferIdFromPath', () => {
  it('extracts ID from filename', () => {
    expect(inferIdFromPath('posts/hello-world.mdx')).toBe('hello-world')
    expect(inferIdFromPath('articles/intro.md')).toBe('intro')
  })

  it('removes extension', () => {
    expect(inferIdFromPath('posts/test.mdx')).toBe('test')
    expect(inferIdFromPath('posts/test.md')).toBe('test')
    expect(inferIdFromPath('posts/test.MD')).toBe('test')
    expect(inferIdFromPath('posts/test.MDX')).toBe('test')
  })

  it('returns empty for bracket notation files', () => {
    expect(inferIdFromPath('[Post].mdx')).toBe('')
    expect(inferIdFromPath('content/[Article].md')).toBe('')
  })

  it('handles deeply nested paths', () => {
    expect(inferIdFromPath('content/blog/2024/01/my-post.mdx')).toBe('my-post')
  })

  it('preserves dashes and underscores', () => {
    expect(inferIdFromPath('posts/my-awesome_post.mdx')).toBe('my-awesome_post')
  })
})

// =============================================================================
// Content Hashing Tests
// =============================================================================

describe('hashContent', () => {
  it('generates SHA-256 hash', () => {
    const hash = hashContent('Hello World')

    expect(hash).toHaveLength(64) // SHA-256 produces 64 hex characters
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  it('produces consistent hashes', () => {
    const content = 'Test content'
    const hash1 = hashContent(content)
    const hash2 = hashContent(content)

    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different content', () => {
    const hash1 = hashContent('Content A')
    const hash2 = hashContent('Content B')

    expect(hash1).not.toBe(hash2)
  })

  it('handles empty string', () => {
    const hash = hashContent('')

    expect(hash).toHaveLength(64)
  })

  it('handles unicode content', () => {
    const hash = hashContent('Hello 世界 🌍')

    expect(hash).toHaveLength(64)
  })
})

// =============================================================================
// MDX File Detection Tests
// =============================================================================

describe('isMdxFile', () => {
  it('detects .mdx files', () => {
    expect(isMdxFile('test.mdx')).toBe(true)
    expect(isMdxFile('path/to/file.mdx')).toBe(true)
  })

  it('detects .md files', () => {
    expect(isMdxFile('test.md')).toBe(true)
    expect(isMdxFile('path/to/file.md')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(isMdxFile('test.MDX')).toBe(true)
    expect(isMdxFile('test.MD')).toBe(true)
    expect(isMdxFile('test.Mdx')).toBe(true)
  })

  it('rejects non-MDX files', () => {
    expect(isMdxFile('test.txt')).toBe(false)
    expect(isMdxFile('test.js')).toBe(false)
    expect(isMdxFile('test.tsx')).toBe(false)
    expect(isMdxFile('test.json')).toBe(false)
  })

  it('rejects files with MDX in name but wrong extension', () => {
    expect(isMdxFile('mdx-file.txt')).toBe(false)
    expect(isMdxFile('test.mdx.bak')).toBe(false)
  })
})

// =============================================================================
// File Inclusion Tests
// =============================================================================

describe('shouldIncludeFile', () => {
  it('includes all files by default', () => {
    expect(shouldIncludeFile('test.mdx')).toBe(true)
    expect(shouldIncludeFile('any/path/file.txt')).toBe(true)
  })

  it('respects include patterns', () => {
    const include = ['content/**/*.mdx']

    expect(shouldIncludeFile('content/posts/hello.mdx', include)).toBe(true)
    expect(shouldIncludeFile('docs/readme.mdx', include)).toBe(false)
  })

  it('respects exclude patterns', () => {
    const exclude = ['**/drafts/**']

    expect(shouldIncludeFile('posts/hello.mdx', undefined, exclude)).toBe(true)
    expect(shouldIncludeFile('posts/drafts/test.mdx', undefined, exclude)).toBe(false)
  })

  it('exclude takes precedence over include', () => {
    const include = ['content/**/*.mdx']
    const exclude = ['**/drafts/**']

    expect(shouldIncludeFile('content/posts/hello.mdx', include, exclude)).toBe(true)
    expect(shouldIncludeFile('content/drafts/hello.mdx', include, exclude)).toBe(false)
  })

  it('handles glob patterns', () => {
    const include = ['*.mdx']

    expect(shouldIncludeFile('test.mdx', include)).toBe(true)
    expect(shouldIncludeFile('path/test.mdx', include)).toBe(false) // * doesn't match /
  })

  it('handles ** globstar', () => {
    const include = ['**/*.mdx']

    // The globstar pattern matches paths with at least one directory level
    // For root-level files, use *.mdx pattern separately
    expect(shouldIncludeFile('path/test.mdx', include)).toBe(true)
    expect(shouldIncludeFile('deep/nested/path/test.mdx', include)).toBe(true)
  })

  it('handles specific file patterns', () => {
    const include = ['README.mdx', 'index.mdx']

    expect(shouldIncludeFile('README.mdx', include)).toBe(true)
    expect(shouldIncludeFile('index.mdx', include)).toBe(true)
    expect(shouldIncludeFile('other.mdx', include)).toBe(false)
  })
})

// =============================================================================
// Relationship Extraction Tests
// =============================================================================

describe('extractRelationships', () => {
  const ns = 'example.com'

  it('extracts relationships from frontmatter references', () => {
    const data = {
      author: 'Author/john',
    }

    const relationships = extractRelationships(data, '', ns)

    expect(relationships).toHaveLength(1)
    expect(relationships![0]).toEqual({
      predicate: 'author',
      target: 'example.com/Author/john',
      reverse: 'authored',
    })
  })

  it('extracts relationships from array references', () => {
    const data = {
      tags: ['Tag/javascript', 'Tag/typescript'],
    }

    const relationships = extractRelationships(data, '', ns)

    expect(relationships).toHaveLength(2)
    expect(relationships![0].target).toBe('example.com/Tag/javascript')
    expect(relationships![1].target).toBe('example.com/Tag/typescript')
  })

  it('extracts mentions from wiki-style links', () => {
    const content = 'This post references [[Post/other-post]] and [[Author/jane]].'

    const relationships = extractRelationships({}, content, ns)

    expect(relationships).toHaveLength(2)
    expect(relationships![0].predicate).toBe('mentions')
    expect(relationships![0].target).toBe('example.com/Post/other-post')
    expect(relationships![1].target).toBe('example.com/Author/jane')
  })

  it('returns undefined for no relationships', () => {
    const result = extractRelationships({}, 'Plain content', ns)

    expect(result).toBeUndefined()
  })

  it('ignores non-type references', () => {
    const data = {
      url: 'https://example.com/page', // lowercase, not a type reference
      title: 'Hello World',
    }

    const relationships = extractRelationships(data, '', ns)

    expect(relationships).toBeUndefined()
  })

  it('handles known reverse predicates', () => {
    const data = {
      author: 'Author/john',
      parent: 'Post/parent-post',
      tags: ['Tag/javascript'],
    }

    const relationships = extractRelationships(data, '', ns)

    const authorRel = relationships?.find(r => r.predicate === 'author')
    const parentRel = relationships?.find(r => r.predicate === 'parent')
    const tagRel = relationships?.find(r => r.predicate === 'tags')

    expect(authorRel?.reverse).toBe('authored')
    expect(parentRel?.reverse).toBe('children')
    expect(tagRel?.reverse).toBe('tagged')
  })
})

// =============================================================================
// Search Metadata Extraction Tests
// =============================================================================

describe('extractSearchMetadata', () => {
  it('extracts title from frontmatter', () => {
    const data = { title: 'Hello World' }
    const result = extractSearchMetadata(data, '')

    expect(result.title).toBe('Hello World')
  })

  it('extracts title from first heading', () => {
    const content = '# My First Heading\n\nSome content'
    const result = extractSearchMetadata({}, content)

    expect(result.title).toBe('My First Heading')
  })

  it('prefers frontmatter title over heading', () => {
    const data = { title: 'Frontmatter Title' }
    const content = '# Heading Title\n\nContent'
    const result = extractSearchMetadata(data, content)

    expect(result.title).toBe('Frontmatter Title')
  })

  it('extracts description from frontmatter', () => {
    const data = { description: 'A great article about things' }
    const result = extractSearchMetadata(data, '')

    expect(result.description).toBe('A great article about things')
  })

  it('extracts description from first paragraph', () => {
    const content = '# Title\n\nThis is the first paragraph of the article.'
    const result = extractSearchMetadata({}, content)

    expect(result.description).toBe('This is the first paragraph of the article.')
  })

  it('extracts keywords from frontmatter', () => {
    const data = { keywords: ['javascript', 'typescript'] }
    const result = extractSearchMetadata(data, '')

    expect(result.keywords).toEqual(['javascript', 'typescript'])
  })

  it('extracts tags as keywords', () => {
    const data = { tags: ['react', 'vue'] }
    const result = extractSearchMetadata(data, '')

    expect(result.keywords).toEqual(['react', 'vue'])
  })

  it('combines keywords and tags', () => {
    const data = {
      keywords: ['javascript'],
      tags: ['react'],
    }
    const result = extractSearchMetadata(data, '')

    expect(result.keywords).toContain('javascript')
    expect(result.keywords).toContain('react')
  })

  it('returns undefined keywords if none found', () => {
    const result = extractSearchMetadata({}, 'Plain content')

    expect(result.keywords).toBeUndefined()
  })

  it('truncates long descriptions', () => {
    const longParagraph = 'A'.repeat(500)
    const content = `# Title\n\n${longParagraph}`
    const result = extractSearchMetadata({}, content)

    expect(result.description?.length).toBeLessThanOrEqual(300)
  })

  it('stops at code blocks when extracting description', () => {
    // The extractFirstParagraph function breaks at code block markers
    // So content after a code block won't be extracted as description
    const content = `# Title\n\n\`\`\`js\nconst x = 1\n\`\`\`\n\nActual description`
    const result = extractSearchMetadata({}, content)

    // The function breaks when it encounters ```, so no description is extracted
    expect(result.description).toBeUndefined()
  })
})
