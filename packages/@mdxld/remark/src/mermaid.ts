/**
 * @mdxld/remark/mermaid - Mermaid diagram AST parsing
 *
 * Parses mermaid code blocks into structured AST for:
 * 1. Diagram type detection
 * 2. Node/edge extraction for flowcharts, sequence diagrams, etc.
 * 3. Validation and transformation
 *
 * @packageDocumentation
 */

/**
 * Supported mermaid diagram types
 */
export type MermaidDiagramType =
  | 'flowchart'
  | 'sequenceDiagram'
  | 'classDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'gantt'
  | 'pie'
  | 'mindmap'
  | 'timeline'
  | 'gitGraph'
  | 'journey'
  | 'quadrantChart'
  | 'requirementDiagram'
  | 'c4Context'
  | 'unknown'

/**
 * Node in a flowchart/graph
 */
export interface MermaidNode {
  id: string
  label?: string
  shape?: 'rectangle' | 'rounded' | 'stadium' | 'subroutine' | 'cylinder' | 'circle' | 'asymmetric' | 'rhombus' | 'hexagon' | 'parallelogram' | 'trapezoid' | 'double-circle'
}

/**
 * Edge/link between nodes
 */
export interface MermaidEdge {
  from: string
  to: string
  label?: string
  type?: 'arrow' | 'open' | 'dotted' | 'thick' | 'invisible'
  direction?: 'forward' | 'backward' | 'both'
}

/**
 * Participant in a sequence diagram
 */
export interface MermaidParticipant {
  id: string
  alias?: string
  type?: 'participant' | 'actor'
}

/**
 * Message in a sequence diagram
 */
export interface MermaidMessage {
  from: string
  to: string
  message: string
  type?: 'solid' | 'dotted' | 'solid-arrow' | 'dotted-arrow' | 'solid-cross' | 'dotted-cross' | 'solid-open' | 'dotted-open'
  activate?: boolean
  deactivate?: boolean
}

/**
 * Class in a class diagram
 */
export interface MermaidClass {
  name: string
  members: Array<{
    name: string
    type?: string
    visibility?: '+' | '-' | '#' | '~'
  }>
  methods: Array<{
    name: string
    parameters?: string
    returnType?: string
    visibility?: '+' | '-' | '#' | '~'
  }>
  annotations?: string[]
}

/**
 * Relationship in a class diagram
 */
export interface MermaidRelationship {
  from: string
  to: string
  type: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'dependency' | 'realization'
  label?: string
  cardinality?: { from?: string; to?: string }
}

/**
 * Parsed mermaid diagram
 */
export interface MermaidAST {
  /** Detected diagram type */
  type: MermaidDiagramType
  /** Original source code */
  source: string
  /** Direction for flowcharts (TB, TD, BT, RL, LR) */
  direction?: 'TB' | 'TD' | 'BT' | 'RL' | 'LR'
  /** Title if specified */
  title?: string
  /** Nodes (flowcharts, state diagrams, etc.) */
  nodes?: MermaidNode[]
  /** Edges between nodes */
  edges?: MermaidEdge[]
  /** Participants (sequence diagrams) */
  participants?: MermaidParticipant[]
  /** Messages (sequence diagrams) */
  messages?: MermaidMessage[]
  /** Classes (class diagrams) */
  classes?: MermaidClass[]
  /** Relationships (class/ER diagrams) */
  relationships?: MermaidRelationship[]
  /** Raw sections/blocks */
  sections?: Array<{ name: string; content: string }>
  /** Parse errors/warnings */
  errors?: string[]
}

/**
 * Detect the diagram type from mermaid source
 */
function detectDiagramType(source: string): MermaidDiagramType {
  const firstLine = source.trim().split('\n')[0]?.trim().toLowerCase() ?? ''

  if (/^flowchart|^graph/.test(firstLine)) return 'flowchart'
  if (/^sequencediagram/.test(firstLine)) return 'sequenceDiagram'
  if (/^classdiagram/.test(firstLine)) return 'classDiagram'
  if (/^statediagram/.test(firstLine)) return 'stateDiagram'
  if (/^erdiagram/.test(firstLine)) return 'erDiagram'
  if (/^gantt/.test(firstLine)) return 'gantt'
  if (/^pie/.test(firstLine)) return 'pie'
  if (/^mindmap/.test(firstLine)) return 'mindmap'
  if (/^timeline/.test(firstLine)) return 'timeline'
  if (/^gitgraph/.test(firstLine)) return 'gitGraph'
  if (/^journey/.test(firstLine)) return 'journey'
  if (/^quadrantchart/.test(firstLine)) return 'quadrantChart'
  if (/^requirementdiagram/.test(firstLine)) return 'requirementDiagram'
  if (/^c4context/.test(firstLine)) return 'c4Context'

  return 'unknown'
}

/**
 * Parse flowchart direction
 */
function parseFlowchartDirection(source: string): 'TB' | 'TD' | 'BT' | 'RL' | 'LR' | undefined {
  const match = source.match(/^(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)/im)
  return match?.[1] as 'TB' | 'TD' | 'BT' | 'RL' | 'LR' | undefined
}

/**
 * Parse flowchart nodes and edges
 */
function parseFlowchart(source: string): { nodes: MermaidNode[]; edges: MermaidEdge[] } {
  const nodes: MermaidNode[] = []
  const edges: MermaidEdge[] = []
  const seenNodes = new Set<string>()

  // Remove the diagram declaration line
  const lines = source.split('\n').slice(1)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    // Parse node definitions with labels
    // A[Label] or A(Label) or A{Label} etc.
    const nodeDefMatch = trimmed.match(/^(\w+)(\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\}|>([^]]+)\]|\[\[([^\]]+)\]\]|\(\(([^)]+)\)\)|\[\(([^)]+)\)\])/)
    if (nodeDefMatch) {
      const id = nodeDefMatch[1]!
      const label = nodeDefMatch[3] ?? nodeDefMatch[4] ?? nodeDefMatch[5] ?? nodeDefMatch[6] ?? nodeDefMatch[7] ?? nodeDefMatch[8] ?? nodeDefMatch[9]
      if (!seenNodes.has(id)) {
        seenNodes.add(id)
        nodes.push({
          id,
          label,
          shape: detectNodeShape(nodeDefMatch[0]),
        })
      }
    }

    // Parse edges: A --> B, A --> |label| B, A --text--> B
    const edgeMatch = trimmed.match(/(\w+)\s*(-->|---|-\.-|==>|-.->?|--[ox]|--)\s*(?:\|([^|]+)\|)?\s*(\w+)/)
    if (edgeMatch) {
      const [, from, arrowType, label, to] = edgeMatch

      // Add nodes if not seen
      if (from && !seenNodes.has(from)) {
        seenNodes.add(from)
        nodes.push({ id: from })
      }
      if (to && !seenNodes.has(to)) {
        seenNodes.add(to)
        nodes.push({ id: to })
      }

      edges.push({
        from: from!,
        to: to!,
        label,
        type: detectEdgeType(arrowType!),
      })
    }
  }

  return { nodes, edges }
}

/**
 * Detect node shape from syntax
 */
function detectNodeShape(syntax: string): MermaidNode['shape'] {
  // Order matters - check more specific patterns first
  if (/\[\[.*\]\]/.test(syntax)) return 'subroutine'
  if (/\(\(.*\)\)/.test(syntax)) return 'circle'
  if (/\[\(.*\)\]/.test(syntax)) return 'cylinder'
  if (/\(\[.*\]\)/.test(syntax)) return 'stadium'
  if (/\{.*\}/.test(syntax)) return 'rhombus'
  if (/\(.*\)/.test(syntax)) return 'rounded'
  if (/>.*\]/.test(syntax)) return 'asymmetric'
  if (/\[.*\]/.test(syntax)) return 'rectangle'
  return 'rectangle'
}

/**
 * Detect edge type from arrow syntax
 */
function detectEdgeType(arrow: string): MermaidEdge['type'] {
  if (arrow.includes('-.') || arrow.includes('-.-')) return 'dotted'
  if (arrow.includes('=')) return 'thick'
  if (arrow === '---') return 'open'
  if (arrow.includes('~~~')) return 'invisible'
  return 'arrow'
}

/**
 * Parse sequence diagram
 */
function parseSequenceDiagram(source: string): { participants: MermaidParticipant[]; messages: MermaidMessage[] } {
  const participants: MermaidParticipant[] = []
  const messages: MermaidMessage[] = []
  const seenParticipants = new Set<string>()

  const lines = source.split('\n').slice(1)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    // Parse participant declarations
    const participantMatch = trimmed.match(/^(participant|actor)\s+(\w+)(?:\s+as\s+(.+))?/)
    if (participantMatch) {
      const [, type, id, alias] = participantMatch
      if (!seenParticipants.has(id!)) {
        seenParticipants.add(id!)
        participants.push({
          id: id!,
          alias,
          type: type as 'participant' | 'actor',
        })
      }
      continue
    }

    // Parse messages
    const messageMatch = trimmed.match(/(\w+)\s*(->>|-->>|->|-->|-x|--x|-\)|--\))\s*(\w+)\s*:\s*(.+)/)
    if (messageMatch) {
      const [, from, arrow, to, message] = messageMatch

      // Add participants if not seen
      if (from && !seenParticipants.has(from)) {
        seenParticipants.add(from)
        participants.push({ id: from })
      }
      if (to && !seenParticipants.has(to)) {
        seenParticipants.add(to)
        participants.push({ id: to })
      }

      messages.push({
        from: from!,
        to: to!,
        message: message!,
        type: detectMessageType(arrow!),
      })
    }
  }

  return { participants, messages }
}

/**
 * Detect message type from arrow
 */
function detectMessageType(arrow: string): MermaidMessage['type'] {
  if (arrow === '->>') return 'solid-arrow'
  if (arrow === '-->>') return 'dotted-arrow'
  if (arrow === '->') return 'solid'
  if (arrow === '-->') return 'dotted'
  if (arrow === '-x') return 'solid-cross'
  if (arrow === '--x') return 'dotted-cross'
  if (arrow === '-)') return 'solid-open'
  if (arrow === '--)') return 'dotted-open'
  return 'solid'
}

/**
 * Parse class diagram
 */
function parseClassDiagram(source: string): { classes: MermaidClass[]; relationships: MermaidRelationship[] } {
  const classes: MermaidClass[] = []
  const relationships: MermaidRelationship[] = []
  const classMap = new Map<string, MermaidClass>()

  const lines = source.split('\n').slice(1)
  let currentClass: MermaidClass | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    // Parse class declaration
    const classMatch = trimmed.match(/^class\s+(\w+)(?:\s*\{)?/)
    if (classMatch) {
      currentClass = {
        name: classMatch[1]!,
        members: [],
        methods: [],
      }
      classMap.set(currentClass.name, currentClass)
      classes.push(currentClass)
      continue
    }

    // End of class block
    if (trimmed === '}') {
      currentClass = null
      continue
    }

    // Parse class members (inside a class block)
    if (currentClass && !trimmed.includes('<|') && !trimmed.includes('--')) {
      const memberMatch = trimmed.match(/^([+\-#~])?\s*(\w+)\s*(\w+)?(?:\(([^)]*)\))?(?:\s*(\w+))?/)
      if (memberMatch) {
        const [, visibility, typeOrName, nameOrParams, params, returnType] = memberMatch

        if (params !== undefined || nameOrParams?.includes('(')) {
          // It's a method
          currentClass.methods.push({
            name: typeOrName!,
            parameters: params ?? nameOrParams?.replace(/[()]/g, ''),
            returnType,
            visibility: visibility as '+' | '-' | '#' | '~',
          })
        } else if (nameOrParams) {
          // It's a member
          currentClass.members.push({
            name: nameOrParams,
            type: typeOrName,
            visibility: visibility as '+' | '-' | '#' | '~',
          })
        }
      }
    }

    // Parse relationships - match various arrow types
    const relMatch = trimmed.match(/(\w+)\s*(<\|--|--\*|--o|<--|-->|\.\.>|<\.\.|\|\|--|--\|\||\*--|\*--|o--)\s*(\w+)(?:\s*:\s*(.+))?/)
    if (relMatch) {
      const [, from, relType, to, label] = relMatch
      relationships.push({
        from: from!,
        to: to!,
        type: detectRelationshipType(relType!),
        label,
      })
    } else {
      // Try alternative relationship format: A <|-- B or A *-- B
      const altMatch = trimmed.match(/(\w+)\s+(<\|--|--\*|--o|<--|-->|\*--|o--)\s+(\w+)/)
      if (altMatch) {
        const [, from, relType, to] = altMatch
        relationships.push({
          from: from!,
          to: to!,
          type: detectRelationshipType(relType!),
        })
      }
    }
  }

  return { classes, relationships }
}

/**
 * Detect relationship type
 */
function detectRelationshipType(rel: string): MermaidRelationship['type'] {
  if (rel.includes('<|') || rel.includes('|>')) return 'inheritance'
  if (rel.includes('*--') || rel.includes('--*')) return 'composition'
  if (rel.includes('o--') || rel.includes('--o')) return 'aggregation'
  if (rel.includes('..')) return 'dependency'
  if (rel.includes('||')) return 'realization'
  return 'association'
}

/**
 * Parse a mermaid diagram into an AST
 *
 * @param source - Mermaid diagram source code
 * @returns Parsed AST with diagram type, nodes, edges, etc.
 *
 * @example
 * ```ts
 * import { parseMermaid } from '@mdxld/remark/mermaid'
 *
 * const ast = parseMermaid(`
 * flowchart TD
 *   A[Start] --> B{Decision}
 *   B -->|Yes| C[Do something]
 *   B -->|No| D[Do something else]
 * `)
 *
 * // ast.type === 'flowchart'
 * // ast.nodes[0] === { id: 'A', label: 'Start', shape: 'rectangle' }
 * // ast.edges[0] === { from: 'A', to: 'B', type: 'arrow' }
 * ```
 */
export function parseMermaid(source: string): MermaidAST {
  const type = detectDiagramType(source)
  const errors: string[] = []

  const ast: MermaidAST = {
    type,
    source,
    errors,
  }

  try {
    switch (type) {
      case 'flowchart': {
        ast.direction = parseFlowchartDirection(source)
        const { nodes, edges } = parseFlowchart(source)
        ast.nodes = nodes
        ast.edges = edges
        break
      }
      case 'sequenceDiagram': {
        const { participants, messages } = parseSequenceDiagram(source)
        ast.participants = participants
        ast.messages = messages
        break
      }
      case 'classDiagram': {
        const { classes, relationships } = parseClassDiagram(source)
        ast.classes = classes
        ast.relationships = relationships
        break
      }
      // Add more diagram type parsers as needed
      default:
        // For unsupported types, just store the source
        break
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  // Parse title if present
  const titleMatch = source.match(/---\s*title:\s*(.+)\s*---/i)
  if (titleMatch) {
    ast.title = titleMatch[1]?.trim()
  }

  return ast
}

/**
 * Check if a code block language is mermaid
 */
export function isMermaidLanguage(lang: string | undefined | null): boolean {
  if (!lang) return false
  return /^mermaid$/i.test(lang.trim())
}

/**
 * Extract all mermaid code blocks from MDX/markdown content
 *
 * @param content - MDX or markdown content
 * @returns Array of mermaid diagrams with their ASTs
 */
export function extractMermaidDiagrams(content: string): Array<{
  source: string
  ast: MermaidAST
  position: { start: number; end: number }
}> {
  const diagrams: Array<{
    source: string
    ast: MermaidAST
    position: { start: number; end: number }
  }> = []

  // Match fenced code blocks with mermaid language
  const codeBlockRegex = /```mermaid\s*\n([\s\S]*?)```/gi
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const source = match[1]!.trim()
    diagrams.push({
      source,
      ast: parseMermaid(source),
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    })
  }

  return diagrams
}

/**
 * Validate a mermaid diagram
 *
 * @param ast - Parsed mermaid AST
 * @returns Array of validation errors (empty if valid)
 */
export function validateMermaid(ast: MermaidAST): string[] {
  const errors: string[] = [...(ast.errors ?? [])]

  if (ast.type === 'unknown') {
    errors.push('Unable to detect diagram type')
  }

  if (ast.type === 'flowchart') {
    // Check for orphan nodes
    const connectedNodes = new Set<string>()
    for (const edge of ast.edges ?? []) {
      connectedNodes.add(edge.from)
      connectedNodes.add(edge.to)
    }
    for (const node of ast.nodes ?? []) {
      if (!connectedNodes.has(node.id) && (ast.nodes?.length ?? 0) > 1) {
        errors.push(`Node '${node.id}' is not connected to any other node`)
      }
    }
  }

  if (ast.type === 'sequenceDiagram') {
    // Check for messages with unknown participants
    const participantIds = new Set((ast.participants ?? []).map((p) => p.id))
    for (const message of ast.messages ?? []) {
      if (!participantIds.has(message.from)) {
        errors.push(`Unknown participant '${message.from}' in message`)
      }
      if (!participantIds.has(message.to)) {
        errors.push(`Unknown participant '${message.to}' in message`)
      }
    }
  }

  return errors
}
