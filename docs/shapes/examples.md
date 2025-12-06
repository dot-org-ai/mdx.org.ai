---
title: "@mdxld Format Conversions"
description: "Bi-directional to/from conversions between Objects and various formats"
---

# @mdxld Format Conversions

Bi-directional `to`/`from` conversions between Objects and various formats.

## Architecture

```
@mdxld/markdown  →  toMarkdown(obj) ↔ fromMarkdown(md)
@mdxld/html      →  toHTML(obj) ↔ fromHTML(html)
@mdxld/json      →  toJSON(obj) ↔ fromJSON(json)
                    toJSONLD(obj) ↔ fromJSONLD(jsonld)
                    toJSONSchema(obj) ↔ fromJSONSchema(schema)
                    toOpenAPI(obj) ↔ fromOpenAPI(spec)
```

These are **pure semantic conversions** - no styling, just data ↔ content.

## Dependency Graph

```
mdxld (core + format conversions)
   ↓
mdxdb (storage, relationships, queries)
   ↓
mdxui (presentation, styling, components)
```

`mdxdb` uses `@mdxld/*` to extract data and build relationships - no UI dependencies.

---

## Two API Levels

### 1. Pure Functions (Library Exports)

```typescript
import { toMarkdown, fromMarkdown } from '@mdxld/markdown'
import { toJSONLD, toOpenAPI, toJSONSchema } from '@mdxld/json'
import { toHTML, fromHTML } from '@mdxld/html'

// Object → Format
const md = toMarkdown(customer)                     // Auto conventions
const md = toMarkdown(customer, CustomerLayout)     // Explicit layout
const jsonld = toJSONLD(customer)
const spec = toOpenAPI(customerSchema)
const html = toHTML(customer)

// Format → Object
const obj = fromMarkdown(md, CustomerShape)         // Needs shape
const obj = fromJSONLD(jsonld)
const obj = fromHTML(html, CustomerShape)
```

### 2. Component Methods (Schema-Aware)

```typescript
// Components know their own schema/layout
const Customer = defineShape({
  name: 'Customer',
  schema: { /* ... */ },
  layout: { /* optional custom layout */ }
})

// Render methods - component knows its shape
Customer.render(data)              // Default format (markdown)
Customer.toMarkdown(data)
Customer.toHTML(data)
Customer.toJSONLD(data)
Customer.toOpenAPI()               // Schema only, no instance

// Extract methods - component knows how to parse
Customer.extract(markdown)
Customer.fromMarkdown(markdown)
Customer.fromHTML(html)
Customer.fromJSONLD(jsonld)
```

---

## Example 1: StoryBrand

### Shape

```typescript
type StoryBrand = {
  name: string

  hero: {
    persona: string
    occupation: string
    company: string
    activity: string
  }

  problem: {
    external: string
    internal: string
    philosophical: string
    villain: string
  }

  guide: {
    empathy: string
    authority: string
  }

  plan: {
    steps: string[]
    agreement: string
  }

  callToAction: {
    direct: string
    transitional: string
  }

  avoidFailure: {
    consequences: string[]
  }

  achieveSuccess: {
    outcomes: string[]
  }
}
```

### toMarkdown(storyBrand)

```markdown
# Acme Corp StoryBrand

## Hero

### Persona
Sarah is a 35-year-old VP of Engineering at a growing SaaS startup.

### Occupation
VP of Engineering

### Company
Series B SaaS startup (50-200 employees)

### Activity
Scaling the engineering team from 15 to 50 engineers.

## Problem

### External
Hire and onboard great engineers quickly.

### Internal
Worried she'll be blamed if the team can't deliver.

### Philosophical
Growing a team shouldn't mean sacrificing excellence.

### Villain
Traditional recruiting is slow and expensive.

## Guide

### Empathy
We've scaled engineering teams at 3 unicorn startups.

### Authority
Our founders led engineering at Stripe and Figma.

## Plan

### Steps
1. Tell us your needs in a 30-minute call
2. We source and screen candidates within 48 hours
3. You interview only pre-vetted engineers

### Agreement
We guarantee a hire within 30 days or your money back.

## Call to Action

### Direct
Schedule a Discovery Call

### Transitional
Download: "The VP Engineering's Guide to Scaling Teams"

## Avoid Failure

### Consequences
- Miss product deadlines
- Burn out your current team
- Hire wrong people who slow everyone down

## Achieve Success

### Outcomes
- Ship features 2x faster
- Build a reputation as a great place for engineers
- Get promoted because your team delivers
```

---

## Example 2: Lean Canvas

### Shape

```typescript
type LeanCanvas = {
  name: string
  date: string
  iteration: number

  problem: {
    top3: string[]
    existingAlternatives: string
  }

  customerSegments: {
    segments: string[]
    earlyAdopters: string
  }

  uniqueValueProposition: {
    headline: string
    highLevelConcept: string
  }

  solution: {
    features: string[]
  }

  channels: string[]

  revenueStreams: {
    sources: string[]
    pricing: string
  }

  costStructure: {
    fixed: string[]
    variable: string[]
  }

  keyMetrics: string[]

  unfairAdvantage: string[]
}
```

### toMarkdown(leanCanvas)

```markdown
# Lean Canvas: DevRecruit

**Date:** 2024-01-15
**Iteration:** 3

## Problem

### Top 3 Problems
1. Hiring engineers takes 3-6 months
2. 40% of hires don't work out
3. Managers spend 30% of time recruiting

### Existing Alternatives
Internal recruiters, LinkedIn, agencies, referrals

## Customer Segments

### Segments
- VP/Directors of Engineering at Series A-C
- CTOs scaling from 20-200 engineers
- Engineering Managers

### Early Adopters
VP Engineering at Series B startups in SF Bay Area

## Unique Value Proposition

### Headline
Hire senior engineers in 30 days, guaranteed.

### High-Level Concept
"Toptal for full-time hires"

## Solution

### Features
1. AI-powered technical screening
2. 48-hour candidate delivery
3. 90-day performance guarantee

## Channels

- LinkedIn content
- Conference sponsorships
- Referrals
- SEO

## Revenue Streams

### Sources
- 20% of first-year salary
- Monthly retainer ($5k/mo)

### Pricing
Success-fee, no payment until hire starts

## Cost Structure

### Fixed Costs
- Sourcing team salaries
- AI/ML infrastructure

### Variable Costs
- Screening hours
- Sales commissions

## Key Metrics

- Time to hire (<30 days)
- Candidate pass-through rate
- 90-day retention rate
- NPS

## Unfair Advantage

- Proprietary assessment data from 50k+ engineers
- Network effects
- Engineering-focused brand
```

---

## Example 3: Noun (Entity/Type Definition)

### Shape

```typescript
type Noun = {
  name: string
  plural: string
  description: string
  extends?: string

  properties: Array<{
    name: string
    type: string
    required?: boolean
    default?: string
    description: string
  }>

  actions: Array<{
    name: string
    description: string
    arguments: Array<{ name: string; type: string; required?: boolean }>
    returns: string
  }>

  events: Array<{
    name: string
    payload: string
    description: string
  }>

  subtypes?: string[]
}
```

### toMarkdown(noun)

```markdown
# Customer (Customers)

A person or organization that purchases products or services.

**Extends:** Entity

## Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| id | string | ✓ | - | Unique identifier |
| email | string | ✓ | - | Primary email |
| name | string | ✓ | - | Display name |
| status | Status | ✓ | active | Account status |
| tier | Tier | - | free | Subscription tier |

## Actions

### create

Create a new customer account.

| Argument | Type | Required |
|----------|------|----------|
| email | string | ✓ |
| name | string | ✓ |

**Returns:** `Customer`

---

### update

Update customer information.

| Argument | Type | Required |
|----------|------|----------|
| id | string | ✓ |
| data | Partial<Customer> | ✓ |

**Returns:** `Customer`

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| customer.created | Customer | New customer created |
| customer.updated | CustomerUpdated | Customer data changed |
| customer.deleted | { id } | Customer removed |

## Subtypes

- IndividualCustomer
- BusinessCustomer
- EnterpriseCustomer
```

### toJSONLD(noun)

```json
{
  "@context": "https://schema.org",
  "@type": "Class",
  "@id": "https://example.com/Customer",
  "name": "Customer",
  "description": "A person or organization that purchases products or services.",
  "subClassOf": { "@id": "https://example.com/Entity" },
  "property": [
    {
      "@type": "Property",
      "name": "id",
      "rangeIncludes": "string",
      "description": "Unique identifier"
    },
    {
      "@type": "Property",
      "name": "email",
      "rangeIncludes": "string",
      "description": "Primary email"
    }
  ]
}
```

### toJSONSchema(noun)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/Customer.json",
  "title": "Customer",
  "description": "A person or organization that purchases products or services.",
  "type": "object",
  "required": ["id", "email", "name", "status"],
  "properties": {
    "id": { "type": "string", "description": "Unique identifier" },
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string" },
    "status": { "type": "string", "enum": ["active", "inactive", "deleted"], "default": "active" },
    "tier": { "type": "string", "enum": ["free", "pro", "enterprise"], "default": "free" }
  }
}
```

---

## Example 4: Verb (Action Definition)

### Shape

```typescript
type Verb = {
  name: string
  infinitive: string
  description: string

  subject: { type: string; role?: string }
  object: { type: string; cardinality: 'one' | 'many' }

  arguments: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>

  returns: { type: string; description: string }

  sideEffects: Array<{
    type: 'creates' | 'updates' | 'deletes' | 'triggers'
    target: string
  }>

  preconditions: string[]
  postconditions: string[]

  examples: Array<{
    name: string
    input: object
    output: object
  }>
}
```

### toMarkdown(verb)

```markdown
# send (to send)

Send a message to one or more recipients.

## Subject

**Type:** User
**Role:** authenticated

## Object

**Type:** Message
**Cardinality:** one

## Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| to | string[] | ✓ | Recipient emails |
| subject | string | ✓ | Subject line |
| body | string | ✓ | Message body |
| attachments | Attachment[] | - | File attachments |

## Returns

**Type:** `SendResult`

Confirmation with message ID and delivery status.

## Side Effects

| Type | Target |
|------|--------|
| creates | Message |
| creates | MessageRecipient[] |
| triggers | message.sent |

## Preconditions

- User must be authenticated
- User must have `send:messages` permission
- Daily send limit not exceeded

## Postconditions

- Message record exists
- Message queued for delivery
- Sender receives confirmation

## Examples

### Basic Send

**Input:**
```json
{
  "to": ["alice@example.com"],
  "subject": "Hello",
  "body": "Test message."
}
```

**Output:**
```json
{
  "id": "msg_abc123",
  "status": "queued"
}
```
```

### toOpenAPI(verb)

```yaml
/messages/send:
  post:
    operationId: send
    summary: Send a message to one or more recipients
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [to, subject, body]
            properties:
              to:
                type: array
                items: { type: string, format: email }
              subject:
                type: string
              body:
                type: string
              attachments:
                type: array
                items: { $ref: '#/components/schemas/Attachment' }
    responses:
      '200':
        description: Message queued
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SendResult'
```

---

## Example 5: MCP Tool

### Shape

```typescript
type MCPTool = {
  name: string
  description: string

  inputSchema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }

  examples: Array<{
    name: string
    arguments: object
    result: unknown
  }>
}
```

### toMarkdown(mcpTool)

```markdown
# read_file

Read the contents of a file from the filesystem.

## Input Schema

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| path | string | ✓ | Absolute path to the file |
| encoding | string | - | File encoding (default: utf-8) |

## Examples

### Read a TypeScript file

**Arguments:**
```json
{
  "path": "/src/index.ts"
}
```

**Result:**
```json
{
  "content": "export function main() { ... }",
  "size": 1234,
  "mimeType": "text/typescript"
}
```
```

### toMCP(mcpTool)

```json
{
  "name": "read_file",
  "description": "Read the contents of a file from the filesystem.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Absolute path to the file"
      },
      "encoding": {
        "type": "string",
        "description": "File encoding (default: utf-8)"
      }
    },
    "required": ["path"]
  }
}
```

---

## Example 6: API Endpoint

### Shape

```typescript
type APIEndpoint = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  summary: string
  description: string

  parameters: Array<{
    name: string
    in: 'path' | 'query' | 'header'
    type: string
    required: boolean
    description: string
  }>

  requestBody?: {
    type: string
    required: boolean
    properties: Array<{ name: string; type: string; required: boolean }>
  }

  responses: Array<{
    status: number
    description: string
    schema?: string
  }>

  authentication: 'none' | 'api_key' | 'bearer' | 'oauth2'
  rateLimit?: string
}
```

### toMarkdown(apiEndpoint)

```markdown
# POST /customers

Create a new customer account.

## Authentication

**Type:** Bearer Token

## Parameters

| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| X-Idempotency-Key | header | string | - | Prevent duplicate requests |

## Request Body

**Content-Type:** application/json

| Property | Type | Required |
|----------|------|----------|
| email | string | ✓ |
| name | string | ✓ |
| tier | string | - |

## Responses

| Status | Description | Schema |
|--------|-------------|--------|
| 201 | Customer created | Customer |
| 400 | Validation error | Error |
| 409 | Email already exists | Error |

## Rate Limit

100 requests per minute
```

---

## Example 7: GraphQL Type

### Shape

```typescript
type GraphQLType = {
  name: string
  kind: 'type' | 'input' | 'interface' | 'enum' | 'union'
  description: string
  implements?: string[]

  fields: Array<{
    name: string
    type: string
    nullable: boolean
    description: string
    arguments?: Array<{ name: string; type: string }>
    deprecated?: string
  }>
}
```

### toMarkdown(graphqlType)

```markdown
# Customer (type)

A customer account in the system.

**Implements:** Node, Auditable

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | ID! | ✗ | Unique identifier |
| email | String! | ✗ | Primary email |
| name | String! | ✗ | Display name |
| orders | [Order!]! | ✗ | Customer's orders |
| createdAt | DateTime! | ✗ | Creation timestamp |
| legacyId | String | ✓ | ⚠️ Deprecated: Use id instead |

### orders

**Arguments:**

| Argument | Type |
|----------|------|
| first | Int |
| after | String |
| status | OrderStatus |
```

### toGraphQL(graphqlType)

```graphql
"""
A customer account in the system.
"""
type Customer implements Node & Auditable {
  "Unique identifier"
  id: ID!

  "Primary email"
  email: String!

  "Display name"
  name: String!

  "Customer's orders"
  orders(first: Int, after: String, status: OrderStatus): [Order!]!

  "Creation timestamp"
  createdAt: DateTime!

  "Use id instead"
  legacyId: String @deprecated(reason: "Use id instead")
}
```

---

## Example 8: Event

### Shape

```typescript
type Event = {
  name: string
  date: string
  time: string
  timezone: string
  location: {
    name: string
    address?: string
    virtual?: boolean
    url?: string
  }
  description: string
  agenda: Array<{
    time: string
    title: string
    speaker?: string
  }>
  registration: {
    url: string
    deadline?: string
    price?: string
  }
}
```

### toMarkdown(event)

```markdown
# AI Engineering Meetup

**Date:** January 20, 2024
**Time:** 6:00 PM PST
**Location:** Cloudflare HQ, San Francisco

Join us for an evening of talks on building with LLMs.

## Agenda

| Time | Title | Speaker |
|------|-------|---------|
| 6:00 PM | Doors Open & Networking | - |
| 6:30 PM | Building RAG at Scale | Alice Chen |
| 7:15 PM | Fine-tuning in Production | Bob Smith |
| 8:00 PM | Q&A Panel | All Speakers |

## Registration

**URL:** https://lu.ma/ai-meetup
**Deadline:** January 18, 2024
**Price:** Free
```

### toJSONLD(event)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "AI Engineering Meetup",
  "startDate": "2024-01-20T18:00:00-08:00",
  "location": {
    "@type": "Place",
    "name": "Cloudflare HQ",
    "address": "San Francisco"
  },
  "description": "Join us for an evening of talks on building with LLMs.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "url": "https://lu.ma/ai-meetup"
  }
}
```

---

## Example 9: Recipe

### Shape

```typescript
type Recipe = {
  name: string
  description: string
  prepTime: string
  cookTime: string
  servings: number

  ingredients: Array<{
    amount: string
    unit: string
    item: string
    notes?: string
  }>

  instructions: string[]

  nutrition?: {
    calories: number
    protein: string
    carbs: string
    fat: string
  }

  tags: string[]
}
```

### toMarkdown(recipe)

```markdown
# Chocolate Chip Cookies

Classic homemade cookies with crispy edges and chewy centers.

**Prep Time:** 15 minutes
**Cook Time:** 12 minutes
**Servings:** 24 cookies

## Ingredients

- 2¼ cups all-purpose flour
- 1 tsp baking soda
- 1 tsp salt
- 1 cup butter, softened
- ¾ cup sugar
- ¾ cup brown sugar, packed
- 2 large eggs
- 2 tsp vanilla extract
- 2 cups chocolate chips

## Instructions

1. Preheat oven to 375°F (190°C)
2. Mix flour, baking soda, and salt in a bowl
3. Beat butter and sugars until creamy
4. Add eggs and vanilla to butter mixture
5. Gradually blend in flour mixture
6. Stir in chocolate chips
7. Drop rounded tablespoons onto baking sheets
8. Bake 9-11 minutes or until golden brown

## Nutrition

| Calories | Protein | Carbs | Fat |
|----------|---------|-------|-----|
| 150 | 2g | 20g | 7g |

## Tags

dessert, cookies, chocolate, baking
```

### toJSONLD(recipe)

```json
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Chocolate Chip Cookies",
  "description": "Classic homemade cookies with crispy edges and chewy centers.",
  "prepTime": "PT15M",
  "cookTime": "PT12M",
  "recipeYield": "24 cookies",
  "recipeIngredient": [
    "2¼ cups all-purpose flour",
    "1 tsp baking soda",
    "2 cups chocolate chips"
  ],
  "recipeInstructions": [
    { "@type": "HowToStep", "text": "Preheat oven to 375°F" },
    { "@type": "HowToStep", "text": "Mix flour, baking soda, and salt" }
  ],
  "nutrition": {
    "@type": "NutritionInformation",
    "calories": "150 calories"
  }
}
```

---

## Example 10: Resume/CV

### Shape

```typescript
type Resume = {
  name: string
  title: string
  contact: {
    email: string
    phone?: string
    location: string
    linkedin?: string
    github?: string
    website?: string
  }

  summary: string

  experience: Array<{
    company: string
    title: string
    location: string
    startDate: string
    endDate?: string
    highlights: string[]
  }>

  education: Array<{
    institution: string
    degree: string
    field: string
    graduationDate: string
    gpa?: string
  }>

  skills: {
    languages: string[]
    frameworks: string[]
    tools: string[]
  }
}
```

### toMarkdown(resume)

```markdown
# Sarah Chen

**Senior Software Engineer**

san francisco, ca • sarah@example.com • github.com/sarahchen

## Summary

Full-stack engineer with 8 years of experience building scalable web applications. Passionate about developer tools and developer experience.

## Experience

### Stripe — Staff Engineer
*San Francisco, CA • 2021 - Present*

- Led migration of payments API to new architecture, reducing latency by 40%
- Built internal developer platform used by 500+ engineers
- Mentored team of 5 engineers

### Figma — Senior Engineer
*San Francisco, CA • 2018 - 2021*

- Core contributor to real-time collaboration engine
- Reduced sync conflicts by 60% with CRDT improvements
- Led hiring, grew team from 3 to 12

## Education

### Stanford University
**BS Computer Science** • 2014
GPA: 3.8

## Skills

**Languages:** TypeScript, Python, Go, Rust
**Frameworks:** React, Node.js, FastAPI
**Tools:** PostgreSQL, Redis, Kubernetes, Terraform
```

---

## Conventions Summary

### Object → Markdown Rules

| Shape Pattern | Markdown Output |
|---------------|-----------------|
| `name` (top-level) | `# {name}` |
| `description` | Paragraph after title |
| Scalar metadata | `**{Key}:** {value}` |
| Nested object | `## {Key}` section |
| Nested scalar | `### {Key}\n{value}` or `**{Key}:** {value}` |
| `string[]` | Bullet list or numbered list |
| `object[]` (flat) | Table |
| `object[]` (complex) | Subsections with `### {name}` |

### Markdown → Object Rules

| Markdown Pattern | Object Output |
|------------------|---------------|
| `# Title` | `{ name: "Title" }` |
| `**Key:** value` | `{ key: "value" }` |
| `## Section` | `{ section: { ... } }` |
| `### Property\ncontent` | `{ property: "content" }` |
| Bullet list | `string[]` |
| Table | `object[]` with column headers as keys |
| Fenced code block | Preserve as string with language hint |

### Format-Specific Outputs

| Format | Use Case |
|--------|----------|
| `toMarkdown` | Human-readable docs, editing |
| `toHTML` | Semantic web content |
| `toJSON` | Plain data exchange |
| `toJSONLD` | Linked data, SEO, Schema.org |
| `toJSONSchema` | Validation, codegen |
| `toOpenAPI` | REST API documentation |
| `toGraphQL` | GraphQL schema |
| `toMCP` | AI tool definitions |
