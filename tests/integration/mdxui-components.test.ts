/**
 * Integration tests for mdxui component factory
 *
 * Tests the component factory with different JSX runtimes:
 * - Mock JSX factory
 * - React createElement
 * - Custom renderers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import {
  createComponents,
  createComponent,
  createStubComponents,
  createValidatedComponents,
  mergeComponents,
  pickComponents,
  omitComponents,
  getComponentNames,
  getComponentMeta,
  getComponentsByCategory,
  componentRegistry,
  type ComponentName,
  type HeroProps,
  type FeaturesProps,
  type FAQProps,
  type PricingProps,
  type BlogProps,
  type FormProps,
  type TableProps,
  type APIProps,
  type AlertProps,
} from 'mdxui'

import { createMockJsx } from '../shared/helpers/index.js'

describe('mdxui Component Factory Integration', () => {
  describe('createComponents with mock JSX', () => {
    it('should create all 28 components', () => {
      const { jsx } = createMockJsx()
      const components = createComponents(jsx)

      const names = getComponentNames()
      expect(names.length).toBe(28)

      for (const name of names) {
        expect(typeof components[name]).toBe('function')
      }
    })

    it('should render Hero with correct semantic element', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      components.Hero({ title: 'Welcome to Our Site', subtitle: 'Start building today' })

      const call = getLastCall()
      expect(call.type).toBe('header')
      expect(call.props['data-component']).toBe('Hero')
      expect(call.props.title).toBe('Welcome to Our Site')
      expect(call.props.subtitle).toBe('Start building today')
    })

    it('should render Features with correct structure', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      const features: FeaturesProps['items'] = [
        { title: 'Fast', description: 'Lightning speed' },
        { title: 'Secure', description: 'Enterprise security' },
      ]

      components.Features({ title: 'Our Features', items: features })

      const call = getLastCall()
      expect(call.type).toBe('section')
      expect(call.props.items).toEqual(features)
    })

    it('should render FAQ component', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      const faqItems: FAQProps['items'] = [
        { question: 'What is this?', answer: 'A great product' },
        { question: 'How much?', answer: 'Free to start' },
      ]

      components.FAQ({ title: 'FAQs', items: faqItems })

      const call = getLastCall()
      expect(call.type).toBe('section')
      expect(call.props.items).toEqual(faqItems)
    })

    it('should render Pricing with tiers', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      const tiers: PricingProps['tiers'] = [
        { name: 'Free', price: '$0', features: ['1 project', 'Basic support'] },
        { name: 'Pro', price: '$29', features: ['Unlimited', 'Priority support'], featured: true },
      ]

      components.Pricing({ title: 'Pricing', tiers })

      const call = getLastCall()
      expect(call.props.tiers).toEqual(tiers)
    })

    it('should render Blog with posts', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      const posts: BlogProps['posts'] = [
        { title: 'First Post', slug: 'first', excerpt: 'Hello' },
        { title: 'Second Post', slug: 'second', excerpt: 'World' },
      ]

      components.Blog({ title: 'Our Blog', posts })

      const call = getLastCall()
      expect(call.props.posts).toEqual(posts)
    })

    it('should render Form with fields', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      const fields: FormProps['fields'] = [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'message', label: 'Message', type: 'textarea' },
      ]

      components.Form({ fields, submitLabel: 'Send' })

      const call = getLastCall()
      expect(call.type).toBe('form')
      expect(call.props.fields).toEqual(fields)
    })

    it('should render Table with data', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      const columns: TableProps['columns'] = [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
      ]
      const data = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ]

      components.Table({ columns, data })

      const call = getLastCall()
      expect(call.type).toBe('table')
      expect(call.props.role).toBe('grid')
    })

    it('should render API documentation', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      const endpoints: APIProps['endpoints'] = [
        { method: 'GET', path: '/users', description: 'List users' },
        { method: 'POST', path: '/users', description: 'Create user' },
      ]

      components.API({ title: 'User API', endpoints })

      const call = getLastCall()
      expect(call.props.endpoints).toEqual(endpoints)
    })

    it('should render Alert with a11y role', () => {
      const { jsx, getLastCall } = createMockJsx()
      const components = createComponents(jsx)

      components.Alert({ message: 'Success!', type: 'success' })

      const call = getLastCall()
      expect(call.props.role).toBe('alert')
      expect(call.props.message).toBe('Success!')
    })
  })

  describe('createComponents with React.createElement', () => {
    it('should create components compatible with React', () => {
      const components = createComponents(React.createElement)

      const heroElement = components.Hero({
        title: 'React Hero',
        subtitle: 'Built with React',
      })

      expect(heroElement).toBeDefined()
      expect((heroElement as React.ReactElement).type).toBe('header')
      expect((heroElement as React.ReactElement).props['data-component']).toBe('Hero')
    })

    it('should render children correctly', () => {
      const components = createComponents(React.createElement)

      const pageElement = components.Page({
        title: 'My Page',
        children: React.createElement('div', null, 'Page content'),
      })

      expect(pageElement).toBeDefined()
      expect((pageElement as React.ReactElement).type).toBe('main')
      expect((pageElement as React.ReactElement).props.children).toBeDefined()
    })

    it('should compose multiple components', () => {
      const components = createComponents(React.createElement)

      const landingPage = React.createElement(
        'div',
        null,
        components.Hero({ title: 'Welcome' }),
        components.Features({
          items: [
            { title: 'Feature 1', description: 'Desc 1' },
          ],
        }),
        components.CTA({ title: 'Get Started' })
      )

      expect(landingPage.props.children.length).toBe(3)
    })
  })

  describe('Custom renderers', () => {
    it('should use custom renderer for specific component', () => {
      const { jsx, getLastCall } = createMockJsx()

      const components = createComponents(jsx, {
        renderers: {
          Hero: (props, jsxFn) =>
            jsxFn('div', { className: 'custom-hero', 'data-title': props.title }),
        },
      })

      components.Hero({ title: 'Custom Hero' })

      const call = getLastCall()
      expect(call.type).toBe('div')
      expect(call.props.className).toBe('custom-hero')
      expect(call.props['data-title']).toBe('Custom Hero')
    })

    it('should allow multiple custom renderers', () => {
      const { jsx, calls } = createMockJsx()

      const components = createComponents(jsx, {
        renderers: {
          Hero: (props, jsxFn) => jsxFn('header', { id: 'hero' }, props.title),
          CTA: (props, jsxFn) => jsxFn('aside', { id: 'cta' }, props.title),
          Alert: (props, jsxFn) => jsxFn('div', { role: 'status' }, props.message),
        },
      })

      components.Hero({ title: 'Hero' })
      components.CTA({ title: 'CTA' })
      components.Alert({ message: 'Alert' })

      expect(calls[0].type).toBe('header')
      expect(calls[1].type).toBe('aside')
      expect(calls[2].type).toBe('div')
    })

    it('should transform props before rendering', () => {
      const { jsx, getLastCall } = createMockJsx()

      const components = createComponents(jsx, {
        transformProps: (name, props) => ({
          ...props,
          'data-component-name': name,
          'data-timestamp': '2024-01-01',
        }),
      })

      components.Badge({ label: 'New' })

      const call = getLastCall()
      expect(call.props['data-component-name']).toBe('Badge')
      expect(call.props['data-timestamp']).toBe('2024-01-01')
    })
  })

  describe('createComponent (single)', () => {
    it('should create individual component', () => {
      const { jsx, getLastCall } = createMockJsx()

      const Hero = createComponent('Hero', jsx)
      Hero({ title: 'Single Hero' })

      const call = getLastCall()
      expect(call.type).toBe('header')
      expect(call.props.title).toBe('Single Hero')
    })

    it('should accept custom renderer for single component', () => {
      const { jsx, getLastCall } = createMockJsx()

      const Hero = createComponent('Hero', jsx, (props, jsxFn) =>
        jsxFn('section', { className: 'hero-section' }, props.title)
      )

      Hero({ title: 'Custom Single' })

      const call = getLastCall()
      expect(call.type).toBe('section')
      expect(call.props.className).toBe('hero-section')
    })
  })

  describe('createStubComponents', () => {
    it('should throw when stub component is called', () => {
      const stubs = createStubComponents()

      expect(() => stubs.Hero({ title: 'Test' })).toThrow('not implemented')
      expect(() => stubs.FAQ({ items: [] })).toThrow('not implemented')
    })

    it('should include all component names', () => {
      const stubs = createStubComponents()
      const names = getComponentNames()

      for (const name of names) {
        expect(typeof stubs[name]).toBe('function')
      }
    })
  })

  describe('createValidatedComponents', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should warn when required props are missing', () => {
      const { jsx } = createMockJsx()
      const components = createValidatedComponents(jsx)

      // @ts-expect-error - intentionally omitting required prop
      components.Hero({})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required prop "title"')
      )
    })

    it('should warn for multiple missing required props', () => {
      const { jsx } = createMockJsx()
      const components = createValidatedComponents(jsx)

      // @ts-expect-error - intentionally omitting required props
      components.Table({})

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required prop "columns"')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required prop "data"')
      )
    })

    it('should not warn when all required props are provided', () => {
      const { jsx } = createMockJsx()
      const components = createValidatedComponents(jsx)

      components.Hero({ title: 'Valid Hero' })
      components.Table({ columns: [], data: [] })
      components.Alert({ message: 'Valid Alert' })

      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('Component utilities', () => {
    it('should merge component sets', () => {
      const { jsx: jsx1 } = createMockJsx()
      const { jsx: jsx2, getLastCall } = createMockJsx()

      const base = createComponents(jsx1)
      const custom = createComponents(jsx2, {
        renderers: {
          Hero: (props, jsxFn) => jsxFn('div', { id: 'custom-hero' }, props.title),
        },
      })

      const merged = mergeComponents(base, { Hero: custom.Hero })

      ;(merged.Hero as (props: HeroProps) => unknown)({ title: 'Merged' })
      const call = getLastCall()
      expect(call.props.id).toBe('custom-hero')
    })

    it('should pick specific components', () => {
      const { jsx } = createMockJsx()
      const components = createComponents(jsx)

      const picked = pickComponents(components, ['Hero', 'CTA', 'FAQ'])

      expect(Object.keys(picked)).toEqual(['Hero', 'CTA', 'FAQ'])
      expect(picked.Hero).toBe(components.Hero)
    })

    it('should omit specific components', () => {
      const { jsx } = createMockJsx()
      const components = createComponents(jsx)

      const omitted = omitComponents(components, ['Hero', 'CTA'])

      expect('Hero' in omitted).toBe(false)
      expect('CTA' in omitted).toBe(false)
      expect('FAQ' in omitted).toBe(true)
      expect('Page' in omitted).toBe(true)
    })
  })

  describe('Component metadata integration', () => {
    it('should use correct semantic elements from registry', () => {
      const { jsx, calls } = createMockJsx()
      const components = createComponents(jsx)

      // Test various semantic elements
      components.Page({ title: 'Page' })
      components.Table({ columns: [], data: [] })
      components.Form({ fields: [] })
      components.Progress({ value: 50 })

      expect(calls[0].type).toBe('main') // Page
      expect(calls[1].type).toBe('table') // Table
      expect(calls[2].type).toBe('form') // Form
      expect(calls[3].type).toBe('progress') // Progress
    })

    it('should apply a11y roles from registry', () => {
      const { jsx, calls } = createMockJsx()
      const components = createComponents(jsx)

      components.Alert({ message: 'Alert' })
      components.Progress({ value: 50 })
      components.Table({ columns: [], data: [] })

      expect(calls[0].props.role).toBe('alert')
      expect(calls[1].props.role).toBe('progressbar')
      expect(calls[2].props.role).toBe('grid')
    })

    it('should get components by category', () => {
      const landingComponents = getComponentsByCategory('landing')
      expect(landingComponents).toContain('Hero')
      expect(landingComponents).toContain('Features')
      expect(landingComponents).toContain('Pricing')
      expect(landingComponents).toContain('FAQ')
      expect(landingComponents).toContain('CTA')

      const formComponents = getComponentsByCategory('form')
      expect(formComponents).toContain('Form')
      expect(formComponents).toContain('Newsletter')
      expect(formComponents).toContain('Contact')
    })

    it('should provide related components', () => {
      const heroMeta = getComponentMeta('Hero')
      expect(heroMeta.related).toContain('CTA')
      expect(heroMeta.related).toContain('LandingPage')

      const pricingMeta = getComponentMeta('Pricing')
      expect(pricingMeta.related).toContain('FAQ')
      expect(pricingMeta.related).toContain('CTA')
    })
  })
})

describe('Component Factory with Complex Props', () => {
  it('should handle nested object props', () => {
    const { jsx, getLastCall } = createMockJsx()
    const components = createComponents(jsx)

    components.LandingPage({
      hero: {
        title: 'Welcome',
        subtitle: 'Get started',
        primaryAction: { label: 'Sign Up', href: '/signup' },
      },
      features: {
        items: [{ title: 'Fast', description: 'Speed' }],
      },
    })

    const call = getLastCall()
    expect(call.props.hero.title).toBe('Welcome')
    expect(call.props.hero.primaryAction.label).toBe('Sign Up')
  })

  it('should handle array props', () => {
    const { jsx, getLastCall } = createMockJsx()
    const components = createComponents(jsx)

    components.Site({
      nav: [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
      social: [
        { platform: 'twitter', url: 'https://twitter.com/example' },
        { platform: 'github', url: 'https://github.com/example' },
      ],
    })

    const call = getLastCall()
    expect(call.props.nav.length).toBe(3)
    expect(call.props.social.length).toBe(2)
  })

  it('should handle optional props', () => {
    const { jsx, getLastCall } = createMockJsx()
    const components = createComponents(jsx)

    // Only required props
    components.Hero({ title: 'Minimal' })

    const call = getLastCall()
    expect(call.props.title).toBe('Minimal')
    expect(call.props.subtitle).toBeUndefined()
    expect(call.props.primaryAction).toBeUndefined()
  })
})
