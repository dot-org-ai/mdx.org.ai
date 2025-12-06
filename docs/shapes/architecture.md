---
title: "@mdxld/jsx Architecture"
description: "Universal JSX runtime with pluggable output renderers"
---

# @mdxld/jsx Architecture

Universal JSX runtime with pluggable output renderers.

## Core Idea

Write components once in JSX. Render to any format.

```tsx
// Define component
function Customer({ name, email, tier }) {
  return (
    <Entity name={name} type="Customer">
      <Property name="email">{email}</Property>
      <Property name="tier" default="free">{tier}</Property>
    </Entity>
  )
}

// Render to multiple formats
renderToMarkdown(<Customer {...data} />)  // → Markdown string
renderToJSON(<Customer {...data} />)      // → JSON object
renderToJSONLD(<Customer {...data} />)    // → JSON-LD
renderToHTML(<Customer {...data} />)      // → HTML string
```

## Package Structure

### JSX Runtime

```
@mdxld/jsx/
├── core          # Base JSX runtime, createElement, Fragment
├── html          # → HTML strings (SSR) - wraps hono/jsx
├── dom           # → DOM nodes (client) - wraps hono/jsx/dom
├── react         # → React elements - wraps react/jsx-runtime
├── preact        # → Preact elements - wraps preact
├── markdown      # → Markdown strings
├── json          # → JSON objects
├── jsonld        # → JSON-LD
├── yaml          # → YAML strings
├── typescript    # → TypeScript types
└── primitives    # Semantic primitives (Entity, Property, Action, etc.)
```

### Standalone Format Packages

Bi-directional conversion between objects and various formats:

```
@mdxld/
├── markdown      # toMarkdown() / fromMarkdown()
├── html          # toHTML() / fromHTML() + microdata
├── json          # toJSON() / toJSONLD() / toJSONSchema() / toOpenAPI() / toMCP() / toGraphQL()
├── yaml          # toYAML() / fromYAML() + multi-doc + streaming
├── typescript    # toTypeScript() / toZod() / toJSON5() / toJSDoc()
├── diff          # diffLines() / createPatch() / merge3way() / diffObjects()
└── extract       # Template-based extraction
```

See [Format Conversion](/docs/mdxld/formats) for the complete API reference.

### Runtime Mapping

| @mdxld/jsx/* | Wraps | Output Type |
|--------------|-------|-------------|
| `/html` | `hono/jsx` | `string` (HTML) |
| `/dom` | `hono/jsx/dom` | `Element` (DOM) |
| `/react` | `react/jsx-runtime` | `ReactElement` |
| `/preact` | `preact` | `VNode` |
| `/markdown` | (native) | `string` (Markdown) |
| `/json` | (native) | `object` (JSON) |
| `/jsonld` | (native) | `object` (JSON-LD) |
| `/yaml` | (native) | `string` (YAML) |
| `/typescript` | (native) | `string` (TypeScript) |

## Semantic Primitives

Core building blocks that know how to render to each format:

```tsx
// @mdxld/jsx/primitives

// Structural
<Document>       // Root container
<Entity>         // Named thing with properties
<Section>        // Grouped content
<Property>       // Key-value pair
<List>           // Array of items
<Table>          // Tabular data

// Data Types
<Text>           // Plain text
<Code>           // Code block with language
<Link>           // URL reference
<Date>           // ISO date
<Number>         // Numeric value
<Boolean>        // True/false

// Actions/API
<Action>         // Function/method definition
<Argument>       // Parameter
<Returns>        // Return type
<Event>          // Event definition

// Metadata
<Type>           // Type reference
<Extends>        // Inheritance
<Implements>     // Interface implementation
```

## Render Examples

### Entity Primitive

```tsx
<Entity name="Customer" plural="Customers" extends="Entity">
  <Property name="id" type="string" required>
    Unique identifier
  </Property>
  <Property name="email" type="string" required>
    Primary email address
  </Property>
</Entity>
```

#### → Markdown

```markdown
# Customer (Customers)

**Extends:** Entity

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | ✓ | Unique identifier |
| email | string | ✓ | Primary email address |
```

#### → JSON

```json
{
  "name": "Customer",
  "plural": "Customers",
  "extends": "Entity",
  "properties": [
    { "name": "id", "type": "string", "required": true, "description": "Unique identifier" },
    { "name": "email", "type": "string", "required": true, "description": "Primary email address" }
  ]
}
```

#### → JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "Class",
  "@id": "Customer",
  "name": "Customer",
  "subClassOf": { "@id": "Entity" },
  "property": [
    { "@type": "Property", "name": "id", "rangeIncludes": "string" },
    { "@type": "Property", "name": "email", "rangeIncludes": "string" }
  ]
}
```

#### → JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Customer",
  "type": "object",
  "required": ["id", "email"],
  "properties": {
    "id": { "type": "string", "description": "Unique identifier" },
    "email": { "type": "string", "description": "Primary email address" }
  }
}
```

---

## Two Levels of API

### 1. Component Methods (High-Level)

Components created with `defineShape` get render/extract methods:

```tsx
const Customer = defineShape({
  name: 'Customer',
  component: CustomerComponent,
  schema: CustomerSchema
})

// Render
Customer.toMarkdown(data)
Customer.toJSON(data)
Customer.toJSONLD(data)
Customer.toOpenAPI()  // schema only

// Extract
Customer.fromMarkdown(markdown)
Customer.fromJSON(json)
Customer.fromJSONLD(jsonld)
```

### 2. Pure Functions (Low-Level)

Direct access to renderers:

```tsx
import { renderToMarkdown } from '@mdxld/jsx/markdown'
import { renderToJSON } from '@mdxld/jsx/json'
import { extractFromMarkdown } from '@mdxld/jsx/markdown'

// Any JSX tree
const md = renderToMarkdown(<MyComponent {...props} />)
const json = renderToJSON(<MyComponent {...props} />)

// Extract needs component for structure
const data = extractFromMarkdown(markdown, MyComponent)
```

---

## Bi-directional: Extraction

The JSX component structure serves as the extraction schema:

```tsx
// Component structure defines the shape
function Recipe({ name, prepTime, ingredients, instructions }) {
  return (
    <Document>
      <Title>{name}</Title>
      <Property name="prepTime">{prepTime}</Property>
      <Section name="ingredients">
        <List items={ingredients} />
      </Section>
      <Section name="instructions">
        <List ordered items={instructions} />
      </Section>
    </Document>
  )
}

// Extract from markdown
const markdown = `
# Chocolate Chip Cookies
**Prep Time:** 15 minutes

## Ingredients
- flour
- sugar
- chocolate chips

## Instructions
1. Mix dry ingredients
2. Add wet ingredients
3. Bake at 375°F
`

const data = extractFromMarkdown(markdown, Recipe)
// {
//   name: "Chocolate Chip Cookies",
//   prepTime: "15 minutes",
//   ingredients: ["flour", "sugar", "chocolate chips"],
//   instructions: ["Mix dry ingredients", "Add wet ingredients", "Bake at 375°F"]
// }
```

---

## Dependency Graph

```
@mdxld/jsx (universal JSX runtime)
    ├── /core (base runtime)
    ├── /primitives (semantic elements)
    ├── /markdown (render to/from markdown)
    ├── /json (render to/from json)
    ├── /jsonld (render to/from json-ld)
    ├── /react (React DOM runtime)
    ├── /preact (Preact runtime)
    └── /hono (HTML string runtime)
         ↓
@mdxld/* (standalone format packages)
    ├── markdown (object ↔ markdown)
    ├── json (object → JSON, JSON-LD, JSON Schema, OpenAPI, MCP, GraphQL)
    ├── html (object ↔ semantic HTML + microdata)
    ├── yaml (object ↔ YAML, YAML-LD)
    ├── typescript (object → TypeScript, Zod, JSON5, JSDoc)
    ├── diff (text diff, patches, 3-way merge, object diff)
    └── extract (template-based extraction)
         ↓
mdxdb (uses @mdxld/* for storage/retrieval)
         ↓
mdxui (uses @mdxld/* + adds styling/theming)
```

---

## Convention vs Template

Two modes of operation:

### Convention Mode (Auto)

Uses primitives that know their own rendering rules:

```tsx
<Entity name="Customer">
  <Property name="email" type="string" />
</Entity>
```

The `Entity` and `Property` primitives have built-in render logic for each output format.

### Template Mode (Custom)

Write explicit markup for fine-grained control:

```tsx
function CustomerCard({ name, email }) {
  return (
    <Markdown>
      {`# ${name}

Welcome, ${name}! Your email is ${email}.

---

*Last updated: ${new Date().toISOString()}*`}
    </Markdown>
  )
}
```

Or mix both:

```tsx
function Customer({ name, email, properties }) {
  return (
    <Document>
      <Title>{name}</Title>
      <Paragraph>Custom intro text here.</Paragraph>

      {/* Use primitive for structured data */}
      <PropertyTable properties={properties} />
    </Document>
  )
}
```

---

## Configuration

Runtime can be configured per-project:

```ts
// jsxld.config.ts
export default {
  // Default output format
  defaultRenderer: 'markdown',

  // Markdown conventions
  markdown: {
    headingDepth: 2,          // Start sections at ##
    tableStyle: 'github',      // GFM tables
    listStyle: 'dash',         // - vs *
    codeBlockStyle: 'fenced',  // ``` vs indented
  },

  // JSON-LD conventions
  jsonld: {
    context: 'https://schema.org',
    baseUrl: 'https://example.com/',
  },

  // Component registry
  components: {
    Entity: '@mdxld/jsx/primitives/Entity',
    Property: '@mdxld/jsx/primitives/Property',
    // Custom overrides
    Customer: './components/Customer',
  }
}
```

---

## Examples by Domain

### API Documentation

```tsx
<Endpoint method="POST" path="/customers">
  <Summary>Create a new customer</Summary>

  <RequestBody required>
    <Property name="email" type="string" required />
    <Property name="name" type="string" required />
  </RequestBody>

  <Response status={201} schema="Customer">
    Customer created successfully
  </Response>
  <Response status={400} schema="Error">
    Validation error
  </Response>
</Endpoint>
```

→ Markdown docs, OpenAPI spec, MCP tool definition

### Schema Definition

```tsx
<Type name="Customer" extends="Entity">
  <Property name="id" type="ID" required />
  <Property name="email" type="String" required />
  <Property name="orders" type="[Order]" />

  <Action name="upgrade">
    <Argument name="tier" type="Tier" required />
    <Returns type="Customer" />
  </Action>
</Type>
```

→ Markdown docs, JSON Schema, GraphQL SDL, TypeScript types

### Business Framework

```tsx
<StoryBrand name="Acme Corp">
  <Hero>
    <Persona>Sarah is a 35-year-old VP of Engineering...</Persona>
    <Occupation>VP of Engineering</Occupation>
  </Hero>
  <Problem>
    <External>Hire engineers quickly</External>
    <Internal>Worried about missing deadlines</Internal>
  </Problem>
</StoryBrand>
```

→ Markdown doc, JSON data, presentation slides

---

## Summary

| Concept | Implementation |
|---------|---------------|
| Universal JSX | `@mdxld/jsx/core` |
| Output renderers | `@mdxld/jsx/{markdown,json,jsonld,html,...}` |
| Semantic primitives | `@mdxld/jsx/primitives` |
| Extraction | Component structure = schema |
| Convention mode | Primitives with built-in rules |
| Template mode | Custom JSX with explicit markup |
| Format conversion | `@mdxld/{markdown,json,html,yaml,typescript,diff}` |
| Version control | `@mdxld/diff` (patches, 3-way merge) |
| Presentation layer | `@mdxui/*` (adds styling) |

## Format Package Capabilities

| Package | To | From | Special Features |
|---------|-----|-----|-----------------|
| `@mdxld/markdown` | ✓ | ✓ | Convention-based layouts |
| `@mdxld/html` | ✓ | ✓ | Schema.org microdata, JSON-LD script |
| `@mdxld/json` | ✓ | — | JSON-LD, JSON Schema, OpenAPI, MCP, GraphQL |
| `@mdxld/yaml` | ✓ | ✓ | Multi-doc, streaming, YAML-LD |
| `@mdxld/typescript` | ✓ | ✓ | Zod schemas, JSON5, JSDoc |
| `@mdxld/diff` | — | — | Text diff, patches, 3-way merge, object diff |
