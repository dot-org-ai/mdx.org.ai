import { describe, it, expect } from 'vitest'
import {
  hexToHsl,
  isHexColor,
  generateCSSVariables,
  generateThemeCSS,
  generateStyleObject,
} from './css.js'
import type { ThemeStyles, ThemeStyleProps } from './types.js'

describe('hexToHsl', () => {
  it('converts white to HSL', () => {
    expect(hexToHsl('#ffffff')).toBe('0 0% 100%')
  })

  it('converts black to HSL', () => {
    expect(hexToHsl('#000000')).toBe('0 0% 0%')
  })

  it('converts red to HSL', () => {
    expect(hexToHsl('#ff0000')).toBe('0 100% 50%')
  })

  it('converts blue to HSL', () => {
    expect(hexToHsl('#0000ff')).toBe('240 100% 50%')
  })

  it('handles hex without hash', () => {
    expect(hexToHsl('ffffff')).toBe('0 0% 100%')
  })
})

describe('isHexColor', () => {
  it('returns true for valid 6-digit hex', () => {
    expect(isHexColor('#ffffff')).toBe(true)
    expect(isHexColor('#000000')).toBe(true)
    expect(isHexColor('#abcdef')).toBe(true)
  })

  it('returns true for valid 3-digit hex', () => {
    expect(isHexColor('#fff')).toBe(true)
    expect(isHexColor('#000')).toBe(true)
  })

  it('returns false for invalid hex', () => {
    expect(isHexColor('ffffff')).toBe(false)
    expect(isHexColor('#gg0000')).toBe(false)
    expect(isHexColor('red')).toBe(false)
  })
})

describe('generateCSSVariables', () => {
  const styles: Partial<ThemeStyleProps> = {
    background: '#ffffff',
    foreground: '#000000',
    radius: '0.5rem',
  }

  it('generates CSS variables with HSL format', () => {
    const result = generateCSSVariables(styles, 'hsl')
    expect(result).toContain('--background: 0 0% 100%;')
    expect(result).toContain('--foreground: 0 0% 0%;')
    expect(result).toContain('--radius: 0.5rem;')
  })

  it('generates CSS variables with hex format', () => {
    const result = generateCSSVariables(styles, 'hex')
    expect(result).toContain('--background: #ffffff;')
    expect(result).toContain('--foreground: #000000;')
  })

  it('skips undefined values', () => {
    const result = generateCSSVariables({ background: '#fff', foreground: undefined })
    expect(result).toContain('--background')
    expect(result).not.toContain('--foreground')
  })
})

describe('generateThemeCSS', () => {
  const styles: ThemeStyles = {
    light: {
      background: '#ffffff',
      foreground: '#000000',
    },
    dark: {
      background: '#000000',
      foreground: '#ffffff',
    },
  }

  it('generates light and dark mode CSS', () => {
    const result = generateThemeCSS(styles)
    expect(result).toContain(':root {')
    expect(result).toContain('.dark {')
    expect(result).toContain('--background: 0 0% 100%;')
    expect(result).toContain('--background: 0 0% 0%;')
  })

  it('uses custom selectors', () => {
    const result = generateThemeCSS(styles, {
      lightSelector: 'html',
      darkSelector: 'html.dark',
    })
    expect(result).toContain('html {')
    expect(result).toContain('html.dark {')
  })
})

describe('generateStyleObject', () => {
  it('generates style object with CSS custom properties', () => {
    const result = generateStyleObject({
      background: '#ffffff',
      primary: '#3b82f6',
    })
    expect(result).toEqual({
      '--background': '#ffffff',
      '--primary': '#3b82f6',
    })
  })

  it('converts to HSL when requested', () => {
    const result = generateStyleObject({ background: '#ffffff' }, 'hsl')
    expect(result['--background']).toBe('0 0% 100%')
  })
})
