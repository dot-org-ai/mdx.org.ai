# @mdxui/js

Lightweight client-side interactivity using **Hono JSX DOM (2.8KB)** with selective hydration.

## Features

- **Tiny**: 2.8KB runtime (Hono JSX DOM) vs 47.8KB (React)
- **Selective Hydration**: Only load JS for components that need interactivity
- **Tree-Shaken**: Individual component bundles
- **SSR Compatible**: Works with server-rendered HTML
- **Theme System**: Built-in dark mode with system preference detection
- **Cloudflare Worker**: Static asset serving with edge caching

## Installation

```bash
pnpm add @mdxui/js
```

## Usage

### 1. NPM Package (Node/SSR)

```tsx
import { Counter, ThemeToggle } from '@mdxui/js/components'
import { render } from '@mdxui/js/runtime'

// Server-side rendering
function App() {
  return (
    <div>
      <ThemeToggle />
      <Counter initial={5} />
    </div>
  )
}

// Client-side rendering
render(<App />, document.getElementById('app'))
```

### 2. Browser Bundles (CDN)

Serve pre-compiled bundles from the Cloudflare Worker:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Theme script (inline to prevent FOUC) -->
  <script src="https://js.mdxui.org/theme?theme=auto"></script>
</head>
<body>
  <!-- Server-rendered HTML with hydration markers -->
  <div data-hydrate="ThemeToggle"></div>
  <div data-hydrate="Counter" data-props='{"initial":5}'></div>

  <!-- Selective hydration (only loads specified components) -->
  <script src="https://js.mdxui.org/hydrate?components=ThemeToggle,Counter"></script>
</body>
</html>
```

## Cloudflare Worker

The worker serves pre-compiled bundles with aggressive edge caching.

### Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| `/hydrate` | Selective hydration script | `/hydrate?components=Counter,ThemeToggle` |
| `/theme` | Theme context injection | `/theme?theme=dark` |
| `/runtime` | Minimal hydration runtime | `/runtime` |
| `/components/:name` | Individual component bundle | `/components/Counter.js` |
| `/dist/*` | Static assets | `/dist/runtime.js` |

### Worker Features

- **Static Assets**: Serves from `./dist` directory via Cloudflare Assets binding
- **CORS**: Enabled for cross-origin requests
- **Caching**: Aggressive edge caching (1 year for immutable bundles)
- **Tree-Shaking**: Only loads requested components
- **Minified**: All bundles minified for production

### Deploy

```bash
# Install dependencies
pnpm install

# Build bundles
pnpm build

# Deploy to Cloudflare
pnpm wrangler deploy
```

Configuration in `wrangler.toml`:

```toml
name = "mdxui-js"
main = "src/worker/index.ts"
compatibility_date = "2024-01-01"

[assets]
directory = "./dist"
binding = "ASSETS"

[vars]
CSS_WORKER_URL = "https://css.mdxui.org"
```

## Selective Hydration

Only load JavaScript for interactive components using `data-hydrate` attributes.

### How It Works

1. **Mark components for hydration** with `data-hydrate` attribute
2. **Pass props** via `data-props` JSON attribute (optional)
3. **Load hydration script** with component names in query string

```html
<!-- Static HTML (no JS loaded) -->
<p>This is just HTML, no JavaScript needed!</p>

<!-- Interactive components (JS loaded only for these) -->
<div data-hydrate="Counter" data-props='{"initial":10}'></div>
<div data-hydrate="ThemeToggle"></div>

<!-- Load only Counter and ThemeToggle bundles -->
<script src="https://js.mdxui.org/hydrate?components=Counter,ThemeToggle"></script>
```

### Benefits

- **Faster Load Times**: Only load JS for interactive parts
- **Better Performance**: Less JavaScript = faster parse/execution
- **Progressive Enhancement**: Works even if JS fails to load
- **SEO Friendly**: Full HTML for crawlers

## Theme System

Built-in theme system with dark mode support.

### Theme Script

Load the theme script in `<head>` to prevent FOUC (Flash of Unstyled Content):

```html
<head>
  <!-- Auto-detect system preference -->
  <script src="https://js.mdxui.org/theme?theme=auto"></script>

  <!-- Or force a specific theme -->
  <script src="https://js.mdxui.org/theme?theme=dark"></script>
</head>
```

### Theme Modes

- `auto` - Follows system preference (default)
- `light` - Force light mode
- `dark` - Force dark mode
- Custom - Any string for custom themes

### Theme API

The theme script exposes a global API:

```typescript
// Get current theme ('light' or 'dark')
window.__mdxui_theme.get()

// Get current mode ('auto', 'light', 'dark')
window.__mdxui_theme.getMode()

// Set theme mode
window.__mdxui_theme.set('dark')

// Toggle between light and dark
window.__mdxui_theme.toggle()

// Apply theme without storing preference
window.__mdxui_theme.apply('dark')
```

### Theme Events

Listen for theme changes:

```javascript
window.addEventListener('themechange', (e) => {
  console.log('Theme changed:', e.detail.theme)
  console.log('Mode:', e.detail.mode)
})
```

### ThemeToggle Component

Use the built-in component:

```html
<div data-hydrate="ThemeToggle"></div>
<script src="https://js.mdxui.org/hydrate?components=ThemeToggle"></script>
```

Or generate a simple toggle button:

```typescript
import { generateThemeToggleSnippet } from '@mdxui/js'

const html = generateThemeToggleSnippet()
// Returns: <button id="theme-toggle">...</button><script>...</script>
```

## Components

### Counter

Simple counter with increment/decrement buttons.

```html
<div data-hydrate="Counter" data-props='{"initial":5}'></div>
```

Props:
- `initial?: number` - Starting count (default: 0)

### ThemeToggle

Toggle between light and dark themes.

```html
<div data-hydrate="ThemeToggle"></div>
```

### CopyButton

Copy text to clipboard with visual feedback.

```html
<div data-hydrate="CopyButton" data-props='{"text":"Hello World"}'></div>
```

Props:
- `text: string` - Text to copy
- `children?: ReactNode` - Button label (default: "Copy")

### Accordion

Collapsible content panel.

```html
<div
  data-hydrate="Accordion"
  data-props='{"title":"Click to expand","defaultOpen":false}'
>
  <p>Hidden content here</p>
</div>
```

Props:
- `title: string` - Panel title
- `children: ReactNode` - Panel content
- `defaultOpen?: boolean` - Initially expanded (default: false)

## Custom Hooks

All hooks from `hono/jsx` are re-exported:

```typescript
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
  useContext,
  createContext,
} from '@mdxui/js/runtime'
```

Plus custom hooks:

```typescript
import {
  useTheme,
  useCopyToClipboard,
  useLocalStorage,
  useMediaQuery,
  useInView,
} from '@mdxui/js/hooks'
```

## Build System

The package uses `tsup` with two build configurations:

### 1. NPM Package Build

For npm consumers (Node/SSR):

```typescript
{
  entry: {
    index: 'src/index.ts',
    'runtime/index': 'src/runtime/index.ts',
    'components/index': 'src/components/index.ts',
    'hooks/index': 'src/hooks/index.ts',
  },
  format: ['esm', 'cjs'],
  external: ['hono'],  // hono is peer dependency
}
```

### 2. Browser Bundle Build

For Cloudflare Worker static assets:

```typescript
{
  entry: {
    runtime: 'src/runtime/index.ts',
    'components/ThemeToggle': 'src/components/ThemeToggle.ts',
    'components/Counter': 'src/components/Counter.ts',
    // ... individual components
  },
  format: ['esm'],
  noExternal: ['hono'],  // bundle hono for browser
  minify: true,
  platform: 'browser',
}
```

This generates:
- `dist/runtime.js` - Hono JSX DOM runtime (2.8KB minified)
- `dist/components/Counter.js` - Individual component bundles
- Each bundle is tree-shaken and minified

## Architecture

### URL-Based File System

Following MDXLD conventions, components can be accessed via URL:

```
https://js.mdxui.org/
├── /hydrate?components=...    # Selective hydration
├── /theme?theme=...           # Theme injection
├── /runtime                   # Hono JSX DOM runtime
├── /components/
│   ├── Counter.js            # Individual bundles
│   ├── ThemeToggle.js
│   ├── CopyButton.js
│   └── Accordion.js
└── /dist/                     # Static assets
```

### Component Registry

The hydration script maintains a component registry:

```typescript
const componentModules = {
  'Counter': () => import('/components/Counter.js'),
  'ThemeToggle': () => import('/components/ThemeToggle.js'),
}

// Load on demand
const Component = await loadComponent('Counter')
```

### Data Flow

1. **Server renders** HTML with `data-hydrate` attributes
2. **Browser loads** minimal hydration script
3. **Script scans** for `[data-hydrate]` elements
4. **Imports** only specified components
5. **Hydrates** each element with component + props
6. **Observes** DOM for dynamically added elements

## Development

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck

# Deploy worker
pnpm wrangler deploy
```

## Examples

### Minimal Example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://js.mdxui.org/theme"></script>
</head>
<body>
  <h1>Hello World</h1>
  <div data-hydrate="Counter"></div>
  <script src="https://js.mdxui.org/hydrate?components=Counter"></script>
</body>
</html>
```

### Full Example

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@mdxui/js Demo</title>

  <!-- Inline theme script to prevent FOUC -->
  <script src="https://js.mdxui.org/theme?theme=auto"></script>

  <!-- CSS from @mdxui/css worker -->
  <link rel="stylesheet" href="https://css.mdxui.org/main.css">
</head>
<body>
  <header>
    <h1>MDXUI Demo</h1>
    <div data-hydrate="ThemeToggle"></div>
  </header>

  <main>
    <h2>Interactive Counter</h2>
    <div data-hydrate="Counter" data-props='{"initial":10}'></div>

    <h2>Code Example</h2>
    <pre><code>console.log('Hello World')</code></pre>
    <div data-hydrate="CopyButton" data-props='{"text":"console.log(\"Hello World\")"}'></div>

    <h2>Collapsible Content</h2>
    <div data-hydrate="Accordion" data-props='{"title":"Click to expand"}'>
      <p>This content is hidden by default.</p>
    </div>
  </main>

  <!-- Selective hydration - only loads 4 components -->
  <script src="https://js.mdxui.org/hydrate?components=ThemeToggle,Counter,CopyButton,Accordion"></script>
</body>
</html>
```

## Comparison

### Bundle Size

| Library | Size (minified + gzipped) |
|---------|---------------------------|
| **Hono JSX DOM** | **2.8 KB** |
| Preact | 4 KB |
| Vue 3 | 34 KB |
| React 18 | 47.8 KB |
| Angular 17 | 69 KB |

### Features

| Feature | @mdxui/js | React | Preact |
|---------|-----------|-------|--------|
| Selective Hydration | ✅ | ❌ | ❌ |
| Tree-Shaking | ✅ | Partial | Partial |
| SSR | ✅ | ✅ | ✅ |
| Hooks | ✅ | ✅ | ✅ |
| JSX | ✅ | ✅ | ✅ |
| Edge Caching | ✅ | ❌ | ❌ |
| Theme System | ✅ | ❌ | ❌ |

## License

MIT

## Related Packages

- **[@mdxui/html](../html)** - Server-side rendering to HTML
- **[@mdxui/css](../css)** - Tailwind CSS worker with JIT compilation
- **[@mdxe/workers](../../@mdxe/workers)** - Cloudflare Workers runtime
- **[mdxld](../../mdxld)** - MDX with YAML-LD frontmatter
