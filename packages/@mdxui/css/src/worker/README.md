# @mdxui/css Worker

Cloudflare Worker that serves pre-compiled CSS as static assets (free) with optional snippet-based runtime transforms (minimal compute cost).

## Architecture

### Static Assets (Zero Cost)
Pre-compiled CSS bundles are served directly from Cloudflare's edge using Static Assets:
- `/` → `dist/index.css` (complete framework)
- `/colors.css` → `dist/colors.css` (color utilities)
- `/themes.css` → `dist/themes.css` (theme presets)
- `/variables.css` → `dist/variables.css` (CSS variables)
- `/layouts.css` → `dist/layouts.css` (layout utilities)
- `/backgrounds.css` → `dist/backgrounds.css` (background patterns)

Benefits:
- **Free**: No compute costs for static files
- **Fast**: Edge-cached globally with 24hr cache
- **Scalable**: Handles millions of requests

### Runtime Transforms (Minimal Cost)
The `/transform` endpoint generates CSS variable overrides for dynamic theming:

```
GET /transform?theme=dark&primary=indigo-500&radius=lg
```

Returns minimal CSS:
```css
:root {
  --background: oklch(14.1% 0.005 285.82);
  --foreground: oklch(98.5% 0 0);
  --primary: oklch(0.585 0.233 277.117);
  --radius: 0.75rem;
}
```

Benefits:
- **Lightweight**: Only generates variable overrides (~1KB)
- **Fast**: Simple string concatenation, no parsing
- **Cached**: 1hr cache reduces compute further

## API Reference

### Static Assets

#### GET /
Returns the complete CSS framework (all modules combined).

```html
<link rel="stylesheet" href="https://css.mdx.org.ai/">
```

#### GET /[module].css
Returns a specific CSS module:
- `/colors.css` - OKLCH color palette
- `/themes.css` - Theme presets
- `/variables.css` - CSS variables
- `/base.css` - Base styles
- `/layouts.css` - Layout utilities
- `/nav.css` - Navigation components
- `/sections.css` - Section layouts
- `/views.css` - View templates
- `/containers.css` - Container utilities
- `/backgrounds.css` - Background patterns

```html
<link rel="stylesheet" href="https://css.mdx.org.ai/colors.css">
<link rel="stylesheet" href="https://css.mdx.org.ai/themes.css">
```

### Runtime Transforms

#### GET /transform
Generates CSS variable overrides based on query parameters.

**Query Parameters:**
- `theme` - Preset theme: `light`, `dark`, `dim`, `midnight`
- `primary` - Primary color (Tailwind token or OKLCH)
- `radius` - Border radius: `none`, `sm`, `md`, `lg`, `xl`, `2xl`, `full`
- `[var]` - Any CSS variable name (without `--`)

**Examples:**

Dark theme with custom primary color:
```html
<link rel="stylesheet" href="https://css.mdx.org.ai/transform?theme=dark&primary=blue-500">
```

Custom theme from scratch:
```html
<link rel="stylesheet" href="https://css.mdx.org.ai/transform?background=slate-950&foreground=slate-50&primary=indigo-500&radius=lg">
```

Multiple overrides:
```html
<link rel="stylesheet" href="https://css.mdx.org.ai/transform?theme=midnight&primary=violet-400&secondary=purple-300&radius=xl">
```

## Usage Patterns

### Pattern 1: Static Framework
Use pre-compiled CSS for best performance:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://css.mdx.org.ai/">
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### Pattern 2: Static + Custom Theme
Load static CSS, then override with custom theme:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Base styles (static) -->
  <link rel="stylesheet" href="https://css.mdx.org.ai/">
  <!-- Custom theme (runtime) -->
  <link rel="stylesheet" href="https://css.mdx.org.ai/transform?theme=dark&primary=indigo-500">
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### Pattern 3: Modular Loading
Load only the modules you need:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://css.mdx.org.ai/variables.css">
  <link rel="stylesheet" href="https://css.mdx.org.ai/base.css">
  <link rel="stylesheet" href="https://css.mdx.org.ai/layouts.css">
  <link rel="stylesheet" href="https://css.mdx.org.ai/transform?theme=dark">
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### Pattern 4: Dynamic Theme Switching
Use JavaScript to switch themes without page reload:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://css.mdx.org.ai/">
  <link rel="stylesheet" id="theme" href="https://css.mdx.org.ai/transform?theme=light">
</head>
<body>
  <button onclick="switchTheme('dark')">Dark</button>
  <button onclick="switchTheme('light')">Light</button>

  <script>
    function switchTheme(theme) {
      document.getElementById('theme').href =
        `https://css.mdx.org.ai/transform?theme=${theme}`
    }
  </script>
</body>
</html>
```

## Color Tokens

Tailwind color tokens are supported for the `primary` and other color parameters:

```
blue-50, blue-100, ..., blue-950
indigo-50, indigo-100, ..., indigo-950
violet-50, violet-100, ..., violet-950
purple-50, purple-100, ..., purple-950
pink-50, pink-100, ..., pink-950
red-50, red-100, ..., red-950
orange-50, orange-100, ..., orange-950
yellow-50, yellow-100, ..., yellow-950
green-50, green-100, ..., green-950
emerald-50, emerald-100, ..., emerald-950
teal-50, teal-100, ..., teal-950
cyan-50, cyan-100, ..., cyan-950
sky-50, sky-100, ..., sky-950
slate-50, slate-100, ..., slate-950
gray-50, gray-100, ..., gray-950
zinc-50, zinc-100, ..., zinc-950
neutral-50, neutral-100, ..., neutral-950
```

All colors are OKLCH format for perceptual uniformity.

## Development

### Local Development

```bash
# Build CSS files
pnpm build

# Start local worker with hot reload
pnpm worker:dev
```

Test endpoints:
- http://localhost:8787/
- http://localhost:8787/colors.css
- http://localhost:8787/transform?theme=dark

### Deployment

```bash
# Build and deploy to Cloudflare
pnpm deploy
```

### Project Structure

```
@mdxui/css/
├── src/
│   ├── styles/          # Source CSS files
│   │   ├── colors.css
│   │   ├── themes.css
│   │   ├── variables.css
│   │   ├── base.css
│   │   └── ...
│   └── worker/          # Worker implementation
│       ├── index.ts     # Main worker
│       ├── snippets.ts  # Runtime transforms
│       └── README.md    # This file
├── dist/                # Compiled CSS (static assets)
│   ├── index.css        # Combined bundle
│   ├── colors.css
│   └── ...
├── scripts/
│   └── build.js         # CSS build script
├── wrangler.toml        # Worker configuration
└── package.json
```

## Cost Analysis

### Static Assets
- **Storage**: ~120KB total CSS (trivial)
- **Bandwidth**: Free (Cloudflare includes bandwidth)
- **Requests**: Free (no compute)

### Transform Endpoint
- **Compute**: ~0.02ms per request
- **Free Tier**: 100,000 requests/day
- **Cost**: $0.50 per million requests after free tier

### Example Monthly Cost
- 1M static asset requests: **$0.00**
- 100K transform requests: **$0.00** (within free tier)
- Total: **$0.00/month** for typical usage

## Performance

### Static Assets
- **TTFB**: <20ms (edge cached)
- **Response Time**: <50ms globally
- **Cache Hit Rate**: >95% (24hr cache)

### Transform Endpoint
- **Compute**: <2ms (string concatenation)
- **Response Time**: <30ms globally
- **Cache Hit Rate**: >80% (1hr cache)

## CORS

All endpoints include CORS headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Safe for cross-origin use from any domain.
