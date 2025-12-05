/**
 * @mdxui/gluestack/themes - Theme configuration for Gluestack MDX components
 *
 * Provides theme presets and utilities for customizing MDX rendering.
 *
 * @packageDocumentation
 */

/**
 * MDX theme color configuration
 */
export interface MDXThemeColors {
  text: string
  textMuted: string
  heading: string
  link: string
  linkHover: string
  code: string
  codeBg: string
  blockquoteBorder: string
  blockquoteText: string
  border: string
  background: string
}

/**
 * MDX theme spacing configuration
 */
export interface MDXThemeSpacing {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

/**
 * MDX theme font sizes
 */
export interface MDXThemeFontSizes {
  xs: number
  sm: number
  base: number
  lg: number
  xl: number
  '2xl': number
  '3xl': number
  '4xl': number
}

/**
 * Complete MDX theme configuration
 */
export interface MDXTheme {
  name: string
  colors: {
    light: MDXThemeColors
    dark: MDXThemeColors
  }
  spacing: MDXThemeSpacing
  fontSizes: MDXThemeFontSizes
  borderRadius: {
    sm: number
    md: number
    lg: number
    xl: number
  }
}

/**
 * Default light colors
 */
export const lightColors: MDXThemeColors = {
  text: '#1a1a1a',
  textMuted: '#666666',
  heading: '#000000',
  link: '#0066cc',
  linkHover: '#0052a3',
  code: '#e83e8c',
  codeBg: '#f4f4f4',
  blockquoteBorder: '#e0e0e0',
  blockquoteText: '#666666',
  border: '#e0e0e0',
  background: '#ffffff',
}

/**
 * Default dark colors
 */
export const darkColors: MDXThemeColors = {
  text: '#e0e0e0',
  textMuted: '#999999',
  heading: '#ffffff',
  link: '#66b3ff',
  linkHover: '#99ccff',
  code: '#ff79c6',
  codeBg: '#2d2d2d',
  blockquoteBorder: '#404040',
  blockquoteText: '#999999',
  border: '#404040',
  background: '#1a1a1a',
}

/**
 * Default spacing scale
 */
export const defaultSpacing: MDXThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}

/**
 * Default font size scale
 */
export const defaultFontSizes: MDXThemeFontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
}

/**
 * Default theme
 */
export const defaultTheme: MDXTheme = {
  name: 'default',
  colors: {
    light: lightColors,
    dark: darkColors,
  },
  spacing: defaultSpacing,
  fontSizes: defaultFontSizes,
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
}

/**
 * Prose theme - optimized for long-form reading
 */
export const proseTheme: MDXTheme = {
  name: 'prose',
  colors: {
    light: {
      ...lightColors,
      text: '#374151',
      heading: '#111827',
    },
    dark: {
      ...darkColors,
      text: '#d1d5db',
      heading: '#f9fafb',
    },
  },
  spacing: defaultSpacing,
  fontSizes: {
    ...defaultFontSizes,
    base: 18,
    lg: 20,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
}

/**
 * Documentation theme - clean and minimal
 */
export const docsTheme: MDXTheme = {
  name: 'docs',
  colors: {
    light: {
      ...lightColors,
      background: '#fafafa',
      codeBg: '#f0f0f0',
    },
    dark: {
      ...darkColors,
      background: '#121212',
      codeBg: '#1e1e1e',
    },
  },
  spacing: defaultSpacing,
  fontSizes: defaultFontSizes,
  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
  },
}

/**
 * Blog theme - warm and inviting
 */
export const blogTheme: MDXTheme = {
  name: 'blog',
  colors: {
    light: {
      ...lightColors,
      background: '#fffbf5',
      text: '#2d2a26',
      heading: '#1a1816',
      link: '#b45309',
      linkHover: '#92400e',
    },
    dark: {
      ...darkColors,
      background: '#1c1a18',
      text: '#e8e4df',
      heading: '#faf7f2',
      link: '#fbbf24',
      linkHover: '#fcd34d',
    },
  },
  spacing: defaultSpacing,
  fontSizes: {
    ...defaultFontSizes,
    base: 18,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },
}

/**
 * Theme presets
 */
export const themePresets: Record<string, MDXTheme> = {
  default: defaultTheme,
  prose: proseTheme,
  docs: docsTheme,
  blog: blogTheme,
}

/**
 * Get a theme by name
 */
export function getTheme(name: keyof typeof themePresets): MDXTheme {
  return themePresets[name] || themePresets.default
}

/**
 * Create a custom theme by extending a preset
 */
export function createTheme(
  base: keyof typeof themePresets | MDXTheme,
  overrides: Partial<MDXTheme>
): MDXTheme {
  const baseTheme = typeof base === 'string' ? getTheme(base) : base

  return {
    ...baseTheme,
    ...overrides,
    name: overrides.name || baseTheme.name,
    colors: {
      light: { ...baseTheme.colors.light, ...overrides.colors?.light },
      dark: { ...baseTheme.colors.dark, ...overrides.colors?.dark },
    },
    spacing: { ...baseTheme.spacing, ...overrides.spacing },
    fontSizes: { ...baseTheme.fontSizes, ...overrides.fontSizes },
    borderRadius: { ...baseTheme.borderRadius, ...overrides.borderRadius },
  }
}

/**
 * NativeWind-compatible class names for theming
 *
 * Use these with NativeWind's className prop for consistent styling
 */
export const nativeWindClasses = {
  prose: {
    container: 'max-w-prose mx-auto px-4',
    h1: 'text-4xl font-bold mt-8 mb-4',
    h2: 'text-3xl font-bold mt-6 mb-3',
    h3: 'text-2xl font-semibold mt-5 mb-2',
    h4: 'text-xl font-semibold mt-4 mb-2',
    p: 'text-base leading-7 mb-4',
    a: 'text-blue-600 hover:text-blue-800 underline',
    code: 'bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono',
    pre: 'bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto my-4',
    blockquote: 'border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic my-4',
    ul: 'list-disc list-inside my-4 space-y-2',
    ol: 'list-decimal list-inside my-4 space-y-2',
    li: 'leading-7',
    hr: 'border-t border-gray-300 dark:border-gray-700 my-8',
    img: 'rounded-lg my-4 max-w-full',
  },
  docs: {
    container: 'max-w-4xl mx-auto px-6',
    h1: 'text-3xl font-bold mt-6 mb-3',
    h2: 'text-2xl font-bold mt-5 mb-2 border-b pb-2',
    h3: 'text-xl font-semibold mt-4 mb-2',
    h4: 'text-lg font-semibold mt-3 mb-1',
    p: 'text-base leading-6 mb-3',
    a: 'text-primary-600 hover:text-primary-800',
    code: 'bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600',
    pre: 'bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto my-3 border',
    blockquote: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 pl-4 py-2 my-4',
    ul: 'my-3 ml-4 space-y-1',
    ol: 'my-3 ml-4 space-y-1',
    li: 'leading-6',
    hr: 'border-t my-6',
    img: 'rounded my-4',
  },
}
