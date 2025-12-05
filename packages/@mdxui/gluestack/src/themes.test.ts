import { describe, it, expect } from 'vitest'
import {
  lightColors,
  darkColors,
  defaultSpacing,
  defaultFontSizes,
  defaultTheme,
  proseTheme,
  docsTheme,
  blogTheme,
  themePresets,
  getTheme,
  createTheme,
  nativeWindClasses,
} from './themes.js'

describe('@mdxui/gluestack/themes', () => {
  describe('lightColors', () => {
    it('should have all required color properties', () => {
      expect(lightColors.text).toBeDefined()
      expect(lightColors.textMuted).toBeDefined()
      expect(lightColors.heading).toBeDefined()
      expect(lightColors.link).toBeDefined()
      expect(lightColors.linkHover).toBeDefined()
      expect(lightColors.code).toBeDefined()
      expect(lightColors.codeBg).toBeDefined()
      expect(lightColors.blockquoteBorder).toBeDefined()
      expect(lightColors.border).toBeDefined()
      expect(lightColors.background).toBeDefined()
    })
  })

  describe('darkColors', () => {
    it('should have all required color properties', () => {
      expect(darkColors.text).toBeDefined()
      expect(darkColors.heading).toBeDefined()
      expect(darkColors.link).toBeDefined()
      expect(darkColors.code).toBeDefined()
      expect(darkColors.background).toBeDefined()
    })

    it('should be different from light colors', () => {
      expect(darkColors.text).not.toBe(lightColors.text)
      expect(darkColors.background).not.toBe(lightColors.background)
    })
  })

  describe('defaultSpacing', () => {
    it('should have spacing scale', () => {
      expect(defaultSpacing.xs).toBe(4)
      expect(defaultSpacing.sm).toBe(8)
      expect(defaultSpacing.md).toBe(16)
      expect(defaultSpacing.lg).toBe(24)
      expect(defaultSpacing.xl).toBe(32)
      expect(defaultSpacing['2xl']).toBe(48)
    })
  })

  describe('defaultFontSizes', () => {
    it('should have font size scale', () => {
      expect(defaultFontSizes.xs).toBe(12)
      expect(defaultFontSizes.sm).toBe(14)
      expect(defaultFontSizes.base).toBe(16)
      expect(defaultFontSizes.lg).toBe(18)
      expect(defaultFontSizes.xl).toBe(20)
      expect(defaultFontSizes['2xl']).toBe(24)
      expect(defaultFontSizes['3xl']).toBe(30)
      expect(defaultFontSizes['4xl']).toBe(36)
    })
  })

  describe('defaultTheme', () => {
    it('should have complete theme structure', () => {
      expect(defaultTheme.name).toBe('default')
      expect(defaultTheme.colors.light).toBeDefined()
      expect(defaultTheme.colors.dark).toBeDefined()
      expect(defaultTheme.spacing).toBeDefined()
      expect(defaultTheme.fontSizes).toBeDefined()
      expect(defaultTheme.borderRadius).toBeDefined()
    })
  })

  describe('theme presets', () => {
    it('should have prose theme', () => {
      expect(proseTheme.name).toBe('prose')
      expect(proseTheme.fontSizes.base).toBe(18)
    })

    it('should have docs theme', () => {
      expect(docsTheme.name).toBe('docs')
    })

    it('should have blog theme', () => {
      expect(blogTheme.name).toBe('blog')
      expect(blogTheme.colors.light.background).not.toBe(defaultTheme.colors.light.background)
    })
  })

  describe('themePresets', () => {
    it('should contain all preset themes', () => {
      expect(themePresets.default).toBeDefined()
      expect(themePresets.prose).toBeDefined()
      expect(themePresets.docs).toBeDefined()
      expect(themePresets.blog).toBeDefined()
    })
  })

  describe('getTheme', () => {
    it('should return requested theme', () => {
      expect(getTheme('prose').name).toBe('prose')
      expect(getTheme('docs').name).toBe('docs')
      expect(getTheme('blog').name).toBe('blog')
    })

    it('should return default for unknown themes', () => {
      const theme = getTheme('unknown' as keyof typeof themePresets)
      expect(theme.name).toBe('default')
    })
  })

  describe('createTheme', () => {
    it('should extend a preset by name', () => {
      const custom = createTheme('default', {
        name: 'custom',
      })

      expect(custom.name).toBe('custom')
      expect(custom.colors).toEqual(defaultTheme.colors)
    })

    it('should extend a theme object', () => {
      const custom = createTheme(proseTheme, {
        name: 'custom-prose',
        fontSizes: {
          ...proseTheme.fontSizes,
          base: 20,
        },
      })

      expect(custom.name).toBe('custom-prose')
      expect(custom.fontSizes.base).toBe(20)
    })

    it('should merge color overrides', () => {
      const custom = createTheme('default', {
        colors: {
          light: {
            ...defaultTheme.colors.light,
            background: '#custom',
          },
        },
      })

      expect(custom.colors.light.background).toBe('#custom')
      expect(custom.colors.dark.background).toBe(defaultTheme.colors.dark.background)
    })
  })

  describe('nativeWindClasses', () => {
    it('should have prose classes', () => {
      expect(nativeWindClasses.prose).toBeDefined()
      expect(nativeWindClasses.prose.container).toContain('max-w-prose')
      expect(nativeWindClasses.prose.h1).toContain('text-4xl')
      expect(nativeWindClasses.prose.p).toContain('leading-7')
      expect(nativeWindClasses.prose.code).toContain('font-mono')
    })

    it('should have docs classes', () => {
      expect(nativeWindClasses.docs).toBeDefined()
      expect(nativeWindClasses.docs.container).toContain('max-w-4xl')
      expect(nativeWindClasses.docs.h2).toContain('border-b')
    })

    it('prose and docs should have different styling', () => {
      expect(nativeWindClasses.prose.h1).not.toBe(nativeWindClasses.docs.h1)
      expect(nativeWindClasses.prose.container).not.toBe(nativeWindClasses.docs.container)
    })
  })
})
