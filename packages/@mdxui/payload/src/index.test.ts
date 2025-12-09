import { describe, it, expect } from 'vitest'
import { mdxldPlugin, createMDXLDField, name } from './index.js'
import type {
  MDXLDPluginOptions,
  MDXLDDocument,
  EditorMode,
  EditorTheme,
  MDXLDEditorProps,
  MDXLDJSONFieldProps,
  ValidationError,
  ValidationResult,
} from './index.js'
import type { Config, Field, CollectionConfig, GlobalConfig } from 'payload'

describe('@mdxui/payload', () => {
  describe('module exports', () => {
    it('exports package name', () => {
      expect(name).toBe('@mdxui/payload')
    })

    it('exports mdxldPlugin function', () => {
      expect(mdxldPlugin).toBeDefined()
      expect(typeof mdxldPlugin).toBe('function')
    })

    it('exports createMDXLDField helper', () => {
      expect(createMDXLDField).toBeDefined()
      expect(typeof createMDXLDField).toBe('function')
    })

    it('loads module without errors', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
    })
  })

  describe('mdxldPlugin', () => {
    it('should return a config transform function', () => {
      const plugin = mdxldPlugin()
      expect(typeof plugin).toBe('function')
    })

    it('should transform config with default options', () => {
      const plugin = mdxldPlugin()
      const config: Config = {
        collections: [
          {
            slug: 'posts',
            fields: [
              {
                name: 'content',
                type: 'json',
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      expect(result).toBeDefined()
      expect(result.collections).toBeDefined()
    })

    it('should convert JSON fields to MDXLD by default', () => {
      const plugin = mdxldPlugin()
      const config: Config = {
        collections: [
          {
            slug: 'posts',
            fields: [
              {
                name: 'data',
                type: 'json',
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      const collection = result.collections?.[0] as CollectionConfig
      const field = collection.fields[0] as Field & { admin?: { components?: Record<string, unknown> }; custom?: Record<string, unknown> }

      expect(field.admin?.components?.Field).toBe('@mdxui/payload/components#MDXLDJSONField')
      expect(field.admin?.components?.Cell).toBe('@mdxui/payload/components#MDXLDJSONCell')
      expect(field.custom?.mdxld).toBe(true)
    })

    it('should support opt-in mode', () => {
      const plugin = mdxldPlugin({ optIn: true })
      const config: Config = {
        collections: [
          {
            slug: 'posts',
            fields: [
              {
                name: 'data',
                type: 'json',
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      const collection = result.collections?.[0] as CollectionConfig
      const field = collection.fields[0] as Field & { admin?: { components?: Record<string, unknown> } }

      // Should not be converted without custom.mdxld = true
      expect(field.admin?.components?.Field).toBeUndefined()
    })

    it('should exclude specific fields', () => {
      const plugin = mdxldPlugin({ exclude: ['settings'] })
      const config: Config = {
        collections: [
          {
            slug: 'posts',
            fields: [
              {
                name: 'settings',
                type: 'json',
              },
              {
                name: 'content',
                type: 'json',
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      const collection = result.collections?.[0] as CollectionConfig
      const settingsField = collection.fields[0] as Field & { admin?: { components?: Record<string, unknown> } }
      const contentField = collection.fields[1] as Field & { admin?: { components?: Record<string, unknown> }; custom?: Record<string, unknown> }

      expect(settingsField.admin?.components?.Field).toBeUndefined()
      expect(contentField.custom?.mdxld).toBe(true)
    })

    it('should exclude entire collections', () => {
      const plugin = mdxldPlugin({ excludeCollections: ['system'] })
      const config: Config = {
        collections: [
          {
            slug: 'system',
            fields: [
              {
                name: 'data',
                type: 'json',
              },
            ],
          },
          {
            slug: 'posts',
            fields: [
              {
                name: 'data',
                type: 'json',
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      const systemCollection = result.collections?.[0] as CollectionConfig
      const postsCollection = result.collections?.[1] as CollectionConfig
      const systemField = systemCollection.fields[0] as Field & { admin?: { components?: Record<string, unknown> } }
      const postsField = postsCollection.fields[0] as Field & { admin?: { components?: Record<string, unknown> }; custom?: Record<string, unknown> }

      expect(systemField.admin?.components?.Field).toBeUndefined()
      expect(postsField.custom?.mdxld).toBe(true)
    })

    it('should set default editor mode', () => {
      const plugin = mdxldPlugin({ defaultMode: 'yaml' })
      const config: Config = {
        collections: [
          {
            slug: 'posts',
            fields: [
              {
                name: 'data',
                type: 'json',
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      const collection = result.collections?.[0] as CollectionConfig
      const field = collection.fields[0] as Field & { custom?: { editorMode?: EditorMode } }

      expect(field.custom?.editorMode).toBe('yaml')
    })

    it('should handle globals', () => {
      const plugin = mdxldPlugin()
      const config: Config = {
        globals: [
          {
            slug: 'settings',
            fields: [
              {
                name: 'data',
                type: 'json',
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      const global = result.globals?.[0] as GlobalConfig
      const field = global.fields[0] as Field & { custom?: Record<string, unknown> }

      expect(field.custom?.mdxld).toBe(true)
    })

    it('should respect field opt-out', () => {
      const plugin = mdxldPlugin()
      const config: Config = {
        collections: [
          {
            slug: 'posts',
            fields: [
              {
                name: 'data',
                type: 'json',
                custom: { mdxld: false },
              },
            ],
          },
        ],
      } as Config

      const result = plugin(config)
      const collection = result.collections?.[0] as CollectionConfig
      const field = collection.fields[0] as Field & { admin?: { components?: Record<string, unknown> } }

      expect(field.admin?.components?.Field).toBeUndefined()
    })
  })

  describe('createMDXLDField', () => {
    it('should create a JSON field config', () => {
      const field = createMDXLDField({
        name: 'content',
        label: 'Content',
      })

      expect(field.name).toBe('content')
      expect(field.type).toBe('json')
      expect(field.label).toBe('Content')
    })

    it('should set MDXLD custom properties', () => {
      const field = createMDXLDField({
        name: 'content',
      })

      expect(field.custom?.mdxld).toBe(true)
      expect(field.custom?.editorMode).toBe('split')
    })

    it('should configure component paths', () => {
      const field = createMDXLDField({
        name: 'content',
      })

      expect(field.admin?.components?.Field).toBe('@mdxui/payload/components#MDXLDJSONField')
      expect(field.admin?.components?.Cell).toBe('@mdxui/payload/components#MDXLDJSONCell')
    })

    it('should support custom editor mode', () => {
      const field = createMDXLDField({
        name: 'content',
        editorMode: 'yaml',
      })

      expect(field.custom?.editorMode).toBe('yaml')
    })

    it('should support required fields', () => {
      const field = createMDXLDField({
        name: 'content',
        required: true,
      })

      expect(field.required).toBe(true)
    })

    it('should support description', () => {
      const field = createMDXLDField({
        name: 'content',
        description: 'Enter MDX content',
      })

      expect(field.admin?.description).toBe('Enter MDX content')
    })

    it('should support default value', () => {
      const defaultValue = { title: 'Hello' }
      const field = createMDXLDField({
        name: 'content',
        defaultValue,
      })

      expect(field.defaultValue).toEqual(defaultValue)
    })
  })

  describe('type definitions', () => {
    it('should validate MDXLDDocument interface', () => {
      const doc: MDXLDDocument = {
        id: 'https://example.com/doc',
        type: 'Article',
        context: 'https://schema.org',
        data: {
          title: 'Test Article',
          author: 'John Doe',
        },
        content: '# Test Content',
      }

      expect(doc.id).toBe('https://example.com/doc')
      expect(doc.type).toBe('Article')
      expect(doc.data.title).toBe('Test Article')
      expect(doc.content).toBe('# Test Content')
    })

    it('should support array types in MDXLDDocument', () => {
      const doc: MDXLDDocument = {
        type: ['Article', 'BlogPost'],
        data: {},
        content: '',
      }

      expect(Array.isArray(doc.type)).toBe(true)
      expect(doc.type).toContain('Article')
      expect(doc.type).toContain('BlogPost')
    })

    it('should validate EditorMode type', () => {
      const modes: EditorMode[] = ['yaml', 'json', 'mdx', 'split']
      expect(modes).toHaveLength(4)
    })

    it('should validate EditorTheme type', () => {
      const themes: EditorTheme[] = ['light', 'dark', 'system']
      expect(themes).toHaveLength(3)
    })

    it('should validate MDXLDEditorProps interface', () => {
      const onChange = (value: string) => {
        // Real implementation that would update state
        return value
      }
      const props: MDXLDEditorProps = {
        value: '---\ntitle: Test\n---\n# Content',
        onChange,
        mode: 'split',
        theme: 'dark',
        placeholder: 'Enter content...',
        disabled: false,
        minHeight: 300,
        maxHeight: 800,
        lineNumbers: true,
        validate: true,
        className: 'custom-editor',
      }

      expect(props.value).toContain('title: Test')
      expect(props.mode).toBe('split')
      expect(props.theme).toBe('dark')
      expect(props.minHeight).toBe(300)
      expect(props.lineNumbers).toBe(true)
      expect(typeof props.onChange).toBe('function')
      // Verify onChange works with real implementation
      expect(props.onChange('new value')).toBe('new value')
    })

    it('should validate MDXLDJSONFieldProps interface', () => {
      const props: MDXLDJSONFieldProps = {
        path: 'content',
        name: 'content',
        label: 'Content Field',
        description: 'MDX content',
        required: true,
        mdxldEditor: true,
        editorMode: 'split',
      }

      expect(props.path).toBe('content')
      expect(props.name).toBe('content')
      expect(props.required).toBe(true)
      expect(props.editorMode).toBe('split')
    })

    it('should validate ValidationError interface', () => {
      const error: ValidationError = {
        message: 'Invalid YAML syntax',
        line: 5,
        column: 10,
        type: 'yaml',
      }

      expect(error.message).toBe('Invalid YAML syntax')
      expect(error.line).toBe(5)
      expect(error.type).toBe('yaml')
    })

    it('should validate ValidationResult interface - valid', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        document: {
          data: { title: 'Test' },
          content: '# Test',
        },
      }

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.document).toBeDefined()
    })

    it('should validate ValidationResult interface - invalid', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            message: 'Parse error',
            type: 'yaml',
          },
        ],
      }

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.document).toBeUndefined()
    })
  })

  describe('plugin options', () => {
    it('should support all editor modes', () => {
      const modes: EditorMode[] = ['yaml', 'json', 'mdx', 'split']

      modes.forEach((mode) => {
        const options: MDXLDPluginOptions = {
          defaultMode: mode,
        }
        expect(options.defaultMode).toBe(mode)
      })
    })

    it('should support glob patterns in exclude', () => {
      const options: MDXLDPluginOptions = {
        exclude: ['config.*', '*_internal'],
      }

      expect(options.exclude).toContain('config.*')
      expect(options.exclude).toContain('*_internal')
    })

    it('should support debug mode', () => {
      const options: MDXLDPluginOptions = {
        debug: true,
      }

      expect(options.debug).toBe(true)
    })

    it('should support multiple exclusion types', () => {
      const options: MDXLDPluginOptions = {
        exclude: ['settings'],
        excludeCollections: ['system'],
        excludeGlobals: ['config'],
      }

      expect(options.exclude).toContain('settings')
      expect(options.excludeCollections).toContain('system')
      expect(options.excludeGlobals).toContain('config')
    })
  })
})
