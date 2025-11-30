import { describe, it, expect, vi } from 'vitest'
import {
  // Registry
  componentRegistry,
  getComponentNames,
  getComponentMeta,
  getComponentsByCategory,
  getCategories,
  componentHasChildren,
  getRequiredProps,
  getDefaultProps,
  getRelatedComponents,
  // Factory
  createComponents,
  createComponent,
  createStubComponents,
  createValidatedComponents,
  mergeComponents,
  pickComponents,
  omitComponents,
  // Types
  type ComponentName,
  type HeroProps,
  type JSXFactory,
} from './index.js'

describe('mdxui', () => {
  describe('componentRegistry', () => {
    it('should contain all expected components', () => {
      const names = getComponentNames()
      expect(names).toContain('App')
      expect(names).toContain('Hero')
      expect(names).toContain('FAQ')
      expect(names).toContain('Blog')
      expect(names).toContain('Form')
      expect(names).toContain('Table')
      expect(names).toContain('API')
      expect(names).toContain('Alert')
    })

    it('should have 28 components', () => {
      expect(getComponentNames().length).toBe(28)
    })
  })

  describe('getComponentMeta', () => {
    it('should return metadata for Hero component', () => {
      const meta = getComponentMeta('Hero')
      expect(meta.name).toBe('Hero')
      expect(meta.category).toBe('landing')
      expect(meta.hasChildren).toBe(true)
      expect(meta.requiredProps).toContain('title')
      expect(meta.semanticElement).toBe('header')
    })

    it('should return metadata for Table component', () => {
      const meta = getComponentMeta('Table')
      expect(meta.name).toBe('Table')
      expect(meta.category).toBe('data')
      expect(meta.hasChildren).toBe(false)
      expect(meta.requiredProps).toContain('columns')
      expect(meta.requiredProps).toContain('data')
      expect(meta.a11y?.role).toBe('grid')
    })

    it('should return metadata for Alert component', () => {
      const meta = getComponentMeta('Alert')
      expect(meta.defaults?.type).toBe('info')
      expect(meta.a11y?.role).toBe('alert')
    })
  })

  describe('getComponentsByCategory', () => {
    it('should return layout components', () => {
      const layout = getComponentsByCategory('layout')
      expect(layout).toContain('App')
      expect(layout).toContain('Site')
      expect(layout).toContain('Page')
      expect(layout).toContain('Section')
      expect(layout).toContain('Container')
      expect(layout).toContain('Grid')
      expect(layout).toContain('Stack')
    })

    it('should return landing components', () => {
      const landing = getComponentsByCategory('landing')
      expect(landing).toContain('LandingPage')
      expect(landing).toContain('Hero')
      expect(landing).toContain('Features')
      expect(landing).toContain('Pricing')
      expect(landing).toContain('FAQ')
      expect(landing).toContain('CTA')
    })

    it('should return form components', () => {
      const form = getComponentsByCategory('form')
      expect(form).toContain('Form')
      expect(form).toContain('Newsletter')
      expect(form).toContain('Contact')
    })
  })

  describe('getCategories', () => {
    it('should return all categories', () => {
      const categories = getCategories()
      expect(categories).toEqual(['layout', 'landing', 'content', 'form', 'data', 'api', 'feedback'])
    })
  })

  describe('componentHasChildren', () => {
    it('should return true for components that accept children', () => {
      expect(componentHasChildren('App')).toBe(true)
      expect(componentHasChildren('Page')).toBe(true)
      expect(componentHasChildren('Hero')).toBe(true)
      expect(componentHasChildren('Card')).toBe(true)
    })

    it('should return false for components without children', () => {
      expect(componentHasChildren('Features')).toBe(false)
      expect(componentHasChildren('Stats')).toBe(false)
      expect(componentHasChildren('Alert')).toBe(false)
      expect(componentHasChildren('Badge')).toBe(false)
    })
  })

  describe('getRequiredProps', () => {
    it('should return required props for Hero', () => {
      expect(getRequiredProps('Hero')).toEqual(['title'])
    })

    it('should return required props for Table', () => {
      expect(getRequiredProps('Table')).toEqual(['columns', 'data'])
    })

    it('should return empty array for components without required props', () => {
      expect(getRequiredProps('App')).toEqual([])
    })
  })

  describe('getDefaultProps', () => {
    it('should return default props for Hero', () => {
      expect(getDefaultProps('Hero')).toEqual({ layout: 'centered' })
    })

    it('should return default props for Alert', () => {
      expect(getDefaultProps('Alert')).toEqual({ type: 'info', dismissible: false })
    })
  })

  describe('getRelatedComponents', () => {
    it('should return related components for Hero', () => {
      const related = getRelatedComponents('Hero')
      expect(related).toContain('CTA')
      expect(related).toContain('LandingPage')
    })

    it('should return related components for FAQ', () => {
      const related = getRelatedComponents('FAQ')
      expect(related).toContain('Pricing')
      expect(related).toContain('Contact')
    })
  })

  describe('createComponents', () => {
    const mockJsx: JSXFactory = vi.fn((type, props, ...children) => ({
      type,
      props: { ...props, children: children.length === 1 ? children[0] : children },
    }))

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should create all components', () => {
      const components = createComponents(mockJsx)
      expect(Object.keys(components).length).toBe(28)
      expect(typeof components.Hero).toBe('function')
      expect(typeof components.FAQ).toBe('function')
    })

    it('should render Hero with default renderer', () => {
      const components = createComponents(mockJsx)
      const result = components.Hero({ title: 'Welcome' }) as Record<string, unknown>

      expect(mockJsx).toHaveBeenCalled()
      expect(result.type).toBe('header')
      expect((result.props as Record<string, unknown>)['data-component']).toBe('Hero')
      expect((result.props as Record<string, unknown>).title).toBe('Welcome')
    })

    it('should use custom renderer when provided', () => {
      const components = createComponents(mockJsx, {
        renderers: {
          Hero: (props, jsx) => jsx('div', { class: 'custom-hero' }, props.title),
        },
      })

      const result = components.Hero({ title: 'Custom' }) as Record<string, unknown>
      expect(result.type).toBe('div')
      expect((result.props as Record<string, unknown>).class).toBe('custom-hero')
    })

    it('should transform props when transformProps is provided', () => {
      const components = createComponents(mockJsx, {
        transformProps: (name, props) => ({
          ...props,
          'data-transformed': true,
        }),
      })

      const result = components.Alert({ message: 'Test' }) as Record<string, unknown>
      expect((result.props as Record<string, unknown>)['data-transformed']).toBe(true)
    })

    it('should include a11y role when available', () => {
      const components = createComponents(mockJsx)
      const result = components.Alert({ message: 'Test' }) as Record<string, unknown>
      expect((result.props as Record<string, unknown>).role).toBe('alert')
    })
  })

  describe('createComponent', () => {
    const mockJsx: JSXFactory = vi.fn((type, props, ...children) => ({
      type,
      props: { ...props, children },
    }))

    it('should create a single component', () => {
      const Hero = createComponent('Hero', mockJsx)
      expect(typeof Hero).toBe('function')
    })

    it('should render with custom renderer', () => {
      const Hero = createComponent('Hero', mockJsx, (props, jsx) =>
        jsx('section', { className: 'hero' }, props.title)
      )

      const result = Hero({ title: 'Test' }) as Record<string, unknown>
      expect(result.type).toBe('section')
      expect((result.props as Record<string, unknown>).className).toBe('hero')
    })
  })

  describe('createStubComponents', () => {
    it('should create components that throw when called', () => {
      const stubs = createStubComponents()
      expect(() => stubs.Hero({ title: 'Test' })).toThrow(/not implemented/)
    })
  })

  describe('createValidatedComponents', () => {
    const mockJsx: JSXFactory = vi.fn((type, props) => ({ type, props }))
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should warn when required props are missing', () => {
      const components = createValidatedComponents(mockJsx)
      // @ts-expect-error - intentionally passing invalid props
      components.Hero({})
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required prop "title"')
      )
    })

    it('should not warn when required props are provided', () => {
      const components = createValidatedComponents(mockJsx)
      components.Hero({ title: 'Test' })
      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('mergeComponents', () => {
    const mockJsx: JSXFactory = vi.fn((type, props) => ({ type, props }))

    it('should merge component sets', () => {
      const base = createComponents(mockJsx)
      const override = {
        Hero: ((props: HeroProps) => ({ custom: true, ...props })) as (props: HeroProps) => unknown,
      }

      const merged = mergeComponents(base, override)
      expect(merged.Hero).toBe(override.Hero)
      expect(merged.FAQ).toBe(base.FAQ)
    })
  })

  describe('pickComponents', () => {
    const mockJsx: JSXFactory = vi.fn((type, props) => ({ type, props }))

    it('should pick specific components', () => {
      const components = createComponents(mockJsx)
      const picked = pickComponents(components, ['Hero', 'FAQ'])

      expect(Object.keys(picked)).toEqual(['Hero', 'FAQ'])
      expect(picked.Hero).toBe(components.Hero)
      expect(picked.FAQ).toBe(components.FAQ)
    })
  })

  describe('omitComponents', () => {
    const mockJsx: JSXFactory = vi.fn((type, props) => ({ type, props }))

    it('should omit specific components', () => {
      const components = createComponents(mockJsx)
      const omitted = omitComponents(components, ['Hero', 'FAQ'])

      expect('Hero' in omitted).toBe(false)
      expect('FAQ' in omitted).toBe(false)
      expect('App' in omitted).toBe(true)
    })
  })

  describe('type safety', () => {
    it('should enforce correct prop types', () => {
      // This test validates TypeScript compile-time checking
      const heroProps: HeroProps = {
        title: 'Welcome',
        subtitle: 'Hello world',
        layout: 'centered',
        primaryAction: { label: 'Get Started', href: '/start' },
      }

      expect(heroProps.title).toBe('Welcome')
      expect(heroProps.layout).toBe('centered')
    })
  })
})
