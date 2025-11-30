/**
 * Theme exports for @mdxui/shadcn
 */

// Types
export type {
  ThemeColorTokens,
  ThemeFontTokens,
  ThemeShadowTokens,
  ThemeEffectTokens,
  ThemeStyleProps,
  ThemeStyles,
  ThemePresetSource,
  ThemePreset,
  ThemePresets,
  ThemeMode,
  ThemeConfig,
  CSSVariableFormat,
  ThemeCSSOptions,
} from './types.js'

// Provider
export {
  ThemeProvider,
  useThemePreset,
  useTheme,
  type ThemeProviderProps,
} from './provider.js'

// Presets
export {
  defaultPresets,
  getPreset,
  getPresetNames,
  DEFAULT_PRESET,
  // Individual presets
  modernMinimal,
  violetBloom,
  t3Chat,
  twitter,
  mochaMousse,
  bubblegum,
  catppuccin,
  graphite,
  cyberpunk,
  neoBrutalism,
  oceanBreeze,
  supabase,
  sunsetHorizon,
  northernLights,
  claude,
  retroArcade,
  pastelDreams,
  nature,
  caffeine,
  elegantLuxury,
  cleanSlate,
} from './presets.js'

// CSS utilities
export {
  hexToHsl,
  isHexColor,
  generateCSSVariables,
  generateThemeCSS,
  generateTailwindV4Theme,
  generateStyleObject,
  applyTheme,
  removeTheme,
} from './css.js'
