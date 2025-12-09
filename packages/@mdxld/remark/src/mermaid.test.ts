import { describe, it, expect } from 'vitest'
import {
  parseMermaid,
  isMermaidLanguage,
  extractMermaidDiagrams,
  validateMermaid,
} from './mermaid.js'

describe('parseMermaid', () => {
  describe('flowchart parsing', () => {
    it('should detect flowchart type', () => {
      const ast = parseMermaid(`flowchart TD
        A --> B
      `)

      expect(ast.type).toBe('flowchart')
      expect(ast.direction).toBe('TD')
    })

    it('should parse graph as flowchart', () => {
      const ast = parseMermaid(`graph LR
        A --> B
      `)

      expect(ast.type).toBe('flowchart')
      expect(ast.direction).toBe('LR')
    })

    it('should parse nodes with labels', () => {
      const ast = parseMermaid(`flowchart TD
        A[Start] --> B
        B --> C[End]
      `)

      expect(ast.nodes).toBeDefined()
      expect(ast.nodes!.find((n) => n.id === 'A')).toEqual({
        id: 'A',
        label: 'Start',
        shape: 'rectangle',
      })
    })

    it('should parse different node shapes', () => {
      const ast = parseMermaid(`flowchart TD
        A[Rectangle]
        B(Rounded)
        C{Diamond}
      `)

      const shapes = ast.nodes!.map((n) => ({ id: n.id, shape: n.shape }))
      expect(shapes).toContainEqual({ id: 'A', shape: 'rectangle' })
      expect(shapes).toContainEqual({ id: 'B', shape: 'rounded' })
      expect(shapes).toContainEqual({ id: 'C', shape: 'rhombus' })
    })

    it('should parse edges', () => {
      const ast = parseMermaid(`flowchart TD
        A --> B
        B --- C
        C -.-> D
        D ==> E
      `)

      expect(ast.edges).toHaveLength(4)
      expect(ast.edges![0]).toMatchObject({ from: 'A', to: 'B', type: 'arrow' })
      expect(ast.edges![1]).toMatchObject({ from: 'B', to: 'C', type: 'open' })
      expect(ast.edges![2]).toMatchObject({ from: 'C', to: 'D', type: 'dotted' })
      expect(ast.edges![3]).toMatchObject({ from: 'D', to: 'E', type: 'thick' })
    })

    it('should parse edge labels', () => {
      const ast = parseMermaid(`flowchart TD
        A --> |Yes| B
        B --> |No| C
      `)

      expect(ast.edges![0]!.label).toBe('Yes')
      expect(ast.edges![1]!.label).toBe('No')
    })
  })

  describe('sequence diagram parsing', () => {
    it('should detect sequence diagram type', () => {
      const ast = parseMermaid(`sequenceDiagram
        Alice->>Bob: Hello
      `)

      expect(ast.type).toBe('sequenceDiagram')
    })

    it('should parse participants', () => {
      const ast = parseMermaid(`sequenceDiagram
        participant A as Alice
        actor B as Bob
        A->>B: Hello
      `)

      expect(ast.participants).toHaveLength(2)
      expect(ast.participants![0]).toMatchObject({
        id: 'A',
        alias: 'Alice',
        type: 'participant',
      })
      expect(ast.participants![1]).toMatchObject({
        id: 'B',
        alias: 'Bob',
        type: 'actor',
      })
    })

    it('should parse messages', () => {
      const ast = parseMermaid(`sequenceDiagram
        Alice->>Bob: Hello
        Bob-->>Alice: Hi
        Alice->Bob: Sync call
        Bob-->Alice: Sync response
      `)

      expect(ast.messages).toHaveLength(4)
      expect(ast.messages![0]).toMatchObject({
        from: 'Alice',
        to: 'Bob',
        message: 'Hello',
        type: 'solid-arrow',
      })
      expect(ast.messages![1]).toMatchObject({
        type: 'dotted-arrow',
      })
    })

    it('should auto-create participants from messages', () => {
      const ast = parseMermaid(`sequenceDiagram
        Alice->>Bob: Hello
      `)

      expect(ast.participants).toHaveLength(2)
      expect(ast.participants!.map((p) => p.id)).toEqual(['Alice', 'Bob'])
    })
  })

  describe('class diagram parsing', () => {
    it('should detect class diagram type', () => {
      const ast = parseMermaid(`classDiagram
        class Animal
      `)

      expect(ast.type).toBe('classDiagram')
    })

    it('should parse class declarations', () => {
      const ast = parseMermaid(`classDiagram
        class Animal {
          +String name
          +int age
          +makeSound()
        }
      `)

      expect(ast.classes).toHaveLength(1)
      expect(ast.classes![0]!.name).toBe('Animal')
      expect(ast.classes![0]!.members).toHaveLength(2)
      expect(ast.classes![0]!.methods).toHaveLength(1)
    })

    it('should parse relationships', () => {
      const ast = parseMermaid(`classDiagram
        Animal <|-- Dog
      `)

      expect(ast.relationships).toHaveLength(1)
      expect(ast.relationships![0]).toMatchObject({
        from: 'Animal',
        to: 'Dog',
        type: 'inheritance',
      })
    })
  })

  describe('other diagram types', () => {
    it('should detect gantt charts', () => {
      const ast = parseMermaid(`gantt
        title A Gantt Diagram
        section Section
        A task :a1, 2024-01-01, 30d
      `)

      expect(ast.type).toBe('gantt')
    })

    it('should detect pie charts', () => {
      const ast = parseMermaid(`pie
        title Browser Market Share
        "Chrome" : 65
        "Firefox" : 15
      `)

      expect(ast.type).toBe('pie')
    })

    it('should detect state diagrams', () => {
      const ast = parseMermaid(`stateDiagram-v2
        [*] --> Still
        Still --> Moving
      `)

      expect(ast.type).toBe('stateDiagram')
    })

    it('should return unknown for invalid input', () => {
      const ast = parseMermaid(`not a valid diagram`)

      expect(ast.type).toBe('unknown')
    })
  })

  describe('title parsing', () => {
    it('should parse title from frontmatter', () => {
      const ast = parseMermaid(`---
title: My Diagram
---
flowchart TD
  A --> B
`)

      expect(ast.title).toBe('My Diagram')
    })
  })
})

describe('isMermaidLanguage', () => {
  it('should match mermaid', () => {
    expect(isMermaidLanguage('mermaid')).toBe(true)
    expect(isMermaidLanguage('Mermaid')).toBe(true)
    expect(isMermaidLanguage('MERMAID')).toBe(true)
  })

  it('should not match other languages', () => {
    expect(isMermaidLanguage('javascript')).toBe(false)
    expect(isMermaidLanguage('merm')).toBe(false)
    expect(isMermaidLanguage(null)).toBe(false)
    expect(isMermaidLanguage(undefined)).toBe(false)
  })
})

describe('extractMermaidDiagrams', () => {
  it('should extract mermaid code blocks from content', () => {
    const content = `
# My Document

\`\`\`mermaid
flowchart TD
  A --> B
\`\`\`

Some text

\`\`\`mermaid
sequenceDiagram
  Alice->>Bob: Hello
\`\`\`
`

    const diagrams = extractMermaidDiagrams(content)

    expect(diagrams).toHaveLength(2)
    expect(diagrams[0]!.ast.type).toBe('flowchart')
    expect(diagrams[1]!.ast.type).toBe('sequenceDiagram')
  })

  it('should include position information', () => {
    const content = `\`\`\`mermaid
flowchart TD
  A --> B
\`\`\``

    const diagrams = extractMermaidDiagrams(content)

    expect(diagrams[0]!.position.start).toBe(0)
    expect(diagrams[0]!.position.end).toBe(content.length)
  })
})

describe('validateMermaid', () => {
  it('should report unknown diagram type', () => {
    const ast = parseMermaid('invalid diagram')
    const errors = validateMermaid(ast)

    expect(errors).toContain('Unable to detect diagram type')
  })

  it('should report orphan nodes in flowcharts', () => {
    const ast = parseMermaid(`flowchart TD
      A --> B
      C[Orphan]
    `)
    const errors = validateMermaid(ast)

    expect(errors.some((e) => e.includes("'C'"))).toBe(true)
  })

  it('should not report orphans for single-node diagrams', () => {
    const ast = parseMermaid(`flowchart TD
      A[Single Node]
    `)
    const errors = validateMermaid(ast)

    expect(errors.filter((e) => e.includes('not connected'))).toHaveLength(0)
  })

  it('should return empty array for valid diagrams', () => {
    const ast = parseMermaid(`flowchart TD
      A --> B --> C
    `)
    const errors = validateMermaid(ast)

    expect(errors).toHaveLength(0)
  })
})
