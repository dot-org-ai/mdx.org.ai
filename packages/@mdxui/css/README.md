# @mdxui/css

Pure CSS framework for semantic HTML with OKLCH colors, CSS variables, and optional Cloudflare Worker for dynamic theming.

## Installation

```bash
pnpm add @mdxui/css
```

## Usage

### Static CSS

```html
<!-- Full bundle -->
<link rel="stylesheet" href="node_modules/@mdxui/css/dist/index.css">

<!-- Or import specific modules -->
<link rel="stylesheet" href="node_modules/@mdxui/css/dist/variables.css">
<link rel="stylesheet" href="node_modules/@mdxui/css/dist/colors.css">
<link rel="stylesheet" href="node_modules/@mdxui/css/dist/layouts.css">
```

```tsx
// In React/Next.js
import '@mdxui/css/styles'
```

### Dynamic CSS via Cloudflare Worker

Deploy the included worker for runtime CSS transforms:

```bash
cd packages/@mdxui/css
pnpm deploy
```

```html
<!-- Base theme -->
<link rel="stylesheet" href="https://your-worker.workers.dev">

<!-- Runtime transforms -->
<link rel="stylesheet"
  href="https://your-worker.workers.dev/transform?theme=dark&primary=indigo-500&radius=lg">
```

## Available Modules

| Module | Description | Export |
|--------|-------------|--------|
| `index.css` | Complete bundle | `@mdxui/css/styles` |
| `variables.css` | CSS custom properties | `@mdxui/css/variables` |
| `colors.css` | OKLCH color utilities | `@mdxui/css/colors` |
| `themes.css` | Theme presets (dark, light, dim, midnight) | `@mdxui/css/themes` |
| `base.css` | Base styles & resets | `@mdxui/css/base` |
| `layouts.css` | Layout primitives | `@mdxui/css/layouts` |
| `sections.css` | Section containers | `@mdxui/css/sections` |
| `nav.css` | Navigation components | `@mdxui/css/nav` |
| `backgrounds.css` | Background patterns | `@mdxui/css/backgrounds` |
| `containers.css` | Container queries | `@mdxui/css/containers` |

## Features

- **OKLCH Colors**: Perceptually uniform color space for consistent theming
- **CSS Variables**: Fully customizable via custom properties
- **Semantic HTML**: Works with plain HTML elements
- **Theme Presets**: Dark, light, dim, midnight built-in
- **No JS Required**: Pure CSS framework
- **Cloudflare Worker**: Optional dynamic theming with edge caching

## CSS Variables

The framework defines a complete design system via CSS variables:

```css
:root {
  /* Colors (OKLCH) */
  --background: oklch(100% 0 0);
  --foreground: oklch(14.1% 0.005 285.82);
  --primary: oklch(20.5% 0.006 285.88);
  --accent: oklch(96.9% 0.001 286.37);

  /* Spacing (rem-based) */
  --spacing-1: 0.25rem;
  --spacing-4: 1rem;
  --spacing-8: 2rem;

  /* Typography */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
}
```

## Cloudflare Worker API

The worker serves static CSS and provides runtime transforms:

```
GET /                      → Full CSS bundle
GET /colors.css           → Color utilities only
GET /themes.css           → Theme presets only
GET /transform?params     → Dynamic customization
```

Transform parameters:
- `theme` - dark, light, dim, midnight
- `primary` - Tailwind color token (e.g., blue-500)
- `radius` - sm, md, lg, xl
- `[var]=[value]` - Any CSS variable

## License

MIT
