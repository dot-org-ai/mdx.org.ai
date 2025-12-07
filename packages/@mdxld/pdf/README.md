# @mdxld/pdf

PDF format support for text and metadata extraction. Read-only format - PDF generation is not supported. Built on pdf-parse for reliable text extraction and metadata parsing.

## Installation

```bash
pnpm add @mdxld/pdf
```

## Usage

### Basic PDF Parsing

```ts
import { PDF, parse } from '@mdxld/pdf'

// Parse PDF buffer
const doc = await parse(buffer)

console.log(doc.text)         // Extracted text
console.log(doc.numPages)     // Number of pages
console.log(doc.metadata)     // PDF metadata
console.log(doc.info)         // Document info (title, author, etc.)
console.log(doc.pages)        // Text per page

// Or use the format object
const doc2 = await PDF.parse(buffer)
```

### Fetch Remote PDF

```ts
import { fetchPDF } from '@mdxld/pdf'

const doc = await fetchPDF('https://example.com/document.pdf')
```

### Extract Text Only

```ts
import { extractText } from '@mdxld/pdf'

const text = await extractText(buffer)
```

### Extract Metadata Only

```ts
import { extractMetadata } from '@mdxld/pdf'

const { metadata, info, numPages } = await extractMetadata(buffer)

console.log(info.Title)       // Document title
console.log(info.Author)      // Author name
console.log(info.CreationDate) // When created
```

### Advanced Options

```ts
import { parse } from '@mdxld/pdf'

const doc = await parse(buffer, {
  maxPages: 10,                // Only parse first 10 pages
  pageSeparator: '\n\n',       // Separator between pages
  password: 'secret',          // For encrypted PDFs
  pageRender: (pageData) => {  // Custom page rendering
    return `Page ${pageData.pageNumber}: ${pageData.text}`
  }
})
```

### Convert to Markdown

```ts
import { toMarkdown } from '@mdxld/pdf'

const markdown = toMarkdown(doc)
// # Document Title
// > Author: John Doe
// > Subject: Annual Report
//
// [document text...]
```

### Convert to JSON-LD

```ts
import { toJSONLD } from '@mdxld/pdf'

const jsonld = toJSONLD(doc, {
  context: 'https://schema.org',
  id: 'https://example.com/doc/123'
})
// {
//   '@context': 'https://schema.org',
//   '@type': 'DigitalDocument',
//   'name': 'Document Title',
//   'author': { '@type': 'Person', name: 'John Doe' },
//   ...
// }
```

### Search in PDF

```ts
import { search } from '@mdxld/pdf'

const results = search(doc, 'important keyword', {
  caseSensitive: false
})

console.log(results.count)     // Number of matches
results.matches.forEach(match => {
  console.log(match.text)      // Context around match
  console.log(match.index)     // Position in document
})
```

## API

### Format Object (Async)

- `PDF.parse(input, options?)` - Parse PDF buffer (async)
- `PDF.fetch(url, options?)` - Fetch and parse remote PDF (async)
- `PDF.readonly` - Always `true` (read-only format)

### Functions

- `parse(input, options?)` / `fromPDF()` - Parse PDF (async)
- `fetchPDF(url, options?)` - Fetch PDF (async)
- `extractText(input, options?)` - Extract only text (async)
- `extractMetadata(input, options?)` - Extract only metadata (async)
- `toMarkdown(doc)` - Convert to Markdown
- `toJSONLD(doc, options?)` - Convert to JSON-LD
- `toDocument(doc)` - Convert to plain document structure
- `search(doc, query, options?)` - Search text in PDF

## Types

```ts
interface PDFParseOptions {
  maxPages?: number
  pageSeparator?: string
  pageRender?: (pageData: PDFPageData) => string
  password?: string
}

interface PDFDocument {
  text: string
  numPages: number
  metadata: PDFMetadata
  info: PDFInfo
  pages?: string[]
}

interface PDFInfo {
  Title?: string
  Author?: string
  Subject?: string
  Keywords?: string
  Creator?: string
  Producer?: string
  CreationDate?: string
  ModDate?: string
  IsLinearized?: boolean
  IsEncrypted?: boolean
}
```

## Note

This is a read-only format. PDF generation is not supported. Use this package to extract text and metadata from existing PDF files.
