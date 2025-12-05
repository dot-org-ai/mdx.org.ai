import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const srcDir = join(__dirname, '../src/styles')
const distDir = join(__dirname, '../dist')

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true })
}

// CSS files in order of dependency
const cssFiles = [
  'colors.css',
  'themes.css',
  'variables.css',
  'base.css',
  'layouts.css',
  'nav.css',
  'sections.css',
  'views.css',
  'containers.css',
  'backgrounds.css',
]

// Copy individual CSS files
for (const file of cssFiles) {
  const srcPath = join(srcDir, file)
  const distPath = join(distDir, file)

  if (existsSync(srcPath)) {
    copyFileSync(srcPath, distPath)
    console.log(`Copied: ${file}`)
  }
}

// Generate combined index.css
const combined = cssFiles
  .map(file => {
    const srcPath = join(srcDir, file)
    if (existsSync(srcPath)) {
      return `/* === ${file} === */\n${readFileSync(srcPath, 'utf-8')}`
    }
    return ''
  })
  .filter(Boolean)
  .join('\n\n')

writeFileSync(join(distDir, 'index.css'), combined)
console.log('Generated: index.css')

console.log('CSS build complete!')
