# MDXUI Architecture

## Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Layout** | Abstract structural pattern defining how regions (header, main, aside, footer) are arranged. Framework-agnostic. | `SiteLayout`, `DashboardLayout`, `DocsLayout` |
| **Template** | Concrete implementation of a Layout from a specific library, translated to unified MDXUI props. | `TremorDashboard`, `TailarkMarketing` |
| **Block** | Reusable section component that fits within a Layout. | `Hero`, `Pricing`, `KPICard` |
| **Snippet** | Runtime code fragment for on-demand transformation/customization. | CSS variable override, theme switch |

## Package Hierarchy

```
@mdxui/
├── html/           # Abstract Layouts + semantic HTML blocks
├── css/            # CSS framework + Worker for static assets + snippets
├── js/             # Client-side runtime + Worker for JS bundles
├── shadcn/         # shadcn/ui primitives
├── shadcnblocks/   # shadcnblocks templates → translated to Layouts
├── tremor/         # Tremor templates → translated to Layouts
├── mantine/        # Mantine templates → translated to Layouts
├── tailark/        # Tailark templates → translated to Layouts
└── magicui/        # Animated effects + backgrounds
```

## Layout Types (Abstract)

### Site Layouts (Marketing/Content)
```typescript
type SiteLayout = {
  variant: 'landing' | 'marketing' | 'blog' | 'docs' | 'portfolio'
  header: HeaderProps
  hero?: HeroProps
  sections: SectionProps[]
  footer: FooterProps
}
```

### App Layouts (Dashboard/Application)
```typescript
type AppLayout = {
  variant: 'dashboard' | 'admin' | 'analytics' | 'settings'
  sidebar?: SidebarProps
  header: AppHeaderProps
  main: ViewProps
  aside?: AsideProps
}
```

### Page Layouts (Single Purpose)
```typescript
type PageLayout = {
  variant: 'auth' | 'error' | 'maintenance' | 'coming-soon'
  content: PageContentProps
}
```

## Workers Architecture

### @mdxui/css Worker

```
/css                    → Base CSS bundle (static asset)
/css/themes/{name}      → Theme-specific CSS (static asset)
/css/transform          → Runtime transformation (snippet)
  ?primary=blue-500     → Override primary color
  ?radius=lg            → Override border radius
  ?theme=dark           → Apply theme preset
```

**Static Assets**: Pre-compiled CSS bundles deployed via Workers Static Assets
**Snippets**: Lightweight transforms for runtime customization (cheaper than full compute)

### @mdxui/js Worker

```
/js                     → Base runtime bundle (static asset)
/js/components/{name}   → Individual component bundles (static assets)
/js/hydrate             → Hydration script (snippet)
  ?components=Hero,CTA  → Only hydrate specified components
  ?theme=dark           → Theme context injection
```

**Static Assets**: Pre-compiled JS bundles (tree-shaken per component)
**Snippets**: Minimal runtime code for hydration/theming

### Cascade Architecture

```
                    ┌─────────────────┐
                    │  @mdxui/css     │
                    │  (CSS Worker)   │
                    └────────┬────────┘
                             │ imports
                             ▼
┌─────────────────┐    ┌─────────────────┐
│  @mdxui/js      │◄───│  Theme Context  │
│  (JS Worker)    │    │  (shared state) │
└────────┬────────┘    └─────────────────┘
         │ hydrates
         ▼
┌─────────────────────────────────────────┐
│  Static HTML (SSR output)               │
│  - Pre-rendered with @mdxui/html        │
│  - Styles from /css                     │
│  - Hydration from /js/hydrate           │
└─────────────────────────────────────────┘
```

## Template Translation Strategy

### Source Templates to Import

**Tremor (8 templates)**:
1. Dashboard OSS - Analytics dashboard
2. Solar - One-page website
3. Insights - Data visualization
4. ... (more from blocks.tremor.so)

**Shadcnblocks (10+ templates)**:
1. Scalar - SaaS landing
2. Sonic - Product launch
3. Relative - Agency/portfolio
4. Lumen - Modern minimal
5. Admin Kit - Dashboard starter

**Tailark (4 styles)**:
1. Quartz - Light modern
2. Dusk - Dark elegant
3. Mist - Soft minimal
4. Default - Classic

### Translation Process

1. **Import** original template
2. **Map** component names to @mdxui equivalents
3. **Normalize** props to unified interface
4. **Extract** theme variables to CSS
5. **Generate** Layout definition
6. **Create** snippet for customization

Example translation:
```typescript
// Original Tremor
<Card><Metric>$12,345</Metric><Text>Revenue</Text></Card>

// Translated to @mdxui
<KPICard value="$12,345" label="Revenue" />

// Which renders semantic HTML
<article data-stat>
  <dt>Revenue</dt>
  <dd>$12,345</dd>
</article>
```

## Snippet System

### CSS Snippets
```typescript
// Minimal runtime for CSS customization
const cssSnippet = (params: URLSearchParams) => {
  const overrides: string[] = []

  if (params.has('primary')) {
    overrides.push(`--primary: ${resolveColor(params.get('primary'))}`)
  }
  if (params.has('radius')) {
    overrides.push(`--radius: ${resolveRadius(params.get('radius'))}`)
  }

  return `:root { ${overrides.join(';')} }`
}
```

### JS Snippets
```typescript
// Minimal runtime for hydration
const hydrateSnippet = (params: URLSearchParams) => {
  const components = params.get('components')?.split(',') || []

  return `
    import { hydrate } from '@mdxui/js/runtime'
    ${components.map(c => `import { ${c} } from '@mdxui/js/components/${c}'`).join('\n')}

    document.querySelectorAll('[data-hydrate]').forEach(el => {
      const component = el.dataset.hydrate
      hydrate(components[component], el)
    })
  `
}
```

## Build Pipeline

```
Source Templates (Tremor, Shadcn, etc.)
         │
         ▼
    Translation
    (component mapping, prop normalization)
         │
         ▼
    Layout Definition
    (abstract structure)
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
    CSS Bundle         JS Bundle          HTML Template
    (static asset)    (static asset)     (SSR function)
         │                  │                  │
         ▼                  ▼                  ▼
    Workers Static Assets (pre-deployed)
         │
         ▼
    Snippets (runtime transforms)
```

## Cost Optimization

| Operation | Cost | Use Case |
|-----------|------|----------|
| Static Asset | $0 (bundled) | Pre-compiled themes, components |
| Snippet | Minimal | Simple transforms, hydration |
| Full Worker | Higher | Complex dynamic generation |

**Strategy**:
- Pre-compile 90% as static assets
- Use snippets for runtime customization
- Reserve full compute for truly dynamic cases
