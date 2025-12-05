import { describe, it, expect } from 'vitest'
import {
  mdxTokens,
  mdxLightTheme,
  mdxDarkTheme,
  themePresets,
  getTheme,
  createMDXTamaguiConfig,
} from './themes.js'

describe('@mdxui/tamagui/themes', () => {
  describe('mdxTokens', () => {
    it('should have MDX-specific color tokens', () => {
      expect(mdxTokens.color.mdxText).toBeDefined()
      expect(mdxTokens.color.mdxTextDark).toBeDefined()
      expect(mdxTokens.color.mdxHeading).toBeDefined()
      expect(mdxTokens.color.mdxLink).toBeDefined()
      expect(mdxTokens.color.mdxCode).toBeDefined()
      expect(mdxTokens.color.mdxCodeBg).toBeDefined()
    })
  })

  describe('mdxLightTheme', () => {
    it('should have required theme properties', () => {
      expect(mdxLightTheme.background).toBeDefined()
      expect(mdxLightTheme.color).toBeDefined()
      expect(mdxLightTheme.borderColor).toBeDefined()
    })
  })

  describe('mdxDarkTheme', () => {
    it('should have required theme properties', () => {
      expect(mdxDarkTheme.background).toBeDefined()
      expect(mdxDarkTheme.color).toBeDefined()
      expect(mdxDarkTheme.borderColor).toBeDefined()
    })

    it('should be different from light theme', () => {
      expect(mdxDarkTheme.background).not.toBe(mdxLightTheme.background)
    })
  })

  describe('themePresets', () => {
    it('should have all preset themes', () => {
      expect(themePresets.default).toBeDefined()
      expect(themePresets.prose).toBeDefined()
      expect(themePresets.docs).toBeDefined()
      expect(themePresets.blog).toBeDefined()
    })

    it('should have light and dark variants for each preset', () => {
      for (const preset of Object.values(themePresets)) {
        expect(preset.light).toBeDefined()
        expect(preset.dark).toBeDefined()
        expect(preset.name).toBeDefined()
      }
    })
  })

  describe('getTheme', () => {
    it('should return requested theme preset', () => {
      const prose = getTheme('prose')
      expect(prose.name).toBe('prose')

      const docs = getTheme('docs')
      expect(docs.name).toBe('docs')
    })

    it('should return default theme for unknown presets', () => {
      const theme = getTheme('unknown' as keyof typeof themePresets)
      expect(theme.name).toBe('default')
    })
  })

  describe('createMDXTamaguiConfig', () => {
    it('should create config with default preset', () => {
      const config = createMDXTamaguiConfig()
      expect(config).toBeDefined()
    })

    it('should create config with specified preset', () => {
      const config = createMDXTamaguiConfig({ preset: 'prose' })
      expect(config).toBeDefined()
    })

    it('should merge custom themes', () => {
      const customTheme = {
        background: '#custom',
        color: '#text',
      }

      const config = createMDXTamaguiConfig({
        themes: { custom: customTheme as typeof mdxLightTheme },
      })

      expect(config).toBeDefined()
    })
  })
})
