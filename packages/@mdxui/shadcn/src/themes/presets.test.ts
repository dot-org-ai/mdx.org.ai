import { describe, it, expect } from 'vitest'
import {
  defaultPresets,
  getPreset,
  getPresetNames,
  DEFAULT_PRESET,
  modernMinimal,
  claude,
  twitter,
  supabase,
} from './presets.js'

describe('defaultPresets', () => {
  it('contains all expected presets', () => {
    expect(Object.keys(defaultPresets).length).toBeGreaterThan(15)
  })

  it('each preset has required properties', () => {
    for (const [name, preset] of Object.entries(defaultPresets)) {
      expect(preset).toHaveProperty('label')
      expect(preset).toHaveProperty('styles')
      expect(preset.styles).toHaveProperty('light')
      expect(preset.styles).toHaveProperty('dark')
      expect(typeof preset.label).toBe('string')
    }
  })
})

describe('getPreset', () => {
  it('returns preset by name', () => {
    const preset = getPreset('modern-minimal')
    expect(preset).toBeDefined()
    expect(preset?.label).toBe('Modern Minimal')
  })

  it('returns undefined for unknown preset', () => {
    const preset = getPreset('nonexistent')
    expect(preset).toBeUndefined()
  })
})

describe('getPresetNames', () => {
  it('returns array of preset names', () => {
    const names = getPresetNames()
    expect(Array.isArray(names)).toBe(true)
    expect(names).toContain('modern-minimal')
    expect(names).toContain('claude')
    expect(names).toContain('twitter')
  })
})

describe('DEFAULT_PRESET', () => {
  it('is a valid preset name', () => {
    expect(defaultPresets[DEFAULT_PRESET]).toBeDefined()
  })
})

describe('individual presets', () => {
  it('modernMinimal has expected structure', () => {
    expect(modernMinimal.label).toBe('Modern Minimal')
    expect(modernMinimal.styles.light.background).toBeDefined()
    expect(modernMinimal.styles.dark.background).toBeDefined()
  })

  it('claude preset exists', () => {
    expect(claude.label).toBe('Claude')
    expect(claude.styles.light.primary).toBeDefined()
    expect(claude.styles.dark.primary).toBeDefined()
  })

  it('twitter preset exists', () => {
    expect(twitter.label).toBe('Twitter')
  })

  it('supabase preset exists', () => {
    expect(supabase.label).toBe('Supabase')
  })
})
