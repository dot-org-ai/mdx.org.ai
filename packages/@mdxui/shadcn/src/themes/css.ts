/**
 * CSS generation utilities for themes
 *
 * Generates CSS custom properties from theme styles
 */

import type { ThemeStyleProps, ThemeStyles, ThemeCSSOptions } from './types.js'

/**
 * Convert hex color to HSL format
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse hex values
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/**
 * Check if a string is a valid hex color
 */
export function isHexColor(value: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)
}

/**
 * Color tokens that should be converted to HSL
 */
const colorTokens = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'shadow-color',
]

/**
 * Generate CSS variables for a single mode
 */
export function generateCSSVariables(
  styles: Partial<ThemeStyleProps>,
  format: 'hsl' | 'hex' = 'hsl'
): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined) continue

    let cssValue = value

    // Convert hex colors to HSL format if requested
    if (format === 'hsl' && colorTokens.includes(key) && isHexColor(value)) {
      cssValue = hexToHsl(value)
    }

    lines.push(`  --${key}: ${cssValue};`)
  }

  return lines.join('\n')
}

/**
 * Generate complete CSS for a theme
 */
export function generateThemeCSS(
  styles: ThemeStyles,
  options: ThemeCSSOptions = {}
): string {
  const {
    format = 'hsl',
    lightSelector = ':root',
    darkSelector = '.dark',
  } = options

  const lightVars = generateCSSVariables(styles.light, format)
  const darkVars = generateCSSVariables(styles.dark, format)

  let css = ''

  // Light mode
  css += `${lightSelector} {\n`
  css += lightVars
  css += '\n}\n\n'

  // Dark mode
  css += `${darkSelector} {\n`
  css += darkVars
  css += '\n}'

  return css
}

/**
 * Generate Tailwind v4 @theme inline block
 */
export function generateTailwindV4Theme(styles: ThemeStyles): string {
  const lightVars = generateCSSVariables(styles.light, 'hsl')
  const darkVars = generateCSSVariables(styles.dark, 'hsl')

  let css = '@theme inline {\n'

  // Convert to Tailwind v4 format with --color- prefix
  const formatForTailwind = (vars: string) => {
    return vars
      .split('\n')
      .map(line => {
        // Color tokens get --color- prefix
        const colorMatch = line.match(/^\s*--(background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|sidebar|chart)/i)
        if (colorMatch) {
          return line.replace(/--/, '--color-')
        }
        // Radius gets special handling
        if (line.includes('--radius')) {
          return line.replace('--radius', '--radius-DEFAULT')
        }
        return line
      })
      .join('\n')
  }

  css += '  /* Light mode colors */\n'
  css += formatForTailwind(lightVars)
  css += '\n}\n\n'

  css += '.dark {\n'
  css += '  @theme inline {\n'
  css += formatForTailwind(darkVars)
  css += '\n  }\n'
  css += '}'

  return css
}

/**
 * Generate inline style object from theme styles
 */
export function generateStyleObject(
  styles: Partial<ThemeStyleProps>,
  format: 'hsl' | 'hex' = 'hex'
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined) continue

    let cssValue = value

    if (format === 'hsl' && colorTokens.includes(key) && isHexColor(value)) {
      cssValue = hexToHsl(value)
    }

    result[`--${key}`] = cssValue
  }

  return result
}

/**
 * Apply theme variables to document root
 */
export function applyTheme(
  styles: Partial<ThemeStyleProps>,
  element: HTMLElement = document.documentElement
): void {
  const styleObj = generateStyleObject(styles, 'hsl')

  for (const [property, value] of Object.entries(styleObj)) {
    element.style.setProperty(property, value)
  }
}

/**
 * Remove theme variables from document root
 */
export function removeTheme(
  styles: Partial<ThemeStyleProps>,
  element: HTMLElement = document.documentElement
): void {
  for (const key of Object.keys(styles)) {
    element.style.removeProperty(`--${key}`)
  }
}
