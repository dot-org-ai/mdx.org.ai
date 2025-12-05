# MDXUI Implementation Plan

## Workstreams

### Stream 1: Core Types & Layouts
Update @mdxui/html with unified Layout types and missing components.

**Tasks**:
1. Define Layout type hierarchy (SiteLayout, AppLayout, PageLayout)
2. Add missing section types (Team, Blog, Contact, Gallery, Bento)
3. Add missing page types (Auth, Error)
4. Update existing section props with missing fields
5. Create unified HeaderSection and FooterSection

### Stream 2: Template Translation
Import and translate templates from each library.

**Tasks**:
1. Tremor templates (8): Dashboard, Solar, Insights, etc.
2. Shadcnblocks templates (10+): Scalar, Sonic, Lumen, etc.
3. Tailark templates (4 styles): Quartz, Dusk, Mist
4. Mantine templates: Admin, etc.

### Stream 3: CSS Worker & Static Assets
Implement @mdxui/css worker with static asset deployment.

**Tasks**:
1. Set up Workers Static Assets structure
2. Pre-compile theme bundles (light, dark, dim, etc.)
3. Pre-compile Tailwind color palette
4. Implement snippet system for runtime transforms
5. Create wrangler.toml for deployment

### Stream 4: JS Worker & Static Assets
Implement @mdxui/js worker with hydration system.

**Tasks**:
1. Set up Workers Static Assets for JS bundles
2. Pre-compile component bundles (tree-shaken)
3. Implement hydration snippet system
4. Create theme context injection
5. Set up cascade with CSS worker

### Stream 5: Gap Filling - Sections
Add missing section components.

**Tasks**:
1. Team section
2. Blog section
3. Contact section
4. Gallery section
5. Bento grid
6. Comparison section
7. Integrations section

### Stream 6: Gap Filling - Pages & Views
Add missing page and view types.

**Tasks**:
1. Auth pages (Login, Signup, ForgotPassword, etc.)
2. Error pages (404, 500, 403, Maintenance)
3. Analytics view
4. Billing view
5. Activity view

### Stream 7: Gap Filling - Dashboard
Add missing dashboard components.

**Tasks**:
1. KPI Card enhancements (icon, sparkline, comparison)
2. Activity Feed
3. Notifications panel
4. Date Range Picker
5. Filter controls

---

## Parallel Agent Assignments

### Agent 1: Core Types & Layouts (@mdxui/html)
- Update Layout types
- Add missing section types
- Normalize all props

### Agent 2: Template Translation - Tremor
- Import all Tremor templates
- Map to unified Layout types
- Generate translated components

### Agent 3: Template Translation - Shadcn/Tailark
- Import shadcnblocks templates
- Import Tailark templates
- Map to unified Layout types

### Agent 4: CSS Worker Implementation
- Workers static assets setup
- Theme bundles
- Snippet system

### Agent 5: JS Worker Implementation
- Component bundles
- Hydration system
- Theme context

### Agent 6: Section Components
- Team, Blog, Contact, Gallery
- Bento, Comparison, Integrations

### Agent 7: Page & View Components
- Auth pages
- Error pages
- Dashboard views

---

## File Structure

```
packages/@mdxui/
├── html/
│   └── src/
│       ├── layouts/           # NEW: Layout definitions
│       │   ├── site.tsx
│       │   ├── app.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── sections.tsx   # UPDATE: Add missing sections
│       │   ├── views.tsx      # UPDATE: Add missing views
│       │   └── pages.tsx      # NEW: Auth, Error pages
│       └── types/
│           └── index.ts       # UPDATE: Unified types
│
├── css/
│   ├── src/
│   │   ├── worker/
│   │   │   ├── index.ts       # Main worker
│   │   │   ├── snippets.ts    # Runtime transforms
│   │   │   └── static.ts      # Static asset handling
│   │   └── styles/
│   │       ├── base.css
│   │       ├── themes/
│   │       └── colors.css
│   ├── dist/                  # Pre-compiled bundles
│   │   ├── base.css
│   │   ├── themes/
│   │   └── components/
│   └── wrangler.toml
│
├── js/
│   ├── src/
│   │   ├── worker/
│   │   │   ├── index.ts       # Main worker
│   │   │   ├── hydrate.ts     # Hydration snippet
│   │   │   └── static.ts      # Static asset handling
│   │   ├── runtime/
│   │   └── components/
│   ├── dist/                  # Pre-compiled bundles
│   │   ├── runtime.js
│   │   └── components/
│   └── wrangler.toml
│
├── tremor/
│   └── src/
│       └── templates/
│           ├── dashboard.tsx  # Translated template
│           ├── solar.tsx
│           └── insights.tsx
│
├── shadcnblocks/
│   └── src/
│       └── templates/
│           ├── scalar.tsx
│           ├── sonic.tsx
│           └── lumen.tsx
│
└── tailark/
    └── src/
        └── templates/
            ├── quartz.tsx
            ├── dusk.tsx
            └── mist.tsx
```

---

## Worker Endpoints

### CSS Worker (`css.mdxui.org`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `/` | Static | Base CSS bundle |
| `/themes/:name` | Static | Theme bundle |
| `/colors` | Static | Full color palette |
| `/transform` | Snippet | Runtime CSS transform |

### JS Worker (`js.mdxui.org`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `/runtime` | Static | Core runtime |
| `/components/:name` | Static | Component bundle |
| `/hydrate` | Snippet | Hydration script |
| `/theme` | Snippet | Theme context injection |

---

## Snippet Examples

### CSS Transform Snippet
```
GET /transform?primary=indigo-500&radius=lg&theme=dark

Response:
:root {
  --primary: oklch(0.585 0.233 264);
  --radius: 0.75rem;
}
[data-theme="dark"] { ... }
```

### JS Hydrate Snippet
```
GET /hydrate?components=ThemeToggle,Counter

Response:
import { hydrate } from '/runtime'
import { ThemeToggle } from '/components/ThemeToggle'
import { Counter } from '/components/Counter'
// ... hydration code
```

---

## Static Asset Deployment

Using Cloudflare Workers Static Assets:

```toml
# wrangler.toml
name = "mdxui-css"
main = "src/worker/index.ts"

[assets]
directory = "./dist"
binding = "ASSETS"
```

Pre-compiled assets served at zero compute cost, with snippets for minimal runtime customization.
