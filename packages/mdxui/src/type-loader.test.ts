import { describe, it, expect } from 'vitest'
import { join } from 'path'
import {
  parsePropDef,
  parsePartDef,
  parseCSSVariableDef,
  parseComponentType,
  loadComponentTypes,
  getTypesByCategory,
  getTypeCategories,
  generateTypeScriptInterface,
} from './type-loader.js'

describe('type-loader', () => {
  describe('parsePropDef', () => {
    it('parses simple required prop', () => {
      const result = parsePropDef('title: string')
      expect(result).toEqual({
        name: 'title',
        type: 'string',
        required: true,
        default: undefined,
        isArray: false,
        baseType: 'string',
      })
    })

    it('parses optional prop with ?', () => {
      const result = parsePropDef('subtitle: string?')
      expect(result).toEqual({
        name: 'subtitle',
        type: 'string',
        required: false,
        default: undefined,
        isArray: false,
        baseType: 'string',
      })
    })

    it('parses array prop', () => {
      const result = parsePropDef('nav: NavItem[]')
      expect(result).toEqual({
        name: 'nav',
        type: 'NavItem[]',
        required: true,
        default: undefined,
        isArray: true,
        baseType: 'NavItem',
      })
    })

    it('parses optional array prop', () => {
      const result = parsePropDef('tags: string[]?')
      expect(result).toEqual({
        name: 'tags',
        type: 'string[]',
        required: false,
        default: undefined,
        isArray: true,
        baseType: 'string',
      })
    })

    it('parses prop with default value', () => {
      const result = parsePropDef("layout: 'grid' | 'list' = 'grid'")
      expect(result).toEqual({
        name: 'layout',
        type: "'grid' | 'list'",
        required: false,
        default: "'grid'",
        isArray: false,
        baseType: 'grid',
      })
    })

    it('parses boolean prop with default', () => {
      const result = parsePropDef('sticky: boolean = true')
      expect(result).toEqual({
        name: 'sticky',
        type: 'boolean',
        required: false,
        default: 'true',
        isArray: false,
        baseType: 'boolean',
      })
    })

    it('parses number prop with default', () => {
      const result = parsePropDef('columns: 2 | 3 | 4 = 3')
      expect(result).toEqual({
        name: 'columns',
        type: '2 | 3 | 4',
        required: false,
        default: '3',
        isArray: false,
        baseType: '2',
      })
    })
  })

  describe('parsePartDef', () => {
    it('parses required part', () => {
      const result = parsePartDef('root: section')
      expect(result).toEqual({
        name: 'root',
        element: 'section',
        optional: false,
      })
    })

    it('parses optional part', () => {
      const result = parsePartDef('sidebar: aside?')
      expect(result).toEqual({
        name: 'sidebar',
        element: 'aside',
        optional: true,
      })
    })

    it('parses hyphenated part names', () => {
      const result = parsePartDef('header-title: h1')
      expect(result).toEqual({
        name: 'header-title',
        element: 'h1',
        optional: false,
      })
    })
  })

  describe('parseCSSVariableDef', () => {
    it('parses CSS variable with rem value', () => {
      const result = parseCSSVariableDef('--hero-padding: 4rem')
      expect(result).toEqual({
        name: '--hero-padding',
        value: '4rem',
      })
    })

    it('parses CSS variable with var() value', () => {
      const result = parseCSSVariableDef('--hero-bg: var(--color-background)')
      expect(result).toEqual({
        name: '--hero-bg',
        value: 'var(--color-background)',
      })
    })

    it('parses CSS variable with pixel value', () => {
      const result = parseCSSVariableDef('--header-height: 64px')
      expect(result).toEqual({
        name: '--header-height',
        value: '64px',
      })
    })
  })

  describe('parseComponentType', () => {
    it('parses a complete component type', () => {
      const content = `---
$type: https://mdx.org.ai/ComponentSpec
$id: https://mdx.org.ai/types/Hero
name: Hero
category: landing
description: Hero section with headline and CTAs
semanticElement: header
outputs: [html, markdown, json]
related: [LandingPage, CTA]

# Props
title: string
subtitle: string?
layout: 'centered' | 'split' = 'centered'

# Parts
root: header
content: div
title: h1

# CSS Variables
--hero-padding: 4rem
--hero-bg: var(--color-background)
---

# Hero

Hero section documentation here.
`

      const componentType = parseComponentType(content, 'Hero.mdx')

      expect(componentType.name).toBe('Hero')
      expect(componentType.$type).toBe('https://mdx.org.ai/ComponentSpec')
      expect(componentType.$id).toBe('https://mdx.org.ai/types/Hero')
      expect(componentType.category).toBe('landing')
      expect(componentType.description).toBe('Hero section with headline and CTAs')
      expect(componentType.semanticElement).toBe('header')
      expect(componentType.outputs).toEqual(['html', 'markdown', 'json'])
      expect(componentType.related).toEqual(['LandingPage', 'CTA'])
      expect(componentType.props).toHaveLength(3)
      expect(componentType.parts).toHaveLength(3)
      expect(componentType.cssVariables).toHaveLength(2)
      expect(componentType.content).toContain('Hero section documentation here.')
    })
  })

  describe('loadComponentTypes', () => {
    it('loads types from types directory', () => {
      const typesDir = join(__dirname, '../../../types')
      const types = loadComponentTypes(typesDir)

      expect(types.length).toBeGreaterThan(0)

      // Verify we have expected components
      const names = types.map((t) => t.name)
      expect(names).toContain('Hero')
      expect(names).toContain('Site')
      expect(names).toContain('Page')
      expect(names).toContain('Dashboard')
    })

    it('correctly parses Hero component', () => {
      const typesDir = join(__dirname, '../../../types')
      const types = loadComponentTypes(typesDir)
      const hero = types.find((t) => t.name === 'Hero')

      expect(hero).toBeDefined()
      expect(hero?.category).toBe('landing')
      expect(hero?.props.length).toBeGreaterThan(0)
    })
  })

  describe('getTypesByCategory', () => {
    it('filters types by category', () => {
      const typesDir = join(__dirname, '../../../types')
      const types = loadComponentTypes(typesDir)
      const landing = getTypesByCategory(types, 'landing')

      expect(landing.length).toBeGreaterThan(0)
      expect(landing.every((t) => t.category === 'landing')).toBe(true)
    })
  })

  describe('getTypeCategories', () => {
    it('returns all unique categories', () => {
      const typesDir = join(__dirname, '../../../types')
      const types = loadComponentTypes(typesDir)
      const categories = getTypeCategories(types)

      expect(categories).toContain('layout')
      expect(categories).toContain('landing')
      expect(categories).toContain('content')
      expect(categories).toContain('app')
    })
  })

  describe('generateTypeScriptInterface', () => {
    it('generates TypeScript interface from type', () => {
      const componentType = parseComponentType(
        `---
name: Hero
category: landing
description: Hero section

# Props
title: string
subtitle: string?
---
`,
        'Hero.mdx'
      )

      const ts = generateTypeScriptInterface(componentType)
      expect(ts).toContain('export interface HeroProps')
      expect(ts).toContain('title: string')
      expect(ts).toContain('subtitle?: string')
    })
  })
})
