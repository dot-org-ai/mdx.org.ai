# @mdxui/css Worker - Quick Start

Get up and running with the @mdxui/css Worker in 5 minutes.

## Installation

```bash
cd packages/@mdxui/css

# Install dependencies
pnpm install

# Build CSS files
pnpm build
```

## Local Development

```bash
# Start local worker with hot reload
pnpm worker:dev
```

The worker will be available at http://localhost:8787

## Test Endpoints

Open these URLs in your browser:

1. **Full CSS Bundle**
   ```
   http://localhost:8787/
   ```

2. **Color Utilities**
   ```
   http://localhost:8787/colors.css
   ```

3. **Dark Theme Transform**
   ```
   http://localhost:8787/transform?theme=dark
   ```

4. **Custom Theme**
   ```
   http://localhost:8787/transform?theme=dark&primary=indigo-500&radius=lg
   ```

5. **Demo Page**
   - Copy `src/worker/example.html` to `dist/example.html`
   - Visit http://localhost:8787/example.html

## Deploy to Cloudflare

```bash
# Deploy to production
pnpm deploy
```

This will:
1. Build CSS files
2. Upload to Cloudflare Workers
3. Configure static assets
4. Return your worker URL

## Use in Your Project

After deployment, use the worker URL in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Static CSS (free, cached) -->
  <link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/">

  <!-- Custom theme (runtime) -->
  <link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/transform?theme=dark">
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Styled with @mdxui/css</p>
</body>
</html>
```

## Common Use Cases

### Static Only (Best Performance)

```html
<link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/">
```

### Dark Mode

```html
<link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/">
<link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/transform?theme=dark">
```

### Custom Brand Colors

```html
<link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/">
<link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/transform?primary=purple-500&secondary=pink-400">
```

### Theme Switching

```html
<link rel="stylesheet" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/">
<link rel="stylesheet" id="theme" href="https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/transform?theme=light">

<button onclick="setTheme('light')">Light</button>
<button onclick="setTheme('dark')">Dark</button>

<script>
  function setTheme(theme) {
    document.getElementById('theme').href =
      `https://mdxui-css.YOUR-SUBDOMAIN.workers.dev/transform?theme=${theme}`
  }
</script>
```

## Customization Options

### Themes
- `light` - Default light theme
- `dark` - Dark theme
- `dim` - Dimmed dark theme
- `midnight` - Deep blue dark theme

### Colors (Tailwind Tokens)
```
?primary=blue-500
?primary=indigo-600
?primary=purple-400
?secondary=slate-200
?accent=emerald-500
```

All Tailwind colors supported: slate, gray, zinc, neutral, red, orange, yellow, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose

Shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950

### Radius
```
?radius=none    (0)
?radius=sm      (0.25rem)
?radius=md      (0.5rem)
?radius=lg      (0.75rem)
?radius=xl      (1rem)
?radius=2xl     (1.5rem)
?radius=full    (9999px)
```

### Custom Variables
```
?background=slate-950
?foreground=slate-50
?border=slate-800
?card=slate-900
```

Any CSS variable (without `--` prefix) can be overridden.

## Running Tests

```bash
# Run tests once
pnpm test

# Watch mode
pnpm test:watch
```

## Troubleshooting

### Worker not starting?
```bash
# Check wrangler is installed
wrangler --version

# Reinstall dependencies
pnpm install

# Try building first
pnpm build
pnpm worker:dev
```

### CSS files not found?
```bash
# Rebuild CSS
pnpm build

# Check dist directory
ls -la dist/
```

### Deploy failing?
```bash
# Login to Cloudflare
wrangler login

# Check configuration
cat wrangler.toml

# Try dry run
wrangler deploy --dry-run
```

## Next Steps

1. **Read the docs**: See `src/worker/README.md` for full API reference
2. **Review implementation**: See `IMPLEMENTATION.md` for architecture details
3. **Try the demo**: Copy `src/worker/example.html` to `dist/` and visit it
4. **Customize**: Modify theme presets in `src/worker/snippets.ts`
5. **Deploy**: Run `pnpm deploy` to put it live

## Support

For issues, questions, or contributions:
- Check `src/worker/README.md` for detailed documentation
- Review `IMPLEMENTATION.md` for technical details
- Look at `src/worker/worker.test.ts` for usage examples

## Cost

- **Static assets**: $0 (unlimited)
- **Transform endpoint**: First 100K requests/day free
- **After free tier**: $0.50 per million requests

Typical usage: **$0/month**
