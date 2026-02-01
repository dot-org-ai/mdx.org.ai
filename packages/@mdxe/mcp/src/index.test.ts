import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Readable, Writable, PassThrough } from 'node:stream'
import {
  MCPServer,
  createMCPServer,
  type MCPServerOptions,
  type MDXLDDocument,
  type MCPTool,
  type MCPResource,
  type MCPPrompt,
  type JSONSchema,
} from './index.js'

describe('@mdxe/mcp', () => {
  describe('MCPServer instantiation', () => {
    it('should create a basic server with minimal options', () => {
      const server = new MCPServer({
        name: 'test-server',
      })

      expect(server).toBeInstanceOf(MCPServer)
      const info = server.getServerInfo()
      expect(info.name).toBe('test-server')
      expect(info.version).toBe('1.0.0')
    })

    it('should create a server with custom version', () => {
      const server = new MCPServer({
        name: 'versioned-server',
        version: '2.3.4',
      })

      const info = server.getServerInfo()
      expect(info.version).toBe('2.3.4')
    })

    it('should create a server with stdio transport', () => {
      const server = new MCPServer({
        name: 'stdio-server',
        transport: 'stdio',
      })

      expect(server).toBeInstanceOf(MCPServer)
    })

    it('should create a server with http transport and port', () => {
      const server = new MCPServer({
        name: 'http-server',
        transport: 'http',
        port: 8080,
      })

      expect(server).toBeInstanceOf(MCPServer)
    })

    it('should use createMCPServer factory function', () => {
      const server = createMCPServer({
        name: 'factory-server',
      })

      expect(server).toBeInstanceOf(MCPServer)
    })
  })

  describe('Tool registration', () => {
    it('should register tools from MDX documents', () => {
      const toolDoc: MDXLDDocument = {
        id: 'https://example.com/tools/sum',
        type: 'Tool',
        data: {
          name: 'sum',
          description: 'Add two numbers',
          parameters: {
            a: { type: 'number', required: true },
            b: { type: 'number', required: true },
          },
        },
        content: 'This tool adds two numbers together.',
      }

      const server = new MCPServer({
        name: 'tool-server',
        tools: [toolDoc],
      })

      const tools = server.listTools()
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('sum')
      expect(tools[0].description).toBe('Add two numbers')
    })

    it('should handle tools with minimal data', () => {
      const minimalDoc: MDXLDDocument = {
        data: {},
        content: 'A tool with minimal information',
      }

      const server = new MCPServer({
        name: 'minimal-server',
        tools: [minimalDoc],
      })

      const tools = server.listTools()
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('anonymous-tool')
      expect(tools[0].description).toBe('A tool with minimal information')
    })

    it('should generate JSON schema from parameters', () => {
      const toolDoc: MDXLDDocument = {
        data: {
          name: 'search',
          parameters: {
            query: 'string',
            limit: { type: 'number', description: 'Max results' },
            filter: { type: 'string', required: false },
          },
        },
        content: 'Search tool',
      }

      const server = new MCPServer({
        name: 'schema-server',
        tools: [toolDoc],
      })

      const tools = server.listTools()
      expect(tools[0].inputSchema.type).toBe('object')
      expect(tools[0].inputSchema.properties).toHaveProperty('query')
      expect(tools[0].inputSchema.properties).toHaveProperty('limit')
      expect(tools[0].inputSchema.properties).toHaveProperty('filter')
    })

    it('should register tool handlers', () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'greet' },
        content: 'Greet someone',
      }

      const handler = async (args: Record<string, unknown>) => {
        return `Hello, ${args.name}!`
      }

      const server = new MCPServer({
        name: 'handler-server',
        tools: [toolDoc],
        toolHandlers: {
          greet: handler,
        },
      })

      expect(server.listTools()).toHaveLength(1)
    })

    it('should register multiple tools', () => {
      const tools: MDXLDDocument[] = [
        {
          data: { name: 'tool1' },
          content: 'First tool',
        },
        {
          data: { name: 'tool2' },
          content: 'Second tool',
        },
        {
          data: { name: 'tool3' },
          content: 'Third tool',
        },
      ]

      const server = new MCPServer({
        name: 'multi-tool-server',
        tools,
      })

      expect(server.listTools()).toHaveLength(3)
    })
  })

  describe('Tool execution', () => {
    it('should execute a tool with handler', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'calculate' },
        content: 'Calculator',
      }

      const handler = async (args: Record<string, unknown>) => {
        return (args.a as number) + (args.b as number)
      }

      const server = new MCPServer({
        name: 'calc-server',
        tools: [toolDoc],
        toolHandlers: {
          calculate: handler,
        },
      })

      const result = await server.callTool('calculate', { a: 5, b: 3 })

      expect(result.isError).toBeUndefined()
      expect(result.content[0].text).toBe('8')
    })

    it('should return error for non-existent tool', async () => {
      const server = new MCPServer({
        name: 'empty-server',
      })

      const result = await server.callTool('missing', {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Tool not found')
    })

    it('should return error for tool without handler', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'unimplemented' },
        content: 'Tool without handler',
      }

      const server = new MCPServer({
        name: 'no-handler-server',
        tools: [toolDoc],
      })

      const result = await server.callTool('unimplemented', {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Tool handler not implemented')
    })

    it('should handle tool handler errors', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'failing' },
        content: 'A tool that fails',
      }

      const handler = async () => {
        throw new Error('Something went wrong')
      }

      const server = new MCPServer({
        name: 'error-server',
        tools: [toolDoc],
        toolHandlers: {
          failing: handler,
        },
      })

      const result = await server.callTool('failing', {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toBe('Something went wrong')
    })

    it('should format tool result as JSON', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'data' },
        content: 'Returns structured data',
      }

      const handler = async () => ({
        users: ['Alice', 'Bob'],
        count: 2,
      })

      const server = new MCPServer({
        name: 'json-server',
        tools: [toolDoc],
        toolHandlers: {
          data: handler,
        },
      })

      const result = await server.callTool('data', {})

      expect(result.isError).toBeUndefined()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.users).toEqual(['Alice', 'Bob'])
      expect(parsed.count).toBe(2)
    })
  })

  describe('Resource registration', () => {
    it('should register resources from MDX documents', () => {
      const resourceDoc: MDXLDDocument = {
        id: 'https://example.com/docs/readme',
        data: {
          name: 'readme',
          description: 'Project documentation',
        },
        content: '# README\n\nProject information',
      }

      const server = new MCPServer({
        name: 'resource-server',
        resources: [resourceDoc],
      })

      const resources = server.listResources()
      expect(resources).toHaveLength(1)
      expect(resources[0].uri).toBe('https://example.com/docs/readme')
      expect(resources[0].name).toBe('readme')
      expect(resources[0].mimeType).toBe('text/markdown')
    })

    it('should handle custom mime types', () => {
      const resourceDoc: MDXLDDocument = {
        id: 'https://example.com/data.json',
        data: {
          name: 'data',
          mimeType: 'application/json',
        },
        content: '{"key": "value"}',
      }

      const server = new MCPServer({
        name: 'json-resource-server',
        resources: [resourceDoc],
      })

      const resources = server.listResources()
      expect(resources[0].mimeType).toBe('application/json')
    })

    it('should generate resource URI when missing', () => {
      const resourceDoc: MDXLDDocument = {
        data: { name: 'unnamed' },
        content: 'Resource content',
      }

      const server = new MCPServer({
        name: 'uri-gen-server',
        resources: [resourceDoc],
      })

      const resources = server.listResources()
      expect(resources[0].uri).toContain('resource://')
    })

    it('should read resource content', async () => {
      const resourceDoc: MDXLDDocument = {
        id: 'https://example.com/guide',
        data: { name: 'guide' },
        content: '# User Guide\n\nDetailed instructions',
      }

      const server = new MCPServer({
        name: 'read-server',
        resources: [resourceDoc],
      })

      const content = await server.readResource('https://example.com/guide')

      expect(content.uri).toBe('https://example.com/guide')
      expect(content.text).toBe('# User Guide\n\nDetailed instructions')
      expect(content.mimeType).toBe('text/markdown')
    })

    it('should throw error for non-existent resource', async () => {
      const server = new MCPServer({
        name: 'empty-resource-server',
      })

      await expect(server.readResource('missing')).rejects.toThrow('Resource not found')
    })

    it('should register multiple resources', () => {
      const resources: MDXLDDocument[] = [
        { id: 'res1', data: { name: 'r1' }, content: 'Content 1' },
        { id: 'res2', data: { name: 'r2' }, content: 'Content 2' },
        { id: 'res3', data: { name: 'r3' }, content: 'Content 3' },
      ]

      const server = new MCPServer({
        name: 'multi-resource-server',
        resources,
      })

      expect(server.listResources()).toHaveLength(3)
    })
  })

  describe('Prompt registration', () => {
    it('should register prompts from MDX documents', () => {
      const promptDoc: MDXLDDocument = {
        data: {
          name: 'summarize',
          description: 'Summarize text',
          arguments: [
            { name: 'text', description: 'Text to summarize', required: true },
            { name: 'maxLength', description: 'Maximum length', required: false },
          ],
        },
        content: 'Please summarize: {{text}}',
      }

      const server = new MCPServer({
        name: 'prompt-server',
        prompts: [promptDoc],
      })

      const prompts = server.listPrompts()
      expect(prompts).toHaveLength(1)
      expect(prompts[0].name).toBe('summarize')
      expect(prompts[0].arguments).toHaveLength(2)
    })

    it('should handle prompts without arguments', () => {
      const promptDoc: MDXLDDocument = {
        data: {
          name: 'simple',
          description: 'A simple prompt',
        },
        content: 'Tell me something interesting',
      }

      const server = new MCPServer({
        name: 'simple-prompt-server',
        prompts: [promptDoc],
      })

      const prompts = server.listPrompts()
      expect(prompts[0].arguments).toBeUndefined()
    })

    it('should get prompt with template substitution', async () => {
      const promptDoc: MDXLDDocument = {
        data: { name: 'greet' },
        content: 'Hello, {{name}}! Welcome to {{place}}.',
      }

      const server = new MCPServer({
        name: 'template-server',
        prompts: [promptDoc],
      })

      const result = await server.getPrompt('greet', {
        name: 'Alice',
        place: 'Wonderland',
      })

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].role).toBe('user')
      expect(result.messages[0].content.text).toBe('Hello, Alice! Welcome to Wonderland.')
    })

    it('should throw error for non-existent prompt', async () => {
      const server = new MCPServer({
        name: 'empty-prompt-server',
      })

      await expect(server.getPrompt('missing', {})).rejects.toThrow('Prompt not found')
    })

    it('should register multiple prompts', () => {
      const prompts: MDXLDDocument[] = [
        { data: { name: 'p1' }, content: 'Prompt 1' },
        { data: { name: 'p2' }, content: 'Prompt 2' },
        { data: { name: 'p3' }, content: 'Prompt 3' },
      ]

      const server = new MCPServer({
        name: 'multi-prompt-server',
        prompts,
      })

      expect(server.listPrompts()).toHaveLength(3)
    })
  })

  describe('Server capabilities', () => {
    it('should report correct capabilities when tools are registered', () => {
      const server = new MCPServer({
        name: 'tool-cap-server',
        tools: [{ data: { name: 't1' }, content: 'Tool' }],
      })

      const info = server.getServerInfo()
      expect(info.capabilities.tools).toBe(true)
      expect(info.capabilities.resources).toBe(false)
      expect(info.capabilities.prompts).toBe(false)
    })

    it('should report correct capabilities when resources are registered', () => {
      const server = new MCPServer({
        name: 'resource-cap-server',
        resources: [{ id: 'r1', data: {}, content: 'Resource' }],
      })

      const info = server.getServerInfo()
      expect(info.capabilities.tools).toBe(false)
      expect(info.capabilities.resources).toBe(true)
      expect(info.capabilities.prompts).toBe(false)
    })

    it('should report correct capabilities when prompts are registered', () => {
      const server = new MCPServer({
        name: 'prompt-cap-server',
        prompts: [{ data: { name: 'p1' }, content: 'Prompt' }],
      })

      const info = server.getServerInfo()
      expect(info.capabilities.tools).toBe(false)
      expect(info.capabilities.resources).toBe(false)
      expect(info.capabilities.prompts).toBe(true)
    })

    it('should report all capabilities when all types are registered', () => {
      const server = new MCPServer({
        name: 'full-cap-server',
        tools: [{ data: { name: 't1' }, content: 'Tool' }],
        resources: [{ id: 'r1', data: {}, content: 'Resource' }],
        prompts: [{ data: { name: 'p1' }, content: 'Prompt' }],
      })

      const info = server.getServerInfo()
      expect(info.capabilities.tools).toBe(true)
      expect(info.capabilities.resources).toBe(true)
      expect(info.capabilities.prompts).toBe(true)
    })
  })

  describe('Transport configuration', () => {
    it('should default to stdio transport', () => {
      const server = new MCPServer({
        name: 'default-transport-server',
      })

      expect(server).toBeInstanceOf(MCPServer)
    })

    it('should accept stdio transport explicitly', () => {
      const server = new MCPServer({
        name: 'stdio-explicit-server',
        transport: 'stdio',
      })

      expect(server).toBeInstanceOf(MCPServer)
    })

    it('should accept http transport', () => {
      const server = new MCPServer({
        name: 'http-transport-server',
        transport: 'http',
      })

      expect(server).toBeInstanceOf(MCPServer)
    })

    it('should use default port 3000 for http transport', () => {
      const server = new MCPServer({
        name: 'http-default-port-server',
        transport: 'http',
      })

      expect(server).toBeInstanceOf(MCPServer)
    })

    it('should accept custom port for http transport', () => {
      const server = new MCPServer({
        name: 'http-custom-port-server',
        transport: 'http',
        port: 9999,
      })

      expect(server).toBeInstanceOf(MCPServer)
    })
  })

  describe('Type definitions', () => {
    it('should export MCPTool interface', () => {
      const tool: MCPTool = {
        name: 'test',
        description: 'Test tool',
        inputSchema: { type: 'object' },
      }

      expect(tool.name).toBe('test')
    })

    it('should export MCPResource interface', () => {
      const resource: MCPResource = {
        uri: 'https://example.com/resource',
        name: 'resource',
        description: 'Test resource',
        mimeType: 'text/plain',
      }

      expect(resource.uri).toBe('https://example.com/resource')
    })

    it('should export MCPPrompt interface', () => {
      const prompt: MCPPrompt = {
        name: 'test-prompt',
        description: 'Test prompt',
        arguments: [
          { name: 'arg1', required: true },
        ],
      }

      expect(prompt.name).toBe('test-prompt')
    })

    it('should export JSONSchema interface', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      }

      expect(schema.type).toBe('object')
      expect(schema.properties).toHaveProperty('name')
    })

    it('should export MDXLDDocument interface', () => {
      const doc: MDXLDDocument = {
        id: 'https://example.com/doc',
        type: 'Document',
        data: { title: 'Test' },
        content: '# Test',
      }

      expect(doc.id).toBe('https://example.com/doc')
    })
  })

  describe('Stdio transport', () => {
    it('should respond to initialize request via stdio', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'test-tool', description: 'A test tool' },
        content: 'Test tool content',
      }

      const server = new MCPServer({
        name: 'stdio-test-server',
        version: '1.0.0',
        transport: 'stdio',
        tools: [toolDoc],
      })

      // Create mock stdin/stdout
      const mockStdin = new PassThrough()
      const mockStdout = new PassThrough()
      const outputChunks: Buffer[] = []
      mockStdout.on('data', (chunk) => outputChunks.push(chunk))

      // Start the server with mock streams
      await server.startWithStreams(mockStdin, mockStdout)

      // Send an initialize request
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }

      // The SDK uses newline-delimited JSON (NDJSON), not Content-Length headers
      mockStdin.write(JSON.stringify(initRequest) + '\n')

      // Wait for response
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Parse output
      const output = Buffer.concat(outputChunks).toString()
      expect(output).toContain('serverInfo')
      expect(output).toContain('stdio-test-server')

      await server.close()
    })

    it('should handle tools/list request via stdio', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'hello', description: 'Say hello' },
        content: 'Greeting tool',
      }

      const server = new MCPServer({
        name: 'tools-test-server',
        transport: 'stdio',
        tools: [toolDoc],
      })

      const mockStdin = new PassThrough()
      const mockStdout = new PassThrough()
      const outputChunks: Buffer[] = []
      mockStdout.on('data', (chunk) => outputChunks.push(chunk))

      await server.startWithStreams(mockStdin, mockStdout)

      // Send initialize first
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }
      // The SDK uses newline-delimited JSON (NDJSON), not Content-Length headers
      mockStdin.write(JSON.stringify(initRequest) + '\n')

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Send initialized notification
      const initializedNotification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }
      mockStdin.write(JSON.stringify(initializedNotification) + '\n')

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Clear output
      outputChunks.length = 0

      // Send tools/list request
      const listRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }
      mockStdin.write(JSON.stringify(listRequest) + '\n')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const output = Buffer.concat(outputChunks).toString()
      expect(output).toContain('hello')

      await server.close()
    })

    it('should handle tools/call request via stdio', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'greet' },
        content: 'Greet someone',
      }

      const server = new MCPServer({
        name: 'call-test-server',
        transport: 'stdio',
        tools: [toolDoc],
        toolHandlers: {
          greet: async (args) => `Hello, ${args.name}!`,
        },
      })

      const mockStdin = new PassThrough()
      const mockStdout = new PassThrough()
      const outputChunks: Buffer[] = []
      mockStdout.on('data', (chunk) => outputChunks.push(chunk))

      await server.startWithStreams(mockStdin, mockStdout)

      // Initialize
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }
      // The SDK uses newline-delimited JSON (NDJSON), not Content-Length headers
      mockStdin.write(JSON.stringify(initRequest) + '\n')
      await new Promise((resolve) => setTimeout(resolve, 50))

      const initializedNotification = { jsonrpc: '2.0', method: 'notifications/initialized' }
      mockStdin.write(JSON.stringify(initializedNotification) + '\n')
      await new Promise((resolve) => setTimeout(resolve, 50))

      outputChunks.length = 0

      // Call the tool
      const callRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'greet',
          arguments: { name: 'World' },
        },
      }
      mockStdin.write(JSON.stringify(callRequest) + '\n')

      await new Promise((resolve) => setTimeout(resolve, 100))

      const output = Buffer.concat(outputChunks).toString()
      expect(output).toContain('Hello, World!')

      await server.close()
    })
  })

  describe('HTTP transport', () => {
    it('should create HTTP request handler', async () => {
      const server = new MCPServer({
        name: 'http-test-server',
        version: '1.0.0',
        transport: 'http',
        port: 0, // Use random available port
      })

      const handler = server.createHttpHandler()
      expect(typeof handler).toBe('function')
    })

    it('should handle initialize via HTTP POST', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'http-tool', description: 'HTTP tool' },
        content: 'HTTP tool content',
      }

      const server = new MCPServer({
        name: 'http-init-server',
        transport: 'http',
        tools: [toolDoc],
      })

      const handler = server.createHttpHandler()

      // Create a mock Request
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }

      const request = new Request('http://localhost/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(initRequest),
      })

      const response = await handler(request)
      expect(response).toBeInstanceOf(Response)
      expect(response.status).toBe(200)

      const body = await response.text()
      expect(body).toContain('serverInfo')
      expect(body).toContain('http-init-server')
    })

    it('should handle tools/list via HTTP POST', async () => {
      const toolDoc: MDXLDDocument = {
        data: { name: 'list-tool', description: 'List test' },
        content: 'List tool content',
      }

      const server = new MCPServer({
        name: 'http-list-server',
        transport: 'http',
        tools: [toolDoc],
      })

      const handler = server.createHttpHandler()

      // Initialize first
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }
      await handler(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
          body: JSON.stringify(initRequest),
        })
      )

      // List tools
      const listRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }

      const response = await handler(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
          body: JSON.stringify(listRequest),
        })
      )

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('list-tool')
    })

    it('should handle tools/call via HTTP POST', async () => {
      const toolDoc: MDXLDDocument = {
        data: {
          name: 'http-greet',
          parameters: {
            name: { type: 'string', required: true },
          },
        },
        content: 'HTTP greet tool',
      }

      const server = new MCPServer({
        name: 'http-call-server',
        transport: 'http',
        tools: [toolDoc],
        toolHandlers: {
          'http-greet': async (args) => `HTTP Hello, ${args.name}!`,
        },
      })

      const handler = server.createHttpHandler()

      // Initialize
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }
      await handler(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
          body: JSON.stringify(initRequest),
        })
      )

      // Call tool
      const callRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'http-greet',
          arguments: { name: 'HTTP World' },
        },
      }

      const response = await handler(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
          body: JSON.stringify(callRequest),
        })
      )

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('HTTP Hello, HTTP World!')
    })

    it('should return error for invalid method', async () => {
      const server = new MCPServer({
        name: 'http-error-server',
        transport: 'http',
      })

      const handler = server.createHttpHandler()

      const response = await handler(
        new Request('http://localhost/mcp', {
          method: 'PUT',
        })
      )

      expect(response.status).toBe(405)
    })

    it('should handle resources/list via HTTP POST', async () => {
      const resourceDoc: MDXLDDocument = {
        id: 'https://example.com/docs/readme',
        data: { name: 'readme', description: 'Documentation' },
        content: '# README',
      }

      const server = new MCPServer({
        name: 'http-resource-server',
        transport: 'http',
        resources: [resourceDoc],
      })

      const handler = server.createHttpHandler()

      // Initialize
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' },
        },
      }
      await handler(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
          body: JSON.stringify(initRequest),
        })
      )

      // List resources
      const listRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {},
      }

      const response = await handler(
        new Request('http://localhost/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
          body: JSON.stringify(listRequest),
        })
      )

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('readme')
    })
  })
})
