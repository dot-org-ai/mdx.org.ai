/**
 * Theme types for @mdxui/shadcn
 *
 * Based on tweakcn theme system
 * @see https://github.com/jnsahaj/tweakcn
 */

/**
 * Color tokens used in themes
 */
export interface ThemeColorTokens {
  background?: string
  foreground?: string
  card?: string
  'card-foreground'?: string
  popover?: string
  'popover-foreground'?: string
  primary?: string
  'primary-foreground'?: string
  secondary?: string
  'secondary-foreground'?: string
  muted?: string
  'muted-foreground'?: string
  accent?: string
  'accent-foreground'?: string
  destructive?: string
  'destructive-foreground'?: string
  border?: string
  input?: string
  ring?: string
  // Sidebar tokens
  sidebar?: string
  'sidebar-foreground'?: string
  'sidebar-primary'?: string
  'sidebar-primary-foreground'?: string
  'sidebar-accent'?: string
  'sidebar-accent-foreground'?: string
  'sidebar-border'?: string
  'sidebar-ring'?: string
  // Chart tokens
  'chart-1'?: string
  'chart-2'?: string
  'chart-3'?: string
  'chart-4'?: string
  'chart-5'?: string
}

/**
 * Font tokens used in themes
 */
export interface ThemeFontTokens {
  'font-sans'?: string
  'font-serif'?: string
  'font-mono'?: string
}

/**
 * Shadow tokens used in themes
 */
export interface ThemeShadowTokens {
  'shadow-color'?: string
  'shadow-opacity'?: string
  'shadow-blur'?: string
  'shadow-spread'?: string
  'shadow-offset-x'?: string
  'shadow-offset-y'?: string
}

/**
 * Spacing and effects tokens
 */
export interface ThemeEffectTokens {
  radius?: string
  'letter-spacing'?: string
  spacing?: string
}

/**
 * Complete theme style properties for a single mode
 */
export interface ThemeStyleProps
  extends ThemeColorTokens,
    ThemeFontTokens,
    ThemeShadowTokens,
    ThemeEffectTokens {}

/**
 * Theme styles for both light and dark modes
 */
export interface ThemeStyles {
  light: Partial<ThemeStyleProps>
  dark: Partial<ThemeStyleProps>
}

/**
 * Theme preset source types
 */
export type ThemePresetSource = 'DEFAULT' | 'SAVED' | 'CUSTOM'

/**
 * Complete theme preset definition
 */
export interface ThemePreset {
  /** Display name for the preset */
  label: string
  /** Source of the preset */
  source?: ThemePresetSource
  /** When the preset was created */
  createdAt?: string
  /** Theme styles for light and dark modes */
  styles: ThemeStyles
}

/**
 * Theme preset registry
 */
export type ThemePresets = Record<string, ThemePreset>

/**
 * Theme mode
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /** Current theme preset name */
  preset: string
  /** Current mode */
  mode: ThemeMode
  /** Custom overrides */
  overrides?: Partial<ThemeStyles>
}

/**
 * CSS variable format options
 */
export type CSSVariableFormat = 'hsl' | 'hex'

/**
 * Theme CSS generation options
 */
export interface ThemeCSSOptions {
  /** CSS variable format */
  format?: CSSVariableFormat
  /** Include Tailwind v4 @theme inline block */
  tailwindV4?: boolean
  /** Custom selector for light mode (default: ':root') */
  lightSelector?: string
  /** Custom selector for dark mode (default: '.dark') */
  darkSelector?: string
}
