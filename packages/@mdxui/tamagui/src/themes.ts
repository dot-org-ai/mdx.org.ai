/**
 * @mdxui/tamagui/themes - Theme presets for MDX rendering
 *
 * Provides pre-configured themes that work well with MDX content.
 *
 * @packageDocumentation
 */

import { createTamagui, createTokens, createTheme } from '@tamagui/core'
import { config as tamaguiConfig } from '@tamagui/config'

/**
 * MDX-optimized color tokens
 */
export const mdxTokens = createTokens({
  ...tamaguiConfig.tokens,
  color: {
    ...tamaguiConfig.tokens.color,
    // MDX-specific semantic colors
    mdxText: '#1a1a1a',
    mdxTextDark: '#e0e0e0',
    mdxHeading: '#000000',
    mdxHeadingDark: '#ffffff',
    mdxLink: '#0066cc',
    mdxLinkDark: '#66b3ff',
    mdxCode: '#e83e8c',
    mdxCodeDark: '#ff79c6',
    mdxCodeBg: '#f4f4f4',
    mdxCodeBgDark: '#2d2d2d',
    mdxBlockquote: '#666666',
    mdxBlockquoteDark: '#999999',
    mdxBorder: '#e0e0e0',
    mdxBorderDark: '#404040',
  },
})

/**
 * Light theme optimized for reading MDX content
 */
export const mdxLightTheme = createTheme({
  background: '#ffffff',
  backgroundHover: '#f5f5f5',
  backgroundPress: '#eeeeee',
  backgroundFocus: '#f0f0f0',
  color: '$mdxText',
  colorHover: '$mdxText',
  colorPress: '$mdxText',
  colorFocus: '$mdxText',
  borderColor: '$mdxBorder',
  borderColorHover: '#d0d0d0',
  shadowColor: 'rgba(0,0,0,0.1)',
  shadowColorHover: 'rgba(0,0,0,0.15)',
})

/**
 * Dark theme optimized for reading MDX content
 */
export const mdxDarkTheme = createTheme({
  background: '#1a1a1a',
  backgroundHover: '#252525',
  backgroundPress: '#303030',
  backgroundFocus: '#2a2a2a',
  color: '$mdxTextDark',
  colorHover: '$mdxTextDark',
  colorPress: '$mdxTextDark',
  colorFocus: '$mdxTextDark',
  borderColor: '$mdxBorderDark',
  borderColorHover: '#505050',
  shadowColor: 'rgba(0,0,0,0.3)',
  shadowColorHover: 'rgba(0,0,0,0.4)',
})

/**
 * Prose theme - optimized typography for long-form content
 */
export const proseTheme = {
  light: {
    ...mdxLightTheme,
    // Additional prose-specific tokens could go here
  },
  dark: {
    ...mdxDarkTheme,
  },
}

/**
 * Documentation theme - clean, minimal styling for docs
 */
export const docsTheme = {
  light: {
    ...mdxLightTheme,
    background: '#fafafa',
  },
  dark: {
    ...mdxDarkTheme,
    background: '#121212',
  },
}

/**
 * Blog theme - slightly warmer colors for blog posts
 */
export const blogTheme = {
  light: {
    ...mdxLightTheme,
    background: '#fffbf5',
    color: '#2d2a26',
  },
  dark: {
    ...mdxDarkTheme,
    background: '#1c1a18',
    color: '#e8e4df',
  },
}

/**
 * Theme configuration type
 */
export interface MDXThemeConfig {
  name: string
  light: typeof mdxLightTheme
  dark: typeof mdxDarkTheme
}

/**
 * Available theme presets
 */
export const themePresets: Record<string, MDXThemeConfig> = {
  default: {
    name: 'default',
    light: mdxLightTheme,
    dark: mdxDarkTheme,
  },
  prose: {
    name: 'prose',
    light: proseTheme.light,
    dark: proseTheme.dark,
  },
  docs: {
    name: 'docs',
    light: docsTheme.light,
    dark: docsTheme.dark,
  },
  blog: {
    name: 'blog',
    light: blogTheme.light,
    dark: blogTheme.dark,
  },
}

/**
 * Create a Tamagui config with MDX themes
 *
 * @example
 * ```tsx
 * import { createMDXTamaguiConfig } from '@mdxui/tamagui/themes'
 *
 * const config = createMDXTamaguiConfig({
 *   preset: 'docs',
 *   // Additional Tamagui config options
 * })
 *
 * export default config
 * ```
 */
export function createMDXTamaguiConfig(options: {
  preset?: keyof typeof themePresets
  tokens?: Partial<typeof mdxTokens>
  themes?: Record<string, typeof mdxLightTheme>
} = {}) {
  const { preset = 'default', tokens: customTokens, themes: customThemes } = options
  const selectedPreset = themePresets[preset]

  const tokens = customTokens
    ? createTokens({ ...mdxTokens, ...customTokens })
    : mdxTokens

  const themes = {
    light: selectedPreset.light,
    dark: selectedPreset.dark,
    ...customThemes,
  }

  return createTamagui({
    ...tamaguiConfig,
    tokens,
    themes,
  })
}

/**
 * Get theme by name
 */
export function getTheme(name: keyof typeof themePresets): MDXThemeConfig {
  return themePresets[name] || themePresets.default
}
