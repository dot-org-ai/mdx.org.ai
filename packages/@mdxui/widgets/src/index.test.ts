import { describe, it, expect, vi } from 'vitest'
import { cn } from './lib/utils.js'
import type {
  EditorPanelProps,
  Viewport,
  Layout,
  CompileError,
  SaveResponse,
  CursorPosition,
  AutosaveData,
} from './lib/types.js'
import { viewportWidths } from './lib/types.js'

describe('@mdxui/widgets', () => {
  describe('module exports', () => {
    it('loads without errors', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
    })

    it('exports cn utility function', () => {
      expect(cn).toBeDefined()
      expect(typeof cn).toBe('function')
    })
  })

  describe('cn utility function', () => {
    it('should merge class names correctly', () => {
      const result = cn('foo', 'bar')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'conditional', 'always')
      expect(result).toContain('base')
      expect(result).toContain('always')
      expect(result).not.toContain('conditional')
    })

    it('should merge Tailwind classes correctly', () => {
      const result = cn('p-4', 'p-8')
      // Should keep only the last padding class
      expect(result).toBe('p-8')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['foo', 'bar'], 'baz')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
      expect(result).toContain('baz')
    })

    it('should handle object notation', () => {
      const result = cn({
        foo: true,
        bar: false,
        baz: true,
      })
      expect(result).toContain('foo')
      expect(result).toContain('baz')
      expect(result).not.toContain('bar')
    })

    it('should handle undefined and null values', () => {
      const result = cn('foo', undefined, null, 'bar')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })

    it('should handle empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })
  })

  describe('type definitions', () => {
    it('should define Viewport type correctly', () => {
      const viewports: Viewport[] = ['mobile', 'tablet', 'desktop']
      expect(viewports).toHaveLength(3)
    })

    it('should define viewport widths', () => {
      expect(viewportWidths.mobile).toBe(375)
      expect(viewportWidths.tablet).toBe(768)
      expect(viewportWidths.desktop).toBe('100%')
    })

    it('should define Layout type correctly', () => {
      const layouts: Layout[] = ['split', 'drawer-right', 'drawer-left']
      expect(layouts).toHaveLength(3)
    })

    it('should validate EditorPanelProps interface', () => {
      const props: EditorPanelProps = {
        path: '/test/path.mdx',
        initialContent: '# Hello',
        onSave: vi.fn(),
        shortcut: 'meta+.',
        triggerPosition: 'bottom-right',
        showTrigger: true,
        layout: 'split',
      }

      expect(props.path).toBe('/test/path.mdx')
      expect(props.initialContent).toBe('# Hello')
      expect(props.layout).toBe('split')
      expect(props.triggerPosition).toBe('bottom-right')
    })

    it('should validate CompileError interface', () => {
      const error: CompileError = {
        message: 'Syntax error',
        line: 5,
        column: 10,
        codeFrame: '> 5 | const foo',
      }

      expect(error.message).toBe('Syntax error')
      expect(error.line).toBe(5)
      expect(error.column).toBe(10)
    })

    it('should validate SaveResponse success type', () => {
      const response: SaveResponse = {
        success: true,
        version: 2,
        checksum: 'abc123',
      }

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.version).toBe(2)
        expect(response.checksum).toBe('abc123')
      }
    })

    it('should validate SaveResponse conflict error', () => {
      const response: SaveResponse = {
        success: false,
        error: 'conflict',
        serverContent: 'server content',
        serverVersion: 3,
      }

      expect(response.success).toBe(false)
      if (!response.success && response.error === 'conflict') {
        expect(response.serverContent).toBe('server content')
        expect(response.serverVersion).toBe(3)
      }
    })

    it('should validate SaveResponse validation error', () => {
      const response: SaveResponse = {
        success: false,
        error: 'validation',
        message: 'Invalid YAML',
      }

      expect(response.success).toBe(false)
      if (!response.success && response.error === 'validation') {
        expect(response.message).toBe('Invalid YAML')
      }
    })

    it('should validate SaveResponse network error', () => {
      const response: SaveResponse = {
        success: false,
        error: 'network',
        message: 'Connection timeout',
      }

      expect(response.success).toBe(false)
      if (!response.success && response.error === 'network') {
        expect(response.message).toBe('Connection timeout')
      }
    })

    it('should validate CursorPosition interface', () => {
      const position: CursorPosition = {
        lineNumber: 10,
        column: 25,
      }

      expect(position.lineNumber).toBe(10)
      expect(position.column).toBe(25)
    })

    it('should validate AutosaveData interface', () => {
      const data: AutosaveData = {
        content: '# Autosaved content',
        timestamp: Date.now(),
      }

      expect(data.content).toBe('# Autosaved content')
      expect(typeof data.timestamp).toBe('number')
      expect(data.timestamp).toBeGreaterThan(0)
    })
  })

  describe('EditorPanelProps defaults and optionals', () => {
    it('should allow minimal EditorPanelProps', () => {
      const props: EditorPanelProps = {}
      expect(props).toBeDefined()
    })

    it('should allow only path', () => {
      const props: EditorPanelProps = {
        path: '/example.mdx',
      }
      expect(props.path).toBe('/example.mdx')
    })

    it('should allow custom shortcut', () => {
      const props: EditorPanelProps = {
        shortcut: 'ctrl+e',
      }
      expect(props.shortcut).toBe('ctrl+e')
    })

    it('should allow trigger position options', () => {
      const bottomLeft: EditorPanelProps = { triggerPosition: 'bottom-left' }
      const bottomRight: EditorPanelProps = { triggerPosition: 'bottom-right' }

      expect(bottomLeft.triggerPosition).toBe('bottom-left')
      expect(bottomRight.triggerPosition).toBe('bottom-right')
    })

    it('should allow all layout options', () => {
      const split: EditorPanelProps = { layout: 'split' }
      const drawerRight: EditorPanelProps = { layout: 'drawer-right' }
      const drawerLeft: EditorPanelProps = { layout: 'drawer-left' }

      expect(split.layout).toBe('split')
      expect(drawerRight.layout).toBe('drawer-right')
      expect(drawerLeft.layout).toBe('drawer-left')
    })
  })

  describe('viewport widths', () => {
    it('should have correct mobile width', () => {
      expect(viewportWidths.mobile).toBe(375)
      expect(typeof viewportWidths.mobile).toBe('number')
    })

    it('should have correct tablet width', () => {
      expect(viewportWidths.tablet).toBe(768)
      expect(typeof viewportWidths.tablet).toBe('number')
    })

    it('should have correct desktop width', () => {
      expect(viewportWidths.desktop).toBe('100%')
      expect(typeof viewportWidths.desktop).toBe('string')
    })

    it('should cover all viewport types', () => {
      const keys = Object.keys(viewportWidths) as Viewport[]
      expect(keys).toContain('mobile')
      expect(keys).toContain('tablet')
      expect(keys).toContain('desktop')
      expect(keys).toHaveLength(3)
    })
  })

  describe('async save operations', () => {
    it('should support async onSave callback', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const props: EditorPanelProps = {
        path: '/test.mdx',
        onSave,
      }

      if (props.onSave) {
        await props.onSave('test content')
        expect(onSave).toHaveBeenCalledWith('test content')
      }
    })

    it('should handle save errors', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'))
      const props: EditorPanelProps = {
        onSave,
      }

      if (props.onSave) {
        await expect(props.onSave('content')).rejects.toThrow('Save failed')
      }
    })

    it('should support onSave with no return value', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const props: EditorPanelProps = { onSave }

      if (props.onSave) {
        const result = await props.onSave('new content')
        expect(result).toBeUndefined()
      }
    })
  })
})
