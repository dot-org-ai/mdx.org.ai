/**
 * Minimal runtime CSS transforms for dynamic theming
 *
 * These snippets provide lightweight runtime transforms without requiring
 * full CSS re-compilation. They generate CSS variable overrides that can
 * be applied on top of pre-compiled static CSS bundles.
 */

// Tailwind color token resolver (OKLCH format)
const TAILWIND_COLORS: Record<string, Record<string, string>> = {
  slate: {
    '50': 'oklch(0.984 0.003 247.858)',
    '100': 'oklch(0.968 0.007 247.896)',
    '200': 'oklch(0.929 0.013 255.508)',
    '300': 'oklch(0.869 0.022 252.894)',
    '400': 'oklch(0.704 0.04 256.788)',
    '500': 'oklch(0.554 0.046 257.417)',
    '600': 'oklch(0.446 0.043 257.281)',
    '700': 'oklch(0.372 0.044 257.287)',
    '800': 'oklch(0.279 0.041 260.031)',
    '900': 'oklch(0.208 0.042 265.755)',
    '950': 'oklch(0.129 0.042 264.695)',
  },
  gray: {
    '50': 'oklch(0.985 0.002 247.839)',
    '100': 'oklch(0.967 0.003 264.542)',
    '200': 'oklch(0.928 0.006 264.531)',
    '300': 'oklch(0.872 0.01 258.338)',
    '400': 'oklch(0.707 0.022 261.325)',
    '500': 'oklch(0.551 0.027 264.364)',
    '600': 'oklch(0.446 0.03 256.802)',
    '700': 'oklch(0.373 0.034 259.733)',
    '800': 'oklch(0.278 0.033 256.848)',
    '900': 'oklch(0.21 0.034 264.665)',
    '950': 'oklch(0.13 0.028 261.692)',
  },
  zinc: {
    '50': 'oklch(0.985 0 0)',
    '100': 'oklch(0.967 0.001 286.375)',
    '200': 'oklch(0.92 0.004 286.32)',
    '300': 'oklch(0.871 0.006 286.286)',
    '400': 'oklch(0.705 0.015 286.067)',
    '500': 'oklch(0.552 0.016 285.938)',
    '600': 'oklch(0.442 0.017 285.786)',
    '700': 'oklch(0.37 0.013 285.805)',
    '800': 'oklch(0.274 0.006 286.033)',
    '900': 'oklch(0.21 0.006 285.885)',
    '950': 'oklch(0.141 0.005 285.823)',
  },
  neutral: {
    '50': 'oklch(0.985 0 0)',
    '100': 'oklch(0.97 0 0)',
    '200': 'oklch(0.922 0 0)',
    '300': 'oklch(0.87 0 0)',
    '400': 'oklch(0.708 0 0)',
    '500': 'oklch(0.556 0 0)',
    '600': 'oklch(0.439 0 0)',
    '700': 'oklch(0.371 0 0)',
    '800': 'oklch(0.269 0 0)',
    '900': 'oklch(0.205 0 0)',
    '950': 'oklch(0.145 0 0)',
  },
  red: {
    '50': 'oklch(0.971 0.013 17.38)',
    '100': 'oklch(0.936 0.032 17.717)',
    '200': 'oklch(0.885 0.062 18.334)',
    '300': 'oklch(0.808 0.114 19.571)',
    '400': 'oklch(0.704 0.191 22.216)',
    '500': 'oklch(0.637 0.237 25.331)',
    '600': 'oklch(0.577 0.245 27.325)',
    '700': 'oklch(0.505 0.213 27.518)',
    '800': 'oklch(0.444 0.177 26.899)',
    '900': 'oklch(0.396 0.141 25.723)',
    '950': 'oklch(0.258 0.092 26.042)',
  },
  orange: {
    '50': 'oklch(0.98 0.016 73.684)',
    '100': 'oklch(0.954 0.038 75.164)',
    '200': 'oklch(0.901 0.076 70.697)',
    '300': 'oklch(0.837 0.128 66.29)',
    '400': 'oklch(0.75 0.183 55.934)',
    '500': 'oklch(0.705 0.213 47.604)',
    '600': 'oklch(0.646 0.222 41.116)',
    '700': 'oklch(0.553 0.195 38.402)',
    '800': 'oklch(0.47 0.157 37.304)',
    '900': 'oklch(0.408 0.123 38.172)',
    '950': 'oklch(0.266 0.079 36.259)',
  },
  yellow: {
    '50': 'oklch(0.987 0.026 99.165)',
    '100': 'oklch(0.971 0.064 101.891)',
    '200': 'oklch(0.937 0.126 100.558)',
    '300': 'oklch(0.892 0.184 98.111)',
    '400': 'oklch(0.839 0.199 93.365)',
    '500': 'oklch(0.776 0.178 88.007)',
    '600': 'oklch(0.672 0.149 78.463)',
    '700': 'oklch(0.553 0.125 68.333)',
    '800': 'oklch(0.474 0.107 61.505)',
    '900': 'oklch(0.416 0.089 56.262)',
    '950': 'oklch(0.289 0.061 52.258)',
  },
  green: {
    '50': 'oklch(0.982 0.018 155.826)',
    '100': 'oklch(0.962 0.044 156.743)',
    '200': 'oklch(0.925 0.08 156.901)',
    '300': 'oklch(0.869 0.134 155.995)',
    '400': 'oklch(0.792 0.176 154.449)',
    '500': 'oklch(0.715 0.177 152.316)',
    '600': 'oklch(0.598 0.153 151.711)',
    '700': 'oklch(0.497 0.124 152.535)',
    '800': 'oklch(0.42 0.098 153.628)',
    '900': 'oklch(0.368 0.079 155.998)',
    '950': 'oklch(0.253 0.053 157.907)',
  },
  emerald: {
    '50': 'oklch(0.979 0.021 166.113)',
    '100': 'oklch(0.95 0.052 163.051)',
    '200': 'oklch(0.905 0.093 164.15)',
    '300': 'oklch(0.845 0.143 164.978)',
    '400': 'oklch(0.765 0.177 163.223)',
    '500': 'oklch(0.696 0.17 162.48)',
    '600': 'oklch(0.596 0.145 163.225)',
    '700': 'oklch(0.508 0.118 165.612)',
    '800': 'oklch(0.432 0.095 166.913)',
    '900': 'oklch(0.378 0.077 168.94)',
    '950': 'oklch(0.262 0.051 172.552)',
  },
  teal: {
    '50': 'oklch(0.984 0.02 180.807)',
    '100': 'oklch(0.953 0.049 183.215)',
    '200': 'oklch(0.913 0.085 186.052)',
    '300': 'oklch(0.862 0.122 189.961)',
    '400': 'oklch(0.787 0.139 192.617)',
    '500': 'oklch(0.709 0.132 194.77)',
    '600': 'oklch(0.607 0.114 198.522)',
    '700': 'oklch(0.518 0.094 200.511)',
    '800': 'oklch(0.445 0.076 200.695)',
    '900': 'oklch(0.393 0.063 201.854)',
    '950': 'oklch(0.292 0.05 205.409)',
  },
  cyan: {
    '50': 'oklch(0.984 0.019 200.873)',
    '100': 'oklch(0.956 0.045 203.388)',
    '200': 'oklch(0.917 0.08 205.041)',
    '300': 'oklch(0.865 0.127 207.078)',
    '400': 'oklch(0.789 0.154 211.53)',
    '500': 'oklch(0.715 0.143 215.221)',
    '600': 'oklch(0.609 0.126 221.723)',
    '700': 'oklch(0.52 0.105 223.128)',
    '800': 'oklch(0.45 0.085 224.283)',
    '900': 'oklch(0.398 0.07 227.392)',
    '950': 'oklch(0.302 0.056 229.695)',
  },
  sky: {
    '50': 'oklch(0.977 0.013 236.62)',
    '100': 'oklch(0.951 0.027 236.852)',
    '200': 'oklch(0.901 0.063 230.281)',
    '300': 'oklch(0.828 0.12 229.695)',
    '400': 'oklch(0.746 0.166 232.661)',
    '500': 'oklch(0.685 0.169 237.323)',
    '600': 'oklch(0.585 0.177 243.484)',
    '700': 'oklch(0.503 0.172 245.219)',
    '800': 'oklch(0.444 0.137 246.06)',
    '900': 'oklch(0.394 0.098 247.759)',
    '950': 'oklch(0.292 0.066 250.065)',
  },
  blue: {
    '50': 'oklch(0.97 0.014 254.604)',
    '100': 'oklch(0.932 0.032 255.585)',
    '200': 'oklch(0.882 0.059 254.128)',
    '300': 'oklch(0.809 0.105 251.813)',
    '400': 'oklch(0.707 0.165 254.624)',
    '500': 'oklch(0.623 0.214 259.815)',
    '600': 'oklch(0.546 0.245 262.881)',
    '700': 'oklch(0.488 0.243 264.376)',
    '800': 'oklch(0.424 0.199 265.638)',
    '900': 'oklch(0.379 0.146 265.522)',
    '950': 'oklch(0.282 0.091 267.935)',
  },
  indigo: {
    '50': 'oklch(0.962 0.018 272.314)',
    '100': 'oklch(0.93 0.034 272.788)',
    '200': 'oklch(0.87 0.065 274.039)',
    '300': 'oklch(0.785 0.115 274.713)',
    '400': 'oklch(0.673 0.182 276.935)',
    '500': 'oklch(0.585 0.233 277.117)',
    '600': 'oklch(0.511 0.262 276.966)',
    '700': 'oklch(0.457 0.24 277.023)',
    '800': 'oklch(0.398 0.195 277.366)',
    '900': 'oklch(0.359 0.144 278.697)',
    '950': 'oklch(0.257 0.09 281.288)',
  },
  violet: {
    '50': 'oklch(0.969 0.016 293.756)',
    '100': 'oklch(0.943 0.029 294.588)',
    '200': 'oklch(0.894 0.057 293.283)',
    '300': 'oklch(0.811 0.111 293.571)',
    '400': 'oklch(0.702 0.183 293.541)',
    '500': 'oklch(0.606 0.25 292.717)',
    '600': 'oklch(0.541 0.281 293.009)',
    '700': 'oklch(0.491 0.27 292.581)',
    '800': 'oklch(0.432 0.232 292.759)',
    '900': 'oklch(0.38 0.189 293.745)',
    '950': 'oklch(0.283 0.141 291.089)',
  },
  purple: {
    '50': 'oklch(0.977 0.014 308.299)',
    '100': 'oklch(0.946 0.033 307.174)',
    '200': 'oklch(0.902 0.063 306.703)',
    '300': 'oklch(0.827 0.119 306.383)',
    '400': 'oklch(0.714 0.203 305.504)',
    '500': 'oklch(0.609 0.264 303.9)',
    '600': 'oklch(0.558 0.288 302.321)',
    '700': 'oklch(0.496 0.265 301.924)',
    '800': 'oklch(0.438 0.218 303.724)',
    '900': 'oklch(0.381 0.176 304.987)',
    '950': 'oklch(0.291 0.149 302.717)',
  },
  fuchsia: {
    '50': 'oklch(0.977 0.017 320.058)',
    '100': 'oklch(0.952 0.037 318.852)',
    '200': 'oklch(0.903 0.076 319.62)',
    '300': 'oklch(0.833 0.145 321.434)',
    '400': 'oklch(0.74 0.238 322.16)',
    '500': 'oklch(0.667 0.295 322.15)',
    '600': 'oklch(0.591 0.293 322.896)',
    '700': 'oklch(0.518 0.253 323.949)',
    '800': 'oklch(0.456 0.212 324.591)',
    '900': 'oklch(0.403 0.174 325.371)',
    '950': 'oklch(0.296 0.137 325.661)',
  },
  pink: {
    '50': 'oklch(0.971 0.014 343.198)',
    '100': 'oklch(0.948 0.028 342.258)',
    '200': 'oklch(0.899 0.061 343.231)',
    '300': 'oklch(0.823 0.12 346.018)',
    '400': 'oklch(0.718 0.202 349.761)',
    '500': 'oklch(0.656 0.241 354.308)',
    '600': 'oklch(0.592 0.249 0.584)',
    '700': 'oklch(0.525 0.223 3.958)',
    '800': 'oklch(0.459 0.187 3.815)',
    '900': 'oklch(0.408 0.153 2.432)',
    '950': 'oklch(0.284 0.109 3.907)',
  },
  rose: {
    '50': 'oklch(0.969 0.015 12.422)',
    '100': 'oklch(0.941 0.03 12.58)',
    '200': 'oklch(0.892 0.058 10.001)',
    '300': 'oklch(0.82 0.113 11.544)',
    '400': 'oklch(0.718 0.194 13.428)',
    '500': 'oklch(0.645 0.246 16.439)',
    '600': 'oklch(0.586 0.253 19.116)',
    '700': 'oklch(0.514 0.228 18.395)',
    '800': 'oklch(0.456 0.193 16.455)',
    '900': 'oklch(0.412 0.163 13.697)',
    '950': 'oklch(0.271 0.105 12.094)',
  },
}

// Preset themes
const THEMES: Record<string, Record<string, string>> = {
  light: {
    '--background': 'oklch(100% 0 0)',
    '--foreground': 'oklch(14.1% 0.005 285.82)',
    '--card': 'oklch(100% 0 0)',
    '--card-foreground': 'oklch(14.1% 0.005 285.82)',
    '--primary': 'oklch(20.5% 0.006 285.88)',
    '--primary-foreground': 'oklch(98.5% 0 0)',
    '--secondary': 'oklch(96.7% 0.003 264.54)',
    '--secondary-foreground': 'oklch(20.5% 0.006 285.88)',
    '--muted': 'oklch(96.7% 0.003 264.54)',
    '--muted-foreground': 'oklch(55.1% 0.027 264.36)',
    '--accent': 'oklch(96.7% 0.003 264.54)',
    '--accent-foreground': 'oklch(20.5% 0.006 285.88)',
    '--destructive': 'oklch(0.637 0.237 25.331)',
    '--destructive-foreground': 'oklch(98.5% 0 0)',
    '--border': 'oklch(92.8% 0.006 264.53)',
    '--input': 'oklch(92.8% 0.006 264.53)',
    '--ring': 'oklch(20.5% 0.006 285.88)',
  },
  dark: {
    '--background': 'oklch(14.1% 0.005 285.82)',
    '--foreground': 'oklch(98.5% 0 0)',
    '--card': 'oklch(17.1% 0.005 285.82)',
    '--card-foreground': 'oklch(98.5% 0 0)',
    '--primary': 'oklch(98.5% 0 0)',
    '--primary-foreground': 'oklch(20.5% 0.006 285.88)',
    '--secondary': 'oklch(26.9% 0.006 286.03)',
    '--secondary-foreground': 'oklch(98.5% 0 0)',
    '--muted': 'oklch(26.9% 0.006 286.03)',
    '--muted-foreground': 'oklch(70.7% 0.022 261.32)',
    '--accent': 'oklch(26.9% 0.006 286.03)',
    '--accent-foreground': 'oklch(98.5% 0 0)',
    '--destructive': 'oklch(0.505 0.213 27.518)',
    '--destructive-foreground': 'oklch(98.5% 0 0)',
    '--border': 'oklch(26.9% 0.006 286.03)',
    '--input': 'oklch(26.9% 0.006 286.03)',
    '--ring': 'oklch(98.5% 0 0)',
  },
  dim: {
    '--background': 'oklch(20% 0.01 260)',
    '--foreground': 'oklch(90% 0.01 260)',
    '--card': 'oklch(23% 0.01 260)',
    '--card-foreground': 'oklch(90% 0.01 260)',
    '--primary': 'oklch(70% 0.15 260)',
    '--primary-foreground': 'oklch(98% 0 0)',
    '--secondary': 'oklch(30% 0.01 260)',
    '--secondary-foreground': 'oklch(90% 0.01 260)',
    '--muted': 'oklch(30% 0.01 260)',
    '--muted-foreground': 'oklch(65% 0.02 260)',
    '--accent': 'oklch(35% 0.02 260)',
    '--accent-foreground': 'oklch(90% 0.01 260)',
    '--destructive': 'oklch(0.637 0.237 25.331)',
    '--destructive-foreground': 'oklch(98% 0 0)',
    '--border': 'oklch(30% 0.02 260)',
    '--input': 'oklch(30% 0.02 260)',
    '--ring': 'oklch(70% 0.15 260)',
  },
  midnight: {
    '--background': 'oklch(10% 0.02 280)',
    '--foreground': 'oklch(95% 0.01 280)',
    '--card': 'oklch(14% 0.02 280)',
    '--card-foreground': 'oklch(95% 0.01 280)',
    '--primary': 'oklch(70% 0.2 280)',
    '--primary-foreground': 'oklch(98% 0 0)',
    '--secondary': 'oklch(20% 0.02 280)',
    '--secondary-foreground': 'oklch(95% 0.01 280)',
    '--muted': 'oklch(20% 0.02 280)',
    '--muted-foreground': 'oklch(60% 0.03 280)',
    '--accent': 'oklch(25% 0.03 280)',
    '--accent-foreground': 'oklch(95% 0.01 280)',
    '--destructive': 'oklch(0.637 0.237 25.331)',
    '--destructive-foreground': 'oklch(98% 0 0)',
    '--border': 'oklch(25% 0.03 280)',
    '--input': 'oklch(25% 0.03 280)',
    '--ring': 'oklch(70% 0.2 280)',
  },
}

// Radius presets
const RADIUS: Record<string, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
}

/**
 * Resolve a Tailwind color token to OKLCH value
 */
export function resolveColor(token: string): string | null {
  // Check if it's a tailwind token (e.g., blue-500, slate-950)
  const match = token.match(/^([a-z]+)-(\d+)$/)
  if (match) {
    const [, color, shade] = match
    return TAILWIND_COLORS[color]?.[shade] || null
  }
  // Return as-is if it's already a color value
  if (token.startsWith('oklch') || token.startsWith('#') || token.startsWith('rgb')) {
    return token
  }
  return null
}

/**
 * Map size tokens to rem values
 */
export function resolveRadius(size: string): string | null {
  return RADIUS[size] || null
}

/**
 * Transform CSS with runtime customizations
 * Generates minimal CSS variable overrides based on query parameters
 */
export function transformCSS(params: URLSearchParams): string {
  const overrides: string[] = []

  // Handle preset theme
  const theme = params.get('theme')
  if (theme && THEMES[theme]) {
    for (const [key, value] of Object.entries(THEMES[theme])) {
      overrides.push(`  ${key}: ${value};`)
    }
  }

  // Handle radius preset
  const radius = params.get('radius')
  if (radius) {
    const resolvedRadius = resolveRadius(radius)
    if (resolvedRadius) {
      overrides.push(`  --radius: ${resolvedRadius};`)
    }
  }

  // Handle primary color
  const primary = params.get('primary')
  if (primary) {
    const resolvedColor = resolveColor(primary)
    if (resolvedColor) {
      overrides.push(`  --primary: ${resolvedColor};`)
    }
  }

  // Handle individual variable overrides
  for (const [key, value] of params.entries()) {
    if (['theme', 'radius', 'primary'].includes(key)) continue

    const cssVar = `--${key.replace(/_/g, '-')}`
    const resolvedValue = resolveColor(value) || value

    overrides.push(`  ${cssVar}: ${resolvedValue};`)
  }

  if (overrides.length === 0) {
    return '/* No customizations specified */'
  }

  return `:root {\n${overrides.join('\n')}\n}`
}

/**
 * Get available theme presets
 */
export function getThemes(): string[] {
  return Object.keys(THEMES)
}

/**
 * Get available color palettes
 */
export function getColors(): string[] {
  return Object.keys(TAILWIND_COLORS)
}

/**
 * Get color palette by name
 */
export function getColorPalette(color: string): Record<string, string> | null {
  return TAILWIND_COLORS[color] || null
}
