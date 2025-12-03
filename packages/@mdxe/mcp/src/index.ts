/**
 * @mdxe/mcp - Model Context Protocol server for MDX tools and resources
 *
 * Supports multiple transports:
 * - stdio: For Node.js/Bun CLI integration
 * - http: For web-based integration (Node, Bun, Workers)
 */

export interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}

// MCP Types
export interface MCPTool {
  name: string
  description: string
  inputSchema: JSONSchema
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: MCPPromptArgument[]
}

export interface MCPPromptArgument {
  name: string
  description?: string
  required?: boolean
}

export interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  description?: string
  [key: string]: unknown
}

// Server options
export interface MCPServerOptions {
  /** Server name */
  name: string
  /** Server version */
  version?: string
  /** MDX documents to expose as tools */
  tools?: MDXLDDocument[]
  /** MDX documents to expose as resources */
  resources?: MDXLDDocument[]
  /** MDX documents to expose as prompts */
  prompts?: MDXLDDocument[]
  /** Tool handlers */
  toolHandlers?: Record<string, (args: Record<string, unknown>) => Promise<unknown>>
  /** Transport type */
  transport?: 'stdio' | 'http'
  /** HTTP port (for http transport) */
  port?: number
}

/**
 * Create an MCP server from MDX documents
 */
export function createMCPServer(options: MCPServerOptions): MCPServer {
  return new MCPServer(options)
}

/**
 * MCP Server implementation
 */
export class MCPServer {
  private options: MCPServerOptions
  private tools: Map<string, MCPTool & { handler?: (args: Record<string, unknown>) => Promise<unknown> }> = new Map()
  private resources: Map<string, MCPResource & { document: MDXLDDocument }> = new Map()
  private prompts: Map<string, MCPPrompt & { document: MDXLDDocument }> = new Map()

  constructor(options: MCPServerOptions) {
    this.options = options

    // Register tools from MDX documents
    if (options.tools) {
      for (const doc of options.tools) {
        this.registerToolFromDocument(doc)
      }
    }

    // Register tool handlers
    if (options.toolHandlers) {
      for (const [name, handler] of Object.entries(options.toolHandlers)) {
        const tool = this.tools.get(name)
        if (tool) {
          tool.handler = handler
        }
      }
    }

    // Register resources from MDX documents
    if (options.resources) {
      for (const doc of options.resources) {
        this.registerResourceFromDocument(doc)
      }
    }

    // Register prompts from MDX documents
    if (options.prompts) {
      for (const doc of options.prompts) {
        this.registerPromptFromDocument(doc)
      }
    }
  }

  /**
   * Register a tool from an MDX document
   */
  private registerToolFromDocument(doc: MDXLDDocument): void {
    const name = (doc.data.name as string) || doc.id || 'anonymous-tool'
    const description = (doc.data.description as string) || doc.content.slice(0, 200)

    // Build JSON Schema from document parameters
    const inputSchema = buildSchemaFromDocument(doc)

    this.tools.set(name, {
      name,
      description,
      inputSchema,
    })
  }

  /**
   * Register a resource from an MDX document
   */
  private registerResourceFromDocument(doc: MDXLDDocument): void {
    const uri = doc.id || `resource://${doc.data.name || 'anonymous'}`
    const name = (doc.data.name as string) || doc.id || 'anonymous-resource'
    const description = doc.data.description as string | undefined
    const mimeType = (doc.data.mimeType as string) || 'text/markdown'

    this.resources.set(uri, {
      uri,
      name,
      description,
      mimeType,
      document: doc,
    })
  }

  /**
   * Register a prompt from an MDX document
   */
  private registerPromptFromDocument(doc: MDXLDDocument): void {
    const name = (doc.data.name as string) || doc.id || 'anonymous-prompt'
    const description = doc.data.description as string | undefined
    const args = doc.data.arguments as MCPPromptArgument[] | undefined

    this.prompts.set(name, {
      name,
      description,
      arguments: args,
      document: doc,
    })
  }

  /**
   * List available tools
   */
  listTools(): MCPTool[] {
    return Array.from(this.tools.values()).map(({ name, description, inputSchema }) => ({
      name,
      description,
      inputSchema,
    }))
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
      }
    }

    if (!tool.handler) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool handler not implemented: ${name}` }],
      }
    }

    try {
      const result = await tool.handler(args)
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text', text: error instanceof Error ? error.message : 'Unknown error' }],
      }
    }
  }

  /**
   * List available resources
   */
  listResources(): MCPResource[] {
    return Array.from(this.resources.values()).map(({ uri, name, description, mimeType }) => ({
      uri,
      name,
      description,
      mimeType,
    }))
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<MCPResourceContent> {
    const resource = this.resources.get(uri)
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`)
    }

    return {
      uri,
      mimeType: resource.mimeType,
      text: resource.document.content,
    }
  }

  /**
   * List available prompts
   */
  listPrompts(): MCPPrompt[] {
    return Array.from(this.prompts.values()).map(({ name, description, arguments: args }) => ({
      name,
      description,
      arguments: args,
    }))
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args: Record<string, string>): Promise<MCPPromptResult> {
    const prompt = this.prompts.get(name)
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`)
    }

    // Simple template replacement
    let content = prompt.document.content
    for (const [key, value] of Object.entries(args)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }

    return {
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: content },
        },
      ],
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const { transport = 'stdio' } = this.options

    if (transport === 'stdio') {
      await this.startStdio()
    } else if (transport === 'http') {
      await this.startHttp()
    }
  }

  /**
   * Start stdio transport (for Node.js/Bun)
   */
  private async startStdio(): Promise<void> {
    console.error(`MCP server (stdio) starting: ${this.options.name}`)
    // Implementation would use @modelcontextprotocol/sdk
    // for now, this is a placeholder
  }

  /**
   * Start HTTP transport
   */
  private async startHttp(): Promise<void> {
    const { port = 3000 } = this.options
    console.log(`MCP server (http) starting on port ${port}: ${this.options.name}`)
    // Implementation would create an HTTP server
    // for now, this is a placeholder
  }

  /**
   * Get server info
   */
  getServerInfo(): MCPServerInfo {
    return {
      name: this.options.name,
      version: this.options.version || '1.0.0',
      capabilities: {
        tools: this.tools.size > 0,
        resources: this.resources.size > 0,
        prompts: this.prompts.size > 0,
      },
    }
  }
}

/**
 * Build JSON Schema from MDX document
 */
function buildSchemaFromDocument(doc: MDXLDDocument): JSONSchema {
  const parameters = doc.data.parameters as Record<string, unknown> | undefined

  if (!parameters) {
    return { type: 'object', properties: {} }
  }

  const properties: Record<string, JSONSchema> = {}
  const required: string[] = []

  for (const [name, def] of Object.entries(parameters)) {
    if (typeof def === 'string') {
      properties[name] = { type: def }
    } else if (typeof def === 'object' && def !== null) {
      const paramDef = def as Record<string, unknown>
      properties[name] = {
        type: (paramDef.type as string) || 'string',
        description: paramDef.description as string | undefined,
      }
      if (paramDef.required) {
        required.push(name)
      }
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

// MCP Result types
export interface MCPToolResult {
  content: Array<{ type: string; text: string }>
  isError?: boolean
}

export interface MCPResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}

export interface MCPPromptResult {
  messages: Array<{
    role: 'user' | 'assistant'
    content: { type: string; text: string }
  }>
}

export interface MCPServerInfo {
  name: string
  version: string
  capabilities: {
    tools: boolean
    resources: boolean
    prompts: boolean
  }
}

// Types are already exported where they are declared above
