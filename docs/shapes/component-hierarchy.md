---
title: "MDXUI Component Hierarchy"
description: "Props-driven component system where props define the shape"
---

# MDXUI Component Hierarchy

A component system where **entities become components**. Define data in MDX, use it as JSX.

## The Pattern

**Sites** are content-driven (marketing, docs). **Apps** are interaction-driven (dashboards, tools).

```tsx
// Site - sections stack vertically
<Site product={widget}>
  <Hero />
  <Pain />
  <Benefits />
  <Features />
  <Steps />
  <Pricing />
  <Quotes />
  <FAQ />
  <CTA />
</Site>

// App - entities become CRUD views
<App business={acme}>
  <Dashboard />
  <Customers list="cards" />
  <Orders />
  <Products list="grid" />
  <Users />
  <Settings />
</App>
```

---

## Site

### Site Props

Props define what kind of site:

```tsx
<Site product={widget} />      // Product marketing
<Site business={acme} />       // Company site
<Site agent={CodeReview} />    // AI agent site
<Site service={consulting} />  // Service site
<Site listings={tools} />      // Directory
<Site marketplace={sellers} /> // Marketplace
<Site portfolio={projects} />  // Portfolio
<Site waitlist={config} />     // Pre-launch
```

### Site Layouts

| Layout | Structure | Use Case |
|--------|-----------|----------|
| `marketing` | Header → Sections → Footer | Landing pages |
| `docs` | Header → Sidebar + Content + TOC → Footer | Documentation |
| `blog` | Header → Content + Sidebar → Footer | Articles |
| `minimal` | Content only | Embeds, focused |
| `centered` | Centered content | Auth, forms |

### Site Sections

| Section | Purpose |
|---------|---------|
| `<Hero />` | Headline, subheadline, CTA |
| `<Pain />` | Agitate the problem |
| `<Benefits />` | Outcome-focused value |
| `<Features />` | Capability showcase |
| `<Steps />` | How it works (1-2-3) |
| `<Pricing />` | Plans and pricing |
| `<Quotes />` | Testimonials, social proof |
| `<FAQ />` | Objection handling |
| `<Stats />` | Numbers, metrics |
| `<Team />` | People behind it |
| `<Logos />` | Trust signals |
| `<Comparison />` | vs Competitors |
| `<CTA />` | Final call to action |
| `<Contact />` | Form, calendly |
| `<Newsletter />` | Email capture |
| `<Gallery />` | Screenshots, videos |

### Section Props

```tsx
<Hero />                          // Uses context for copy
<Hero headline="Ship Faster" />   // Override
<Features layout="bento" />       // Bento grid
<Features layout="list" />        // List
<Quotes layout="carousel" />      // Carousel
<Quotes layout="grid" columns={3} />
<Steps />                         // From context
<Pricing billing="annual" />      // Default annual
```

### Site Example

```tsx
<Site
  product={widget}
  context={{ storyBrand, leanCanvas, brandVoice }}
>
  <Hero />
  <Logos />
  <Pain />
  <Benefits />
  <Features layout="bento" />
  <Steps />
  <Quotes layout="carousel" />
  <Pricing />
  <FAQ />
  <CTA />

  {/* Subsites */}
  <Site docs={api} path="/docs" />
  <Site blog={posts} path="/blog" />
</Site>
```

---

## App

### App Props

Props define what kind of app:

```tsx
<App product={widget} />           // Dashboard
<App business={acme} />            // Admin
<App agent={StrategicPlanning} />  // Chat interface
<App agent={CustomerSupport} />    // Support chat
```

### App Layouts

| Layout | Structure | Use Case |
|--------|-----------|----------|
| `dashboard` | TopNav → Grid | Metrics, analytics |
| `sidebar` | Sidebar → Content | Admin, settings |
| `workspace` | ActivityBar → Sidebar → Editor → Aside | IDE |
| `split` | List → Detail | Chat, email, CRM |
| `minimal` | Header → Content | Focused apps |

### Entity Components

**Entities become components.** Define in MDX, use as JSX:

```yaml
---
$type: Entity
name: Customer
plural: Customers
fields:
  name: string
  email: string
  tier: free | pro | enterprise
---
```

Then use directly:

```tsx
<App business={acme}>
  <Customers />                    // → /customers (table)
  <Customers list="cards" />       // → /customers (cards)
  <Customers list="kanban" />      // → /customers (kanban)
</App>
```

Each entity auto-generates CRUD routes:
- `/customers` → List view
- `/customers/:id` → Detail view
- `/customers/:id/edit` → Edit view
- `/customers/new` → Create view

### Entity Props

| Prop | Default | Options |
|------|---------|---------|
| `list` | `table` | `table`, `cards`, `grid`, `kanban`, `timeline`, `calendar` |
| `detail` | `full` | `full`, `split`, `modal` |
| `create` | `form` | `form`, `modal`, `wizard` |

### List Variants

| Variant | Best For |
|---------|----------|
| `table` | Data-heavy, sortable, filterable |
| `cards` | Rich previews (projects, profiles) |
| `grid` | Visual items (products, media) |
| `kanban` | Status-based workflows (tasks, deals) |
| `timeline` | Chronological (events, activity) |
| `calendar` | Date-based (scheduling, events) |

### Agent Apps

Agents are defined by role:

```tsx
<App agent={StrategicPlanning}>
  <Chat />
  <History />
  <Settings />
</App>

<App agent={CustomerSupport}>
  <Chat />
  <Tickets />
  <Knowledge />
</App>

<App agent={CodeReview}>
  <Chat />
  <Diff />
  <History />
</App>
```

### Agent Roles

| Role | Capabilities | Model |
|------|--------------|-------|
| `StrategicPlanning` | Analysis, Frameworks, Recommendations | Opus |
| `CodeReview` | Bug Detection, Security, Best Practices | Sonnet |
| `CustomerSupport` | FAQ, Tickets, Escalation | Haiku |
| `ContentWriter` | Blog, Docs, Copy, SEO | Sonnet |
| `Research` | Web Search, Analysis, Reports | Opus |
| `DevOps` | Deploy, Monitor, Scale, Debug | Sonnet |

### App Examples

**SaaS Admin:**
```tsx
<App business={acme} layout="sidebar">
  <Dashboard />
  <Customers list="cards" />
  <Orders />
  <Products list="grid" />
  <Users />
  <Settings />
</App>
```

**Project Management:**
```tsx
<App product={projectTool} layout="sidebar">
  <Dashboard />
  <Projects list="cards" />
  <Tasks list="kanban" />
  <Team list="grid" />
  <Calendar />
  <Settings />
</App>
```

**CRM:**
```tsx
<App product={crm} layout="sidebar">
  <Dashboard />
  <Contacts list="table" />
  <Companies list="cards" />
  <Deals list="kanban" />
  <Activities list="timeline" />
  <Reports />
</App>
```

---

## Steps

Works in both Site and App:

**Site Steps** (Marketing):
```tsx
<Steps>
  <Step title="Sign Up" description="Create your account" />
  <Step title="Connect" description="Link your repo" />
  <Step title="Deploy" description="Ship to production" />
</Steps>
```

**App Steps** (Workflows):
```tsx
<App>
  <Steps path="/onboarding">
    <Step title="Account" fields={['email', 'password']} />
    <Step title="Profile" fields={['name', 'avatar']} />
    <Step title="Team" fields={['company', 'role']} />
    <Step title="Done" component={<Welcome />} />
  </Steps>
</App>
```

---

## Context for AI Generation

The `context` prop provides strategic data for AI content generation:

```tsx
<Site
  product={widget}
  context={{
    storyBrand: {
      hero: { persona: 'Busy developer', desire: 'Ship faster' },
      problem: { external: 'Slow deploys', internal: 'Frustrated' },
      guide: { empathy: '...', authority: '...' },
      plan: ['Sign up', 'Connect', 'Deploy'],
      callToAction: { direct: 'Start Free', transitional: 'Watch Demo' },
    },
    brandVoice: { tone: 'confident', style: 'concise' },
    targetPersona: { role: 'Senior Engineer', painPoints: [...] },
    competitors: [{ name: 'Vercel', pricing: '$20/mo' }],
  }}
>
  <Hero />       {/* AI writes using StoryBrand */}
  <Features />   {/* AI uses brandVoice */}
  <FAQ />        {/* AI addresses objections */}
</Site>
```

In MDX frontmatter, anything not in schema becomes context:

```yaml
---
$type: Site
title: Widget Pro
product: widget

# Becomes context automatically
storyBrand:
  hero:
    persona: Busy developer
brandVoice:
  tone: confident
---
```

---

## Package Map

| Package | Purpose |
|---------|---------|
| `@mdxui/site` | Site container |
| `@mdxui/app` | App container |
| `@mdxui/html` | Site sections (Hero, Features, etc.) |
| `@mdxui/widgets` | App widgets (Chat, Editor, etc.) |
| `@mdxui/shadcn` | UI primitives |
| `primitives` | Entity types (Business, Product, Agent) |
