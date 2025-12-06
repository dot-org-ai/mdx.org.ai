# @mdxld/html

Bi-directional conversion between Objects and semantic HTML. Render structured data to accessible HTML, extract it back.

## Installation

```bash
pnpm add @mdxld/html
```

## Overview

`@mdxld/html` provides semantic HTML conversion:

```typescript
import { toHTML, fromHTML } from '@mdxld/html'

// Object → Semantic HTML
const html = toHTML(customer)

// HTML → Object
const customer = fromHTML<Customer>(html)
```

This is the **semantic layer** - structural HTML without styling. For styled output, see `@mdxui/html` or `@mdxui/shadcn`.

## Quick Start

```typescript
import { toHTML, fromHTML } from '@mdxld/html'

const customer = {
  name: 'Acme Corp',
  description: 'Leading provider of widgets.',
  properties: [
    { name: 'id', type: 'string', required: true },
    { name: 'email', type: 'string', required: true }
  ]
}

const html = toHTML(customer)
```

**Output:**

```html
<article itemscope itemtype="https://schema.org/Organization">
  <h1 itemprop="name">Acme Corp</h1>
  <p itemprop="description">Leading provider of widgets.</p>

  <section>
    <h2>Properties</h2>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Type</th>
          <th>Required</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>id</td>
          <td><code>string</code></td>
          <td>✓</td>
        </tr>
        <tr>
          <td>email</td>
          <td><code>string</code></td>
          <td>✓</td>
        </tr>
      </tbody>
    </table>
  </section>
</article>
```

## API

### toHTML(object, options?)

Convert an object to semantic HTML.

```typescript
function toHTML<T>(
  object: T,
  options?: ToHTMLOptions
): string
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `microdata` | `boolean` | `true` | Include Schema.org microdata |
| `semantic` | `boolean` | `true` | Use semantic HTML5 elements |
| `ids` | `boolean` | `false` | Add id attributes |
| `classes` | `boolean` | `false` | Add class attributes |
| `parts` | `boolean` | `true` | Add part attributes for styling |

**Example with options:**

```typescript
const html = toHTML(customer, {
  microdata: true,
  parts: true,
  classes: true
})
```

**Output:**

```html
<article
  part="entity"
  class="entity entity--customer"
  itemscope
  itemtype="https://schema.org/Organization"
>
  <h1 part="title" class="entity__title" itemprop="name">
    Acme Corp
  </h1>
  ...
</article>
```

### fromHTML(html, options?)

Extract an object from HTML.

```typescript
function fromHTML<T>(
  html: string,
  options?: FromHTMLOptions
): T
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `shape` | `Schema` | inferred | Expected shape |
| `strict` | `boolean` | `false` | Throw on parse errors |
| `microdata` | `boolean` | `true` | Parse microdata attributes |

**Example:**

```typescript
const html = `
<article itemscope itemtype="https://schema.org/Person">
  <h1 itemprop="name">John Doe</h1>
  <p itemprop="email">john@example.com</p>
</article>
`

const person = fromHTML<Person>(html)
// { name: 'John Doe', email: 'john@example.com' }
```

### renderToString(element)

Render JSX to HTML string (SSR).

```typescript
import { renderToString } from '@mdxld/html'
import { Entity, Property } from '@mdxld/jsx/primitives'

const html = renderToString(
  <Entity name="Customer">
    <Property name="email">hello@acme.com</Property>
  </Entity>
)
```

## Semantic HTML Conventions

### Element Mapping

| Object Pattern | HTML Element |
|----------------|--------------|
| Document root | `<article>` |
| Named entity | `<article>` with `<h1>` |
| Section | `<section>` with `<h2>` |
| Property (short) | `<p>` or `<span>` |
| Property (long) | `<div>` |
| `string[]` | `<ul>` / `<ol>` |
| `object[]` (flat) | `<table>` |
| `object[]` (complex) | `<section>` per item |
| Code | `<pre><code>` |
| Link | `<a href>` |

### Heading Hierarchy

```typescript
{
  name: "Doc",           // <h1>
  section1: {            // <section><h2>
    title: "...",
    subsection: {        // <section><h3>
      ...
    }
  }
}
```

### Microdata (Schema.org)

Automatically adds microdata attributes:

```html
<article itemscope itemtype="https://schema.org/Person">
  <h1 itemprop="name">John Doe</h1>
  <p itemprop="email">john@example.com</p>
  <p itemprop="telephone">555-1234</p>
</article>
```

### CSS Parts for Styling

Every element gets a `part` attribute for external styling:

```html
<article part="entity">
  <h1 part="title">...</h1>
  <section part="properties">
    <table part="table">...</table>
  </section>
</article>
```

Style with `::part()`:

```css
article::part(title) {
  font-size: 2rem;
  color: var(--color-heading);
}

article::part(table) {
  border-collapse: collapse;
}
```

## Accessibility

Generated HTML follows accessibility best practices:

- Semantic elements (`article`, `section`, `nav`, `table`)
- Proper heading hierarchy
- Table headers with `scope` attributes
- ARIA labels where appropriate
- Descriptive link text

```html
<table>
  <thead>
    <tr>
      <th scope="col">Property</th>
      <th scope="col">Type</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">id</th>
      <td>string</td>
    </tr>
  </tbody>
</table>
```

## Integration with JSX

Use with `@mdxld/jsx/html` for JSX-based rendering:

```tsx
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@mdxld/jsx/html"
  }
}

// Component
import { Entity, Property } from '@mdxld/jsx/primitives'

function Customer({ name, email }) {
  return (
    <Entity name={name} type="Customer">
      <Property name="email">{email}</Property>
    </Entity>
  )
}

// Render
import { renderToString } from '@mdxld/html'
const html = renderToString(<Customer name="Acme" email="hi@acme.com" />)
```

## Relationship to mdx-js/mdx

`@mdxld/html` complements mdx-js/mdx:

- **mdx-js/mdx**: Compiles MDX to React/HTML via JSX
- **@mdxld/html**: Converts Objects to semantic HTML directly

You can use both together:

```typescript
// MDX content with embedded structured data
import { compileMDX } from '@mdx-js/mdx'
import { toHTML } from '@mdxld/html'

// Render frontmatter as structured HTML
const structuredHtml = toHTML(frontmatter)

// Render MDX content as React/HTML
const contentHtml = await compileMDX(content)
```

## Use Cases

### Server-Side Rendering

```typescript
import { toHTML } from '@mdxld/html'

app.get('/customer/:id', async (req, res) => {
  const customer = await db.get(req.params.id)
  const html = toHTML(customer)
  res.send(layout(html))
})
```

### Email HTML

```typescript
// Generate semantic HTML for emails
const emailHtml = toHTML(invoice, {
  microdata: false,  // Email clients don't need microdata
  semantic: true
})
```

### Static Site Generation

```typescript
// Generate HTML pages from data
for (const page of pages) {
  const html = toHTML(page)
  await fs.writeFile(`dist/${page.slug}.html`, html)
}
```

### Content Extraction

```typescript
// Extract structured data from HTML
const html = await fetch(url).then(r => r.text())
const data = fromHTML(html)
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/jsx/html`](../jsx) | JSX runtime for HTML output |
| [`@mdxld/jsx/dom`](../jsx) | JSX runtime for DOM |
| [`@mdxui/html`](../../@mdxui/html) | Styled HTML output |
| [`@mdxui/shadcn`](../../@mdxui/shadcn) | shadcn/ui styled output |
| [`@mdxld/markdown`](../markdown) | Object ↔ Markdown |
| [`@mdxld/json`](../json) | Object ↔ JSON |

## License

MIT
