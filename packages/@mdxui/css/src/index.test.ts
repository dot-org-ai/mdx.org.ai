import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('@mdxui/css', () => {
  it('has CSS files in styles directory', () => {
    const stylesDir = join(__dirname, 'styles')
    expect(existsSync(stylesDir)).toBe(true)
  })

  it('has base.css', () => {
    const baseCSS = join(__dirname, 'styles', 'base.css')
    expect(existsSync(baseCSS)).toBe(true)
    const content = readFileSync(baseCSS, 'utf-8')
    expect(content).toContain('box-sizing')
  })

  it('has colors.css', () => {
    const colorsCSS = join(__dirname, 'styles', 'colors.css')
    expect(existsSync(colorsCSS)).toBe(true)
    const content = readFileSync(colorsCSS, 'utf-8')
    expect(content).toContain('--')
  })

  it('has themes.css', () => {
    const themesCSS = join(__dirname, 'styles', 'themes.css')
    expect(existsSync(themesCSS)).toBe(true)
  })

  it('has variables.css', () => {
    const varsCSS = join(__dirname, 'styles', 'variables.css')
    expect(existsSync(varsCSS)).toBe(true)
  })
})
