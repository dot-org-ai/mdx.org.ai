/**
 * @mdxe/hono Dynamic Styles
 *
 * Generates CSS dynamically based on type and query parameters.
 * Example: /styles/landing.css?color=indigo&background=gradient
 *
 * @packageDocumentation
 */

export interface StyleOptions {
  /** Primary color (tailwind color name or hex) */
  color?: string
  /** Background style: gradient, grid, dots, waves, none */
  background?: string
  /** Dark mode: auto, light, dark */
  mode?: string
  /** Font family: system, sans, serif, mono */
  font?: string
  /** Border radius: none, sm, md, lg, full */
  radius?: string
}

type ColorShade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950'
type ColorPalette = Record<ColorShade, string>

/** Tailwind-like color palette */
const colors: Record<string, ColorPalette> = {
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' },
  zinc: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b', 950: '#09090b' },
  red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12', 950: '#422006' },
  lime: { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314', 950: '#1a2e05' },
  green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e' },
  cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63', 950: '#083344' },
  sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87', 950: '#3b0764' },
  fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75', 950: '#4a044e' },
  pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843', 950: '#500724' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
}

const defaultPalette: ColorPalette = {
  '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8',
  '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b'
}

const validShades = new Set(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'])

/** Parse color string like "indigo-500" or "#6366f1" */
function parseColor(color: string): string {
  if (color.startsWith('#')) return color

  const parts = color.split('-')
  const name = parts[0] || 'indigo'
  const shade = parts[1] || '500'
  const palette = colors[name]
  if (palette && validShades.has(shade)) {
    const value = palette[shade as ColorShade]
    return value || palette['500']
  }
  return defaultPalette['500']
}

/** Generate CSS variables for a color */
function colorVars(name: string, color: string): string {
  const colorName = color.split('-')[0] || 'indigo'
  const palette: ColorPalette = colors[colorName] || defaultPalette
  return `
  --${name}: ${parseColor(color)};
  --${name}-50: ${palette['50']};
  --${name}-100: ${palette['100']};
  --${name}-200: ${palette['200']};
  --${name}-300: ${palette['300']};
  --${name}-400: ${palette['400']};
  --${name}-500: ${palette['500']};
  --${name}-600: ${palette['600']};
  --${name}-700: ${palette['700']};
  --${name}-800: ${palette['800']};
  --${name}-900: ${palette['900']};
  --${name}-950: ${palette['950']};`
}

/** Generate background effect CSS */
function backgroundCSS(style: string, color: string): string {
  const primary = parseColor(color)

  switch (style) {
    case 'gradient':
      return `
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(135deg, ${primary}10 0%, transparent 50%, ${primary}05 100%);
}
#hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(ellipse at top, ${primary}20, transparent 70%);
}`

    case 'grid':
      return `
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(${primary}10 1px, transparent 1px),
    linear-gradient(90deg, ${primary}10 1px, transparent 1px);
  background-size: 40px 40px;
}`

    case 'dots':
      return `
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(${primary}30 1px, transparent 1px);
  background-size: 20px 20px;
}`

    case 'waves':
      return `
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse at 20% 80%, ${primary}15, transparent 50%),
    radial-gradient(ellipse at 80% 20%, ${primary}10, transparent 50%),
    radial-gradient(ellipse at 40% 40%, ${primary}05, transparent 60%);
}`

    case 'stars':
      return `
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(1px 1px at 20px 30px, ${primary}60, transparent),
    radial-gradient(1px 1px at 40px 70px, ${primary}40, transparent),
    radial-gradient(1px 1px at 50px 160px, ${primary}50, transparent),
    radial-gradient(1px 1px at 90px 40px, ${primary}30, transparent),
    radial-gradient(1px 1px at 130px 80px, ${primary}50, transparent),
    radial-gradient(1px 1px at 160px 120px, ${primary}40, transparent),
    radial-gradient(2px 2px at 200px 50px, ${primary}70, transparent),
    radial-gradient(1px 1px at 250px 90px, ${primary}30, transparent),
    radial-gradient(1px 1px at 300px 140px, ${primary}50, transparent);
  background-size: 350px 200px;
}`

    default:
      return ''
  }
}

/** shadcn/tweakcn OKLCH color themes */
interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  // Chart colors
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  // Sidebar colors
  sidebar: string
  sidebarForeground: string
  sidebarPrimary: string
  sidebarPrimaryForeground: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarBorder: string
  sidebarRing: string
}

/** Get theme colors based on primary color */
function getThemeColors(colorName: string, isDark: boolean): ThemeColors {
  const palette: ColorPalette = colors[colorName] || colors.indigo || defaultPalette

  if (isDark) {
    return {
      background: 'oklch(0.145 0.015 285)',
      foreground: 'oklch(0.985 0 0)',
      card: 'oklch(0.205 0.015 285)',
      cardForeground: 'oklch(0.985 0 0)',
      popover: 'oklch(0.205 0.015 285)',
      popoverForeground: 'oklch(0.985 0 0)',
      primary: palette['500'],
      primaryForeground: 'oklch(0.985 0 0)',
      secondary: 'oklch(0.269 0.015 285)',
      secondaryForeground: 'oklch(0.985 0 0)',
      muted: 'oklch(0.269 0.015 285)',
      mutedForeground: 'oklch(0.708 0 0)',
      accent: 'oklch(0.371 0.015 285)',
      accentForeground: 'oklch(0.985 0 0)',
      destructive: 'oklch(0.704 0.191 22.216)',
      destructiveForeground: 'oklch(0.985 0 0)',
      border: 'oklch(0.35 0.015 285)',
      input: 'oklch(0.35 0.015 285)',
      ring: palette['400'],
      chart1: 'oklch(0.75 0.18 150)',
      chart2: 'oklch(0.70 0.15 200)',
      chart3: 'oklch(0.80 0.12 60)',
      chart4: 'oklch(0.65 0.20 280)',
      chart5: 'oklch(0.75 0.15 330)',
      sidebar: 'oklch(0.145 0.015 285)',
      sidebarForeground: 'oklch(0.985 0 0)',
      sidebarPrimary: palette['400'],
      sidebarPrimaryForeground: 'oklch(0.145 0 0)',
      sidebarAccent: 'oklch(0.269 0.015 285)',
      sidebarAccentForeground: 'oklch(0.985 0 0)',
      sidebarBorder: 'oklch(0.35 0.015 285)',
      sidebarRing: palette['400'],
    }
  }

  return {
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.145 0 0)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.145 0 0)',
    popover: 'oklch(1 0 0)',
    popoverForeground: 'oklch(0.145 0 0)',
    primary: palette['600'],
    primaryForeground: 'oklch(0.985 0 0)',
    secondary: 'oklch(0.97 0 0)',
    secondaryForeground: 'oklch(0.205 0 0)',
    muted: 'oklch(0.97 0 0)',
    mutedForeground: 'oklch(0.556 0 0)',
    accent: 'oklch(0.97 0 0)',
    accentForeground: 'oklch(0.205 0 0)',
    destructive: 'oklch(0.577 0.245 27.325)',
    destructiveForeground: 'oklch(0.985 0 0)',
    border: 'oklch(0.922 0 0)',
    input: 'oklch(0.922 0 0)',
    ring: palette['500'],
    chart1: 'oklch(0.60 0.18 150)',
    chart2: 'oklch(0.55 0.15 200)',
    chart3: 'oklch(0.65 0.12 60)',
    chart4: 'oklch(0.50 0.20 280)',
    chart5: 'oklch(0.60 0.15 330)',
    sidebar: 'oklch(0.985 0 0)',
    sidebarForeground: 'oklch(0.145 0 0)',
    sidebarPrimary: palette['600'],
    sidebarPrimaryForeground: 'oklch(0.985 0 0)',
    sidebarAccent: 'oklch(0.97 0 0)',
    sidebarAccentForeground: 'oklch(0.205 0 0)',
    sidebarBorder: 'oklch(0.922 0 0)',
    sidebarRing: palette['500'],
  }
}

/** Generate shadcn/tweakcn CSS variables */
function themeVars(theme: ThemeColors): string {
  return `
  --background: ${theme.background};
  --foreground: ${theme.foreground};
  --card: ${theme.card};
  --card-foreground: ${theme.cardForeground};
  --popover: ${theme.popover};
  --popover-foreground: ${theme.popoverForeground};
  --primary: ${theme.primary};
  --primary-foreground: ${theme.primaryForeground};
  --secondary: ${theme.secondary};
  --secondary-foreground: ${theme.secondaryForeground};
  --muted: ${theme.muted};
  --muted-foreground: ${theme.mutedForeground};
  --accent: ${theme.accent};
  --accent-foreground: ${theme.accentForeground};
  --destructive: ${theme.destructive};
  --destructive-foreground: ${theme.destructiveForeground};
  --border: ${theme.border};
  --input: ${theme.input};
  --ring: ${theme.ring};
  --chart-1: ${theme.chart1};
  --chart-2: ${theme.chart2};
  --chart-3: ${theme.chart3};
  --chart-4: ${theme.chart4};
  --chart-5: ${theme.chart5};
  --sidebar: ${theme.sidebar};
  --sidebar-foreground: ${theme.sidebarForeground};
  --sidebar-primary: ${theme.sidebarPrimary};
  --sidebar-primary-foreground: ${theme.sidebarPrimaryForeground};
  --sidebar-accent: ${theme.sidebarAccent};
  --sidebar-accent-foreground: ${theme.sidebarAccentForeground};
  --sidebar-border: ${theme.sidebarBorder};
  --sidebar-ring: ${theme.sidebarRing};`
}

/** Base CSS variables and reset */
function baseVars(opts: StyleOptions): string {
  const color = opts.color?.split('-')[0] || 'indigo'
  const radius = opts.radius || 'md'

  const radiusMap: Record<string, string> = {
    none: '0rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  }

  const fontMap: Record<string, string> = {
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sans: '"Inter Variable", Inter, system-ui, sans-serif',
    serif: '"Merriweather", Georgia, Cambria, serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  }

  const lightTheme = getThemeColors(color, false)
  const darkTheme = getThemeColors(color, true)

  return `
:root {
  ${themeVars(lightTheme)}
  --radius: ${radiusMap[radius] || radiusMap.md};
  --font-sans: ${fontMap[opts.font || 'system']};
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-mode="light"]) {
    ${themeVars(darkTheme)}
  }
}

[data-mode="dark"], .dark {
  ${themeVars(darkTheme)}
}

[data-mode="light"], .light {
  ${themeVars(lightTheme)}
}`
}

/** Base layout CSS */
function baseLayout(): string {
  return `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
  color: var(--foreground);
  background: var(--background);
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

a {
  color: var(--primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.3;
  margin-bottom: 0.5em;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.5rem; }
h4 { font-size: 1.25rem; }

p { margin-bottom: 1rem; }

ul, ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

pre {
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

:not(pre) > code {
  background: var(--muted);
  padding: 0.125rem 0.375rem;
  border-radius: calc(var(--radius) / 2);
}

button, .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  background: var(--primary);
  color: var(--primary-foreground);
  transition: opacity 0.2s;
}

button:hover, .btn:hover {
  opacity: 0.9;
  text-decoration: none;
}

input, textarea, select {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--input);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
}

input:focus, textarea:focus, select:focus {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}`
}

/**
 * Header CSS - semantic (body > header)
 */
function headerCSS(): string {
  return `
/* Site header - body > header */
body > header {
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
}

body > header nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
}

body > header nav > a {
  color: var(--foreground);
  text-decoration: none;
}

body > header nav > a strong {
  font-size: 1.125rem;
}

body > header nav ul {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

body > header nav ul a {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

body > header nav ul a:hover {
  color: var(--foreground);
}`
}

/**
 * Footer CSS - semantic (body > footer)
 */
function footerCSS(): string {
  return `
/* Site footer - body > footer */
body > footer {
  border-top: 1px solid var(--border);
  padding: 2rem 1.5rem;
  margin-top: auto;
  text-align: center;
  color: var(--muted-foreground);
}`
}

/** TOC CSS */
function tocCSS(): string {
  return `
.toc {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-top: 2rem;
}

.toc h2 {
  margin-top: 0;
  font-size: 1.25rem;
}

.toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.toc li:last-child {
  border-bottom: none;
}

.toc small {
  color: var(--muted-foreground);
}`
}

/**
 * Website type CSS - semantic (body > main > article)
 */
function websiteCSS(): string {
  return `
/* Website layout */
body > main {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 800px) auto;
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

body > main > article {
  min-width: 0;
  line-height: 1.7;
}

body > main > aside {
  position: sticky;
  top: 5rem;
  height: fit-content;
}

body > main > aside nav {
  font-size: 0.875rem;
}

body > main > aside nav ul {
  list-style: none;
  padding: 0;
  border-left: 1px solid var(--border);
}

body > main > aside nav a {
  display: block;
  padding: 0.375rem 1rem;
  color: var(--muted-foreground);
  border-left: 2px solid transparent;
  margin-left: -1px;
}

body > main > aside nav a:hover {
  color: var(--foreground);
}

@media (max-width: 1024px) {
  body > main {
    grid-template-columns: 1fr;
  }
  body > main > aside {
    display: none;
  }
}`
}

/**
 * Landing page type CSS - semantic (body > main > section)
 */
function landingCSS(): string {
  return `
/* Landing page layout */
body > main {
  flex: 1;
}

/* Hero section - first section */
body > main > section:first-of-type {
  position: relative;
  text-align: center;
  padding: 6rem 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

body > main > section:first-of-type small {
  display: block;
  color: var(--primary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

body > main > section:first-of-type h1 {
  font-size: 3.5rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, var(--foreground), var(--primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

body > main > section:first-of-type > p {
  font-size: 1.25rem;
  color: var(--muted-foreground);
  max-width: 600px;
  margin: 0 auto 2rem;
}

body > main > section:first-of-type form {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto;
}

body > main > section:first-of-type form input {
  flex: 1;
}

/* Content sections */
body > main > section:not(:first-of-type) {
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

@media (max-width: 768px) {
  body > main > section:first-of-type h1 {
    font-size: 2.5rem;
  }
  body > main > section:first-of-type {
    padding: 4rem 1.5rem;
  }
}`
}

/**
 * Waitlist type CSS - semantic (body > main > section)
 */
function waitlistCSS(): string {
  return `
/* Waitlist layout - centered hero */
body > main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 8rem);
}

body > main > section {
  text-align: center;
  padding: 4rem 1.5rem;
  max-width: 600px;
}

body > main > section small {
  display: block;
  color: var(--primary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
}

body > main > section h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

body > main > section > p {
  font-size: 1.125rem;
  color: var(--muted-foreground);
  margin-bottom: 2rem;
}

body > main > section form {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto 1.5rem;
}

body > main > section form input {
  flex: 1;
}

body > main > section > aside {
  color: var(--muted-foreground);
}`
}

/**
 * Blog list type CSS - semantic (body > main > header, body > main > section)
 */
function blogCSS(): string {
  return `
/* Blog list layout */
body > main {
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

body > main > header {
  margin-bottom: 3rem;
}

body > main > header h1 {
  margin-bottom: 0.5rem;
}

body > main > header p {
  color: var(--muted-foreground);
}

/* Post list */
body > main > section article {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

body > main > section article:last-child {
  border-bottom: none;
}

body > main > section article time {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

body > main > section article h2 {
  margin: 0.5rem 0;
}

body > main > section article aside {
  margin-top: 0.75rem;
}

body > main > section article aside span {
  display: inline-block;
  background: var(--muted);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius);
  font-size: 0.75rem;
  margin-right: 0.5rem;
}`
}

/**
 * Blog post type CSS - semantic (body > main > article)
 */
function blogPostCSS(): string {
  return `
/* Blog post layout */
body > main {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 800px) auto;
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

body > main > article {
  min-width: 0;
}

body > main > article > header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}

body > main > article > header time {
  display: block;
  color: var(--muted-foreground);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

body > main > article > header h1 {
  margin-bottom: 0.5rem;
}

body > main > article > header p {
  color: var(--muted-foreground);
  font-size: 1.125rem;
}

body > main > article > header address {
  font-style: normal;
  color: var(--muted-foreground);
  margin-top: 1rem;
}

body > main > article > header aside {
  margin-top: 1rem;
}

body > main > article > header aside span {
  display: inline-block;
  background: var(--muted);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius);
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

body > main > article > section {
  line-height: 1.8;
}

body > main > aside {
  position: sticky;
  top: 5rem;
  height: fit-content;
}

body > main > aside nav {
  font-size: 0.875rem;
}

body > main > aside nav ul {
  list-style: none;
  padding: 0;
  border-left: 1px solid var(--border);
}

body > main > aside nav a {
  display: block;
  padding: 0.375rem 1rem;
  color: var(--muted-foreground);
}

@media (max-width: 1024px) {
  body > main {
    grid-template-columns: 1fr;
  }
  body > main > aside {
    display: none;
  }
}`
}

/**
 * Docs type CSS - Semantic selectors only
 *
 * Structure:
 * - body > header: top nav bar
 * - body > aside: left sidebar navigation
 * - body > main: content area
 * - body > main > article: main content
 * - body > main > aside: right TOC
 * - body > footer: site footer
 */
function docsCSS(): string {
  return `
/* Three-column grid layout */
body {
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
}

/* Top header bar */
body > header {
  grid-area: header;
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--background);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
}

body > header nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
}

body > header nav > a {
  color: var(--foreground);
  text-decoration: none;
}

body > header nav ul {
  display: flex;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

body > header nav ul a {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

body > header nav ul a:hover {
  color: var(--foreground);
}

/* Left sidebar */
body > aside {
  grid-area: sidebar;
  position: sticky;
  top: 3.5rem;
  height: calc(100vh - 3.5rem);
  overflow-y: auto;
  background: var(--sidebar);
  border-right: 1px solid var(--sidebar-border);
  padding: 1.5rem 1rem;
}

body > aside nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

body > aside nav li {
  margin: 0.125rem 0;
}

body > aside nav a {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  color: var(--sidebar-foreground);
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}

body > aside nav a:hover {
  background: var(--sidebar-accent);
  color: var(--sidebar-accent-foreground);
}

body > aside nav a[aria-current="page"] {
  background: var(--sidebar-primary);
  color: var(--sidebar-primary-foreground);
  font-weight: 500;
}

/* Main content area */
body > main {
  grid-area: main;
  display: grid;
  grid-template-columns: minmax(0, 800px) 220px;
  gap: 3rem;
  padding: 2rem;
  max-width: 1200px;
}

/* Article content */
body > main > article {
  min-width: 0;
}

body > main > article > header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

body > main > article > header h1 {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 0.5rem;
}

body > main > article > header p {
  font-size: 1.125rem;
  color: var(--muted-foreground);
  margin: 0;
}

/* Article section (prose content) */
body > main > article > section {
  line-height: 1.75;
}

body > main > article > section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 2rem 0 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

body > main > article > section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.5rem 0 0.75rem;
}

body > main > article > section h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 1.25rem 0 0.5rem;
}

body > main > article > section p {
  margin: 1rem 0;
}

body > main > article > section ul,
body > main > article > section ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

body > main > article > section li {
  margin: 0.5rem 0;
}

body > main > article > section pre {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
}

body > main > article > section blockquote {
  border-left: 4px solid var(--primary);
  margin: 1.5rem 0;
  padding: 0.5rem 0 0.5rem 1.5rem;
  color: var(--muted-foreground);
}

body > main > article > section table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
}

body > main > article > section th,
body > main > article > section td {
  padding: 0.75rem;
  border: 1px solid var(--border);
  text-align: left;
}

body > main > article > section th {
  background: var(--muted);
  font-weight: 600;
}

/* Article footer (prev/next nav) */
body > main > article > footer {
  display: flex;
  justify-content: space-between;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

body > main > article > footer a {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
}

body > main > article > footer a:hover {
  background: var(--muted);
  border-color: var(--primary);
}

body > main > article > footer a:last-child {
  text-align: right;
}

body > main > article > footer small {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

body > main > article > footer span {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--foreground);
}

/* Right sidebar (TOC) */
body > main > aside {
  position: sticky;
  top: 5rem;
  height: fit-content;
}

body > main > aside nav strong {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
}

body > main > aside nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  border-left: 1px solid var(--border);
}

body > main > aside nav li {
  margin: 0;
}

body > main > aside nav a {
  display: block;
  padding: 0.375rem 0 0.375rem 1rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  text-decoration: none;
  border-left: 2px solid transparent;
  margin-left: -1px;
  transition: color 0.15s, border-color 0.15s;
}

body > main > aside nav a:hover {
  color: var(--foreground);
}

body > main > aside nav a[aria-current="true"] {
  color: var(--primary);
  border-left-color: var(--primary);
}

/* Site footer */
body > footer {
  grid-area: footer;
  border-top: 1px solid var(--border);
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--muted-foreground);
}

/* Responsive: hide right TOC */
@media (max-width: 1280px) {
  body > main {
    grid-template-columns: 1fr;
  }

  body > main > aside {
    display: none;
  }
}

/* Responsive: collapse sidebar */
@media (max-width: 768px) {
  body {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "footer";
  }

  body > aside {
    display: none;
  }

  body > main {
    padding: 1.5rem;
  }

  body > main > article > header h1 {
    font-size: 1.75rem;
  }
}`
}

/**
 * Collection type CSS - semantic (body > main > header, body > main > section)
 */
function collectionCSS(): string {
  return `
/* Collection layout */
body > main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

body > main > header {
  text-align: center;
  margin-bottom: 3rem;
}

body > main > header h1 {
  margin-bottom: 0.5rem;
}

body > main > header p {
  font-size: 1.125rem;
  color: var(--muted-foreground);
  max-width: 600px;
  margin: 0 auto;
}

/* Card grid in section */
body > main > section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

body > main > section article {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

body > main > section article:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

body > main > section article h3 {
  margin: 0 0 0.5rem 0;
}

body > main > section article h3 a {
  color: var(--foreground);
  text-decoration: none;
}

body > main > section article h3 a:hover {
  color: var(--primary);
}

body > main > section article p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--muted-foreground);
}`
}

/**
 * PricingPage type CSS - semantic (body > main > header, body > main > section)
 */
function pricingCSS(): string {
  return `
/* Pricing layout */
body > main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

body > main > header {
  text-align: center;
  margin-bottom: 3rem;
}

body > main > header small {
  display: block;
  color: var(--primary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
}

body > main > header h1 {
  margin-bottom: 0.5rem;
}

body > main > header p {
  color: var(--muted-foreground);
}

/* Pricing tiers */
body > main > section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

body > main > section article {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  text-align: center;
}

body > main > section article[data-featured] {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

body > main > section article h3 {
  margin: 0 0 0.5rem 0;
}

body > main > section article strong {
  display: block;
  font-size: 2.5rem;
  margin: 1rem 0;
}

body > main > section article ul {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
  text-align: left;
}

body > main > section article li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

body > main > section article li:last-child {
  border-bottom: none;
}`
}

/**
 * Directory type CSS - semantic (body > main > nav, body > main > header, body > main > section)
 */
function directoryCSS(): string {
  return `
/* Directory layout */
body > main {
  flex: 1;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

body > main > nav {
  font-size: 0.875rem;
  color: var(--muted-foreground);
  margin-bottom: 1rem;
}

body > main > nav a {
  color: var(--muted-foreground);
}

body > main > nav a:hover {
  color: var(--primary);
}

body > main > header {
  margin-bottom: 2rem;
}

body > main > header h1 {
  margin-bottom: 0.5rem;
}

body > main > header p {
  color: var(--muted-foreground);
}

/* File list */
body > main > section {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

body > main > section article {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

body > main > section article:last-child {
  border-bottom: none;
}

body > main > section article:hover {
  background: var(--muted);
}

body > main > section article a {
  color: var(--foreground);
  font-weight: 500;
}

body > main > section article a:hover {
  color: var(--primary);
}

body > main > section article span {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}`
}

/**
 * Slides type CSS - semantic (body > header, body > main > section, body > aside)
 */
function slidesCSS(): string {
  return `
/* Slides layout */
html, body {
  overflow: hidden;
  height: 100vh;
}

body > header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--background);
  border-bottom: 1px solid var(--border);
}

body > header nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem;
}

body > header nav menu {
  display: flex;
  align-items: center;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

body > header nav output {
  font-size: 0.875rem;
  color: var(--muted-foreground);
}

body > main {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  height: 100vh;
  padding-top: 3rem;
}

body > main > section {
  flex: 0 0 100vw;
  min-height: calc(100vh - 3rem);
  scroll-snap-align: start;
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
}

body > main > section[aria-current="true"] {
  display: flex;
}

body > main > section h1,
body > main > section h2 {
  font-size: 3rem;
}

body > aside {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

body > aside progress {
  width: 100%;
  height: 4px;
  appearance: none;
  border: none;
  background: var(--border);
}

body > aside progress::-webkit-progress-bar {
  background: var(--border);
}

body > aside progress::-webkit-progress-value {
  background: var(--primary);
}

body > aside progress::-moz-progress-bar {
  background: var(--primary);
}

body > footer {
  display: none;
}`
}

/**
 * App type CSS - semantic (body > header, body > aside, body > main)
 */
function appCSS(): string {
  return `
/* App/Dashboard layout */
body {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  min-height: 100vh;
}

body > header {
  grid-area: header;
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--background);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
}

body > header nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

body > header nav menu {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

body > header nav menu a {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

body > aside {
  grid-area: sidebar;
  background: var(--sidebar);
  border-right: 1px solid var(--sidebar-border);
  padding: 1.5rem 1rem;
}

body > aside nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

body > aside nav a {
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  color: var(--sidebar-foreground);
  font-size: 0.875rem;
}

body > aside nav a:hover {
  background: var(--sidebar-accent);
}

body > aside nav a[aria-current="page"] {
  background: var(--sidebar-primary);
  color: var(--sidebar-primary-foreground);
}

body > main {
  grid-area: main;
  padding: 2rem;
}

body > main > header {
  margin-bottom: 2rem;
}

body > main > header h1 {
  margin-bottom: 0.5rem;
}

body > main > header p {
  color: var(--muted-foreground);
}

@media (max-width: 768px) {
  body {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main";
  }
  body > aside {
    display: none;
  }
}`
}

/**
 * Agent type CSS - semantic (body > header, body > main, body > aside)
 */
function agentCSS(): string {
  return `
/* Agent/Chat layout */
body {
  display: grid;
  grid-template-columns: 1fr 280px;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "header header"
    "main sidebar";
  min-height: 100vh;
}

body > header {
  grid-area: header;
  background: var(--background);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 1.5rem;
}

body > header nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

body > header nav hgroup {
  margin: 0;
}

body > header nav hgroup h1 {
  font-size: 1.125rem;
  margin: 0;
}

body > header nav hgroup p {
  margin: 0;
}

body > header nav hgroup small[data-status="online"] {
  color: var(--chart-1);
}

body > header nav hgroup small[data-status="offline"] {
  color: var(--muted-foreground);
}

body > main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 3.5rem);
}

body > main > section {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

body > main > form {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--background);
}

body > main > form textarea {
  flex: 1;
  resize: none;
  min-height: 2.5rem;
  max-height: 10rem;
}

body > aside {
  grid-area: sidebar;
  background: var(--sidebar);
  border-left: 1px solid var(--sidebar-border);
  padding: 1.5rem;
}

body > aside nav p {
  color: var(--muted-foreground);
  font-size: 0.875rem;
}

@media (max-width: 1024px) {
  body {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main";
  }
  body > aside {
    display: none;
  }
}`
}

/** Get type-specific CSS */
function typeCSS(type: string): string {
  switch (type.toLowerCase()) {
    // Content types
    case 'landing':
    case 'landingpage':
      return landingCSS()
    case 'waitlist':
      return waitlistCSS()
    case 'blog':
      return blogCSS()
    case 'blogpost':
    case 'article':
      return blogPostCSS()
    // Documentation types
    case 'docs':
    case 'documentation':
      return docsCSS()
    // Collection types
    case 'collection':
    case 'gallery':
      return collectionCSS()
    case 'directory':
    case 'folder':
    case 'index':
      return directoryCSS()
    // Interactive types
    case 'slides':
    case 'presentation':
      return slidesCSS()
    case 'app':
    case 'dashboard':
      return appCSS()
    case 'agent':
      return agentCSS()
    // Commerce types
    case 'pricingpage':
    case 'pricing':
      return pricingCSS()
    default:
      return websiteCSS()
  }
}

/**
 * Generate complete CSS for a type with options
 */
export function generateCSS(type: string, opts: StyleOptions = {}): string {
  const color = opts.color || 'indigo'

  return [
    '/* Generated by @mdxe/hono */',
    baseVars(opts),
    baseLayout(),
    headerCSS(),
    footerCSS(),
    tocCSS(),
    typeCSS(type),
    opts.background ? backgroundCSS(opts.background, color) : '',
  ].join('\n')
}

/**
 * Parse query string into StyleOptions
 */
export function parseStyleOptions(query: Record<string, string>): StyleOptions {
  return {
    color: query.color || query.c,
    background: query.background || query.bg,
    mode: query.mode || query.m,
    font: query.font || query.f,
    radius: query.radius || query.r,
  }
}
