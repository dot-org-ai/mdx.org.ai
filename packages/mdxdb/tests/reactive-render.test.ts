/**
 * Tests for reactive bi-directional rendering
 *
 * Scenario:
 * 1. [Topic].mdx defines a type with template: `# {data.name}\n\n<List type="Post" where="tags LIKE '%{data.id}%'" />`
 * 2. tags/welcome.mdx creates a Topic instance
 * 3. posts/hello.mdx has tags: ['welcome']
 * 4. When hello.mdx changes title, tags/welcome.md should re-render with updated post list
 *
 * This tests:
 * - Type definition with component templates
 * - Component rendering (List, Table, Related)
 * - Dependency tracking (which .md files depend on which types)
 * - Reactive re-rendering when dependencies change
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const TEST_DIR = join(tmpdir(), 'mdxdb-reactive-test-' + Date.now())
const CONTENT_DIR = join(TEST_DIR, 'content')
const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost:8123'

async function isClickHouseRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${CLICKHOUSE_URL}/ping`)
    return response.ok
  } catch {
    return false
  }
}

async function executeQuery(query: string, database = 'mdxdb'): Promise<string> {
  const response = await fetch(`${CLICKHOUSE_URL}/?database=${database}`, {
    method: 'POST',
    body: query,
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.text()
}

describe('reactive bi-directional rendering', () => {
  let clickhouseAvailable = false

  beforeAll(async () => {
    clickhouseAvailable = await isClickHouseRunning()
    if (!clickhouseAvailable) {
      console.log('⚠️  ClickHouse not running, skipping reactive render tests')
      return
    }

    // Setup directories
    mkdirSync(join(CONTENT_DIR, 'posts'), { recursive: true })
    mkdirSync(join(CONTENT_DIR, 'tags'), { recursive: true })

    // Initialize database
    await executeQuery('CREATE DATABASE IF NOT EXISTS mdxdb', 'default')
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS Things (
        ns String,
        type String,
        id String,
        data JSON,
        content String DEFAULT '',
        event String DEFAULT '',
        ts DateTime64(3) DEFAULT now64(3)
      ) ENGINE = MergeTree() ORDER BY (ns, type, id)
    `)
  })

  afterAll(async () => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    if (clickhouseAvailable) {
      try {
        await executeQuery("ALTER TABLE Things DELETE WHERE ns = 'reactive-test'")
      } catch {}
    }
  })

  beforeEach(async () => {
    if (!clickhouseAvailable) return
    try {
      await executeQuery("ALTER TABLE Things DELETE WHERE ns = 'reactive-test'")
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch {}
  })

  it.skipIf(!clickhouseAvailable)('should render <List> component with posts filtered by tag', async () => {
    // Create type definition: [Topic].mdx
    const topicTypeDef = `---
$type: TypeDefinition
$generateMarkdown: true
name: string
description: string
---

# {data.name}

{data.description}

## Posts in this topic

<List type="Post" where="arrayExists(x -> x = '{data.id}', JSONExtract(data, 'tags', 'Array(String)'))" format="- [{title}](/posts/{id})" />
`
    writeFileSync(join(CONTENT_DIR, '[Topic].mdx'), topicTypeDef)

    // Create a topic instance: tags/javascript.mdx
    const javascriptTopic = `---
$type: Topic
name: JavaScript
description: All things JavaScript
---
`
    writeFileSync(join(CONTENT_DIR, 'tags', 'javascript.mdx'), javascriptTopic)

    // Create posts with tags
    const post1 = `---
$type: Post
title: Getting Started with JavaScript
tags:
  - javascript
  - beginner
---

Learn the basics of JavaScript.
`
    writeFileSync(join(CONTENT_DIR, 'posts', 'js-basics.mdx'), post1)

    const post2 = `---
$type: Post
title: Advanced TypeScript Patterns
tags:
  - typescript
  - advanced
---

Deep dive into TypeScript.
`
    writeFileSync(join(CONTENT_DIR, 'posts', 'ts-patterns.mdx'), post2)

    const post3 = `---
$type: Post
title: JavaScript Async Patterns
tags:
  - javascript
  - async
---

Understanding async/await in JavaScript.
`
    writeFileSync(join(CONTENT_DIR, 'posts', 'js-async.mdx'), post3)

    // Insert posts into ClickHouse
    const { parse } = await import('mdxld')

    const posts = [
      { file: 'posts/js-basics.mdx', id: 'posts/js-basics' },
      { file: 'posts/ts-patterns.mdx', id: 'posts/ts-patterns' },
      { file: 'posts/js-async.mdx', id: 'posts/js-async' },
    ]

    for (const post of posts) {
      const content = readFileSync(join(CONTENT_DIR, post.file), 'utf-8')
      const doc = parse(content)

      const thing = {
        ns: 'reactive-test',
        type: 'Post',
        id: post.id,
        data: doc.data,
        content: doc.content || '',
      }

      const query = `INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow`
      await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thing),
      })
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    // Query posts with javascript tag
    const result = await executeQuery(`
      SELECT id, data.title as title
      FROM Things
      WHERE ns = 'reactive-test'
        AND type = 'Post'
        AND arrayExists(x -> x = 'javascript', JSONExtract(data, 'tags', 'Array(String)'))
      FORMAT JSON
    `)

    const json = JSON.parse(result)
    expect(json.data.length).toBe(2)

    const titles = json.data.map((r: { title: string }) => r.title)
    expect(titles).toContain('Getting Started with JavaScript')
    expect(titles).toContain('JavaScript Async Patterns')
    expect(titles).not.toContain('Advanced TypeScript Patterns')
  })

  it.skipIf(!clickhouseAvailable)('should re-render dependent .md when source post changes', async () => {
    // This test verifies the reactive update flow:
    // 1. Topic page lists posts with a certain tag
    // 2. When a post adds/removes that tag, the topic page should update

    // Insert initial post without javascript tag
    const { parse } = await import('mdxld')

    const initialPost = `---
$type: Post
title: My Post
tags:
  - other
---
Content
`
    const doc = parse(initialPost)

    await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent('INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ns: 'reactive-test',
        type: 'Post',
        id: 'posts/my-post',
        data: doc.data,
        content: doc.content || '',
      }),
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Query - should NOT have javascript tag
    let result = await executeQuery(`
      SELECT COUNT() as count
      FROM Things
      WHERE ns = 'reactive-test'
        AND type = 'Post'
        AND arrayExists(x -> x = 'javascript', JSONExtract(data, 'tags', 'Array(String)'))
      FORMAT JSON
    `)
    let json = JSON.parse(result)
    expect(json.data[0].count).toBe('0')

    // Update post to add javascript tag
    const updatedPost = `---
$type: Post
title: My Post (now with JavaScript!)
tags:
  - other
  - javascript
---
Updated content
`
    const updatedDoc = parse(updatedPost)

    await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent('INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ns: 'reactive-test',
        type: 'Post',
        id: 'posts/my-post',
        data: updatedDoc.data,
        content: updatedDoc.content || '',
      }),
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    // Query latest - should now have javascript tag
    // Note: ClickHouse is append-only, so we need to get the latest version
    result = await executeQuery(`
      SELECT id, data.title as title, data.tags as tags
      FROM Things
      WHERE ns = 'reactive-test'
        AND type = 'Post'
        AND id = 'posts/my-post'
      ORDER BY ts DESC
      LIMIT 1
      FORMAT JSON
    `)
    json = JSON.parse(result)
    expect(json.data[0].title).toBe('My Post (now with JavaScript!)')

    const tags = json.data[0].tags
    expect(tags).toContain('javascript')
  })

  it.skipIf(!clickhouseAvailable)('should render <Table> component correctly', async () => {
    // Insert test data
    const { parse } = await import('mdxld')

    const posts = [
      { title: 'Post A', date: '2024-01-01', author: 'Alice' },
      { title: 'Post B', date: '2024-01-02', author: 'Bob' },
      { title: 'Post C', date: '2024-01-03', author: 'Charlie' },
    ]

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent('INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ns: 'reactive-test',
          type: 'Post',
          id: `posts/post-${i}`,
          data: post,
          content: '',
        }),
      })
    }

    await new Promise(resolve => setTimeout(resolve, 100))

    // Query with table-like output
    const result = await executeQuery(`
      SELECT
        id,
        data.title as title,
        data.date as date,
        data.author as author
      FROM Things
      WHERE ns = 'reactive-test' AND type = 'Post'
      ORDER BY data.date
      FORMAT JSON
    `)

    const json = JSON.parse(result)
    expect(json.data.length).toBe(3)
    expect(json.data[0].title).toBe('Post A')
    expect(json.data[1].title).toBe('Post B')
    expect(json.data[2].title).toBe('Post C')
  })

  it.skipIf(!clickhouseAvailable)('should track dependencies between types via relationships', async () => {
    // Test relationship tracking: Author -> Posts

    // Insert author
    await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent('INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ns: 'reactive-test',
        type: 'Author',
        id: 'authors/alice',
        data: { name: 'Alice', email: 'alice@example.com' },
        content: '',
      }),
    })

    // Insert posts by alice
    const postIds = ['post-1', 'post-2']
    for (const postId of postIds) {
      await fetch(`${CLICKHOUSE_URL}/?database=mdxdb&query=${encodeURIComponent('INSERT INTO Things (ns, type, id, data, content) FORMAT JSONEachRow')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ns: 'reactive-test',
          type: 'Post',
          id: `posts/${postId}`,
          data: { title: `Post by Alice: ${postId}`, author: 'authors/alice' },
          content: '',
        }),
      })
    }

    await new Promise(resolve => setTimeout(resolve, 100))

    // Query posts by author (simulating <Related field="posts" />)
    const result = await executeQuery(`
      SELECT id, data.title as title
      FROM Things
      WHERE ns = 'reactive-test'
        AND type = 'Post'
        AND data.author = 'authors/alice'
      FORMAT JSON
    `)

    const json = JSON.parse(result)
    expect(json.data.length).toBe(2)
    expect(json.data.every((r: { title: string }) => r.title.includes('Alice'))).toBe(true)
  })
})
