# @mdxui/js Deployment Guide

This guide covers deploying the @mdxui/js Worker to Cloudflare with static asset serving.

## Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI** - Included as dev dependency
3. **Node.js 18+** - For building bundles

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Build component bundles
pnpm build

# 3. Login to Cloudflare (first time only)
pnpm wrangler login

# 4. Deploy to production
pnpm worker:deploy
```

## Development

Run the worker locally with hot reload:

```bash
# Start local development server
pnpm worker:dev

# In another terminal, watch for source changes
pnpm dev
```

The worker will be available at `http://localhost:8787`:
- `http://localhost:8787/hydrate?components=Counter`
- `http://localhost:8787/theme?theme=dark`
- `http://localhost:8787/runtime`
- `http://localhost:8787/components/Counter.js`

## Build Process

The build creates two types of bundles:

### 1. NPM Package (for consumers)

```bash
pnpm build
```

Outputs:
- `dist/index.js` - Main entry
- `dist/runtime/index.js` - Runtime exports
- `dist/components/index.js` - Component exports
- `dist/hooks/index.js` - Hook exports
- Type definitions (`.d.ts`)

### 2. Browser Bundles (for Worker)

Same command, dual output:

```bash
pnpm build
```

Also outputs:
- `dist/runtime.js` - Hono JSX DOM runtime (2.8KB minified)
- `dist/components/Counter.js` - Individual component bundles
- `dist/components/ThemeToggle.js`
- `dist/components/CopyButton.js`
- `dist/components/Accordion.js`

All browser bundles:
- Include Hono JSX DOM (no external dependencies)
- Are tree-shaken and minified
- Target ES2020 for modern browsers

## Environments

The `wrangler.toml` defines three environments:

### Development

```bash
pnpm wrangler deploy --env development
```

- Name: `mdxui-js-dev`
- CSS Worker: `http://localhost:8788`
- For local testing

### Staging

```bash
pnpm wrangler deploy --env staging
```

- Name: `mdxui-js-staging`
- CSS Worker: `https://css-staging.mdxui.org`
- For pre-production testing

### Production

```bash
pnpm wrangler deploy --env production
# Or simply:
pnpm worker:deploy
```

- Name: `mdxui-js`
- CSS Worker: `https://css.mdxui.org`
- For live traffic

## Custom Domain

To use a custom domain (e.g., `js.mdxui.org`):

1. Add your domain to Cloudflare
2. Uncomment the routes in `wrangler.toml`:

```toml
[[env.production.routes]]
pattern = "js.mdxui.org/*"
zone_name = "mdxui.org"
```

3. Deploy:

```bash
pnpm worker:deploy
```

The worker will now be available at `https://js.mdxui.org`.

## Environment Variables

Set environment variables via:

### 1. wrangler.toml

```toml
[vars]
CSS_WORKER_URL = "https://css.mdxui.org"
```

### 2. Cloudflare Dashboard

Workers & Pages → [Your Worker] → Settings → Variables

### 3. Command Line

```bash
wrangler deploy --env production --var CSS_WORKER_URL:https://css.mdxui.org
```

## Secrets

For sensitive data (API keys, etc.), use secrets instead of vars:

```bash
# Set a secret
echo "secret-value" | wrangler secret put SECRET_NAME

# Access in worker
export default {
  async fetch(request, env) {
    const secret = env.SECRET_NAME
  }
}
```

## Static Assets

The worker serves files from `./dist` via Cloudflare Assets binding:

```toml
[assets]
directory = "./dist"
binding = "ASSETS"
```

Files in `dist/` are automatically deployed and served with:
- Aggressive edge caching
- Automatic compression (brotli/gzip)
- Global CDN distribution

## Monitoring

### Tail Logs

View real-time logs:

```bash
pnpm worker:tail
```

### Cloudflare Dashboard

1. Go to Workers & Pages
2. Select your worker
3. View:
   - Requests/second
   - Errors
   - CPU time
   - Data transfer

### Observability

The worker has observability enabled in `wrangler.toml`:

```toml
[observability]
enabled = true
```

This provides detailed metrics and logs in the Cloudflare dashboard.

## Performance

### Caching Strategy

The worker uses aggressive caching:

| Path | Cache-Control | Notes |
|------|---------------|-------|
| `/dist/*` | `max-age=31536000, immutable` | 1 year, never changes |
| `/hydrate` | `max-age=3600, s-maxage=86400` | 1 hour browser, 24 hours edge |
| `/theme` | `max-age=3600, s-maxage=86400` | 1 hour browser, 24 hours edge |
| `/runtime` | `max-age=3600, s-maxage=86400, immutable` | 1 hour browser, 24 hours edge |
| `/components/*` | `max-age=3600, s-maxage=86400, immutable` | 1 hour browser, 24 hours edge |

### Bundle Sizes

After minification + gzip:
- Runtime: ~2.8 KB
- Counter: ~1 KB
- ThemeToggle: ~1 KB
- CopyButton: ~1 KB
- Accordion: ~1 KB

### Limits

From `wrangler.toml`:

```toml
[limits]
cpu_ms = 50  # Max 50ms CPU time per request
```

This is more than enough for serving static assets and generating small scripts.

## Troubleshooting

### Build Errors

If you get build errors:

```bash
# Clean and rebuild
rm -rf dist/ node_modules/ .wrangler/
pnpm install
pnpm build
```

### Deploy Errors

If deployment fails:

```bash
# Check wrangler status
pnpm wrangler whoami

# Re-login if needed
pnpm wrangler login

# Try deploying with verbose logs
pnpm wrangler deploy --env production --verbose
```

### 404 Errors

If you get 404s for assets:

1. Check `dist/` directory has files:
   ```bash
   ls -R dist/
   ```

2. Rebuild if needed:
   ```bash
   pnpm build
   ```

3. Verify wrangler.toml assets config:
   ```toml
   [assets]
   directory = "./dist"  # Must match build output
   ```

### TypeScript Errors

If you get TypeScript errors:

```bash
# Check types are installed
pnpm add -D @cloudflare/workers-types

# Run type check
pnpm typecheck
```

## CI/CD

### GitHub Actions

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - 'packages/@mdxui/js/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build bundles
        run: pnpm --filter @mdxui/js build

      - name: Deploy to Cloudflare
        run: pnpm --filter @mdxui/js worker:deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Required Secrets

Add to GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN` - API token with Workers Scripts:Edit permission

Create token at: https://dash.cloudflare.com/profile/api-tokens

## Rollback

If you need to rollback a deployment:

```bash
# View deployment history
pnpm wrangler deployments list

# Rollback to previous version
pnpm wrangler rollback [deployment-id]
```

## Testing

### Local Testing

```bash
# Start worker locally
pnpm worker:dev

# In another terminal, test endpoints
curl http://localhost:8787/hydrate?components=Counter
curl http://localhost:8787/theme?theme=dark
curl http://localhost:8787/runtime
curl http://localhost:8787/components/Counter.js
```

### Production Testing

After deployment, test the production endpoints:

```bash
# Get your worker URL
pnpm wrangler deployments list

# Test endpoints
curl https://mdxui-js.your-subdomain.workers.dev/hydrate?components=Counter
curl https://mdxui-js.your-subdomain.workers.dev/theme?theme=dark
```

### Browser Testing

Open `example.html` in a browser and update script URLs to your deployed worker:

```html
<script src="https://your-worker-url/theme?theme=auto"></script>
<script src="https://your-worker-url/hydrate?components=Counter,ThemeToggle"></script>
```

## Best Practices

1. **Always build before deploying**
   ```bash
   pnpm build && pnpm worker:deploy
   ```

2. **Test in staging first**
   ```bash
   pnpm wrangler deploy --env staging
   # Test thoroughly
   pnpm wrangler deploy --env production
   ```

3. **Monitor after deployment**
   ```bash
   pnpm worker:tail
   # Watch for errors
   ```

4. **Use semantic versioning**
   - Update `package.json` version before major releases
   - Tag releases in git: `git tag -a v1.0.0 -m "Release v1.0.0"`

5. **Keep bundles small**
   - Run `pnpm build` and check bundle sizes
   - Aim for <3KB per component (gzipped)

6. **Cache invalidation**
   - Use content hashes for long-term caching
   - Or update cache-control headers for new releases

## Support

- **Issues**: [GitHub Issues](https://github.com/mdx-org-ai/mdx.org.ai/issues)
- **Docs**: [README.md](./README.md)
- **Cloudflare Docs**: [workers.cloudflare.com](https://workers.cloudflare.com)
