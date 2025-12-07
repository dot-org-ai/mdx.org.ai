# @mdxld/formats

Unified format utilities providing consistent parse/stringify/fetch API across JSON, YAML, CSV, XLSX, PDF, Markdown, and HTML. All formats follow the same interface pattern for easy interoperability and format auto-detection.

## Installation

```bash
pnpm add @mdxld/formats
```

This installs all format packages:
- `@mdxld/json` - JSON and JSON-LD
- `@mdxld/yaml` - YAML and YAML-LD
- `@mdxld/csv` - CSV and TSV
- `@mdxld/xlsx` - Excel spreadsheets
- `@mdxld/pdf` - PDF documents
- `@mdxld/markdown` - Markdown
- `@mdxld/html` - HTML

## Usage

### Consistent API Across Formats

All formats follow the same pattern:

```ts
import { JSON, YAML, CSV, XLSX, PDF, Markdown, HTML } from '@mdxld/formats'

// Parse
const jsonData = JSON.parse('{"name": "test"}')
const yamlData = YAML.parse('name: test')
const csvData = CSV.parse('name,age\nAlice,30')
const xlsxData = XLSX.parse(buffer)
const pdfDoc = await PDF.parse(buffer)  // async
const mdData = Markdown.parse('# Title')
const htmlData = HTML.parse('<h1>Title</h1>')

// Stringify
const jsonStr = JSON.stringify({ name: 'test' })
const yamlStr = YAML.stringify({ name: 'test' })
const csvStr = CSV.stringify([{ name: 'Alice', age: 30 }])
const xlsxBuf = XLSX.stringify([{ name: 'Alice' }])
// PDF is read-only (no stringify)
const mdStr = Markdown.stringify({ title: 'Test' })
const htmlStr = HTML.stringify({ title: 'Test' })

// Fetch
const remoteJson = await JSON.fetch('https://api.example.com/data.json')
const remoteYaml = await YAML.fetch('https://example.com/config.yaml')
const remoteCsv = await CSV.fetch('https://example.com/data.csv')
```

### Format Registry

```ts
import { formats, getFormat, getFormatByExtension, getFormatByMimeType } from '@mdxld/formats'

// Get format by name
const format = getFormat('json')

// Get format by file extension
const csvFormat = getFormatByExtension('csv')
const xlsxFormat = getFormatByExtension('.xlsx')

// Get format by MIME type
const jsonFormat = getFormatByMimeType('application/json')
const htmlFormat = getFormatByMimeType('text/html')
```

### Auto-Detect and Parse

```ts
import { parseByExtension, fetchAndParse } from '@mdxld/formats'

// Parse based on file extension
const data = parseByExtension(content, 'json')
const csvData = parseByExtension(csvContent, '.csv')

// Fetch and auto-detect from URL
const data1 = await fetchAndParse('https://example.com/data.json')
const data2 = await fetchAndParse('https://example.com/data.csv')

// Or specify format explicitly
const data3 = await fetchAndParse('https://example.com/file', { format: 'yaml' })
```

### Type Guards

```ts
import { isBiDirectional, isReadOnly, isTabular } from '@mdxld/formats'

if (isBiDirectional(format)) {
  const output = format.stringify(data)
}

if (isReadOnly(format)) {
  // PDF is read-only
  console.log(format.readonly) // true
}

if (isTabular(format)) {
  const headers = format.getHeaders(data)
}
```

## Available Formats

### Text Formats

- **JSON** - `application/json`, `.json`
- **YAML** - `text/yaml`, `.yaml`, `.yml`
- **CSV** - `text/csv`, `.csv`
- **TSV** - `text/tab-separated-values`, `.tsv`
- **Markdown** - `text/markdown`, `.md`
- **HTML** - `text/html`, `.html`

### Binary Formats

- **XLSX** - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `.xlsx`

### Read-Only Formats

- **PDF** - `application/pdf`, `.pdf` (extraction only)

## Format-Specific Exports

Each format has specialized utilities:

```ts
// JSON
import { toJSONLD, toJSONSchema, toOpenAPI, toMCP, toGraphQL } from '@mdxld/formats'

// YAML
import { toYAMLDocuments, yamlldToJsonld } from '@mdxld/formats'

// CSV
import { detectDelimiter, parseCSVAuto, csvToJSONLD } from '@mdxld/formats'

// XLSX
import { getSheetNames, parseAllSheets, xlsxToCSV } from '@mdxld/formats'

// PDF
import { extractPDFText, extractPDFMetadata, pdfToMarkdown, searchPDF } from '@mdxld/formats'

// Markdown
import { diff, applyExtract } from '@mdxld/formats'

// HTML
import { toJSONLDScript } from '@mdxld/formats'
```

## API

### Registry Functions

- `getFormat(name)` - Get format by name
- `getFormatByExtension(ext)` - Get format by file extension
- `getFormatByMimeType(mime)` - Get format by MIME type
- `parseByExtension(content, ext, options?)` - Parse using extension
- `fetchAndParse(url, options?)` - Fetch and auto-parse

### Format Objects

All format objects implement a consistent interface:

```ts
{
  name: string
  mimeTypes: string[]
  extensions: string[]
  parse(input, options?): T
  stringify?(data, options?): string | ArrayBuffer
  fetch(url, options?): Promise<T>
}
```

## Examples

### Convert Between Formats

```ts
import { JSON, YAML, CSV } from '@mdxld/formats'

// JSON to YAML
const jsonData = JSON.parse('{"name": "test"}')
const yaml = YAML.stringify(jsonData)

// CSV to JSON
const csvData = CSV.parse('name,age\nAlice,30')
const json = JSON.stringify(csvData)

// YAML to CSV (for tabular data)
const data = YAML.parse('- name: Alice\n  age: 30')
const csv = CSV.stringify(data)
```

### Process Remote Files

```ts
import { fetchAndParse, CSV } from '@mdxld/formats'

// Auto-detect and parse
const data = await fetchAndParse('https://example.com/data.csv')

// Process and convert
const processed = data.map(row => ({ ...row, processed: true }))
const csv = CSV.stringify(processed)
```
