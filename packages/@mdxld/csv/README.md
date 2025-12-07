# @mdxld/csv

CSV and TSV format support with bi-directional conversion. Built on PapaParse with automatic type detection, custom headers, and delimiter auto-detection.

## Installation

```bash
pnpm add @mdxld/csv
```

## Usage

### Basic CSV Parsing

```ts
import { CSV, parse, stringify } from '@mdxld/csv'

// Parse CSV string
const data = parse('name,age\nAlice,30\nBob,25')
// [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]

// Or use the format object
const data2 = CSV.parse('name,age\nAlice,30')

// Convert to CSV
const csv = stringify([{ name: 'Alice', age: 30 }])
// 'name,age\nAlice,30'
```

### Fetch Remote CSV

```ts
import { fetchCSV } from '@mdxld/csv'

const data = await fetchCSV('https://example.com/data.csv')
```

### TSV Support

```ts
import { TSV, parseTSV, stringifyTSV } from '@mdxld/csv'

const data = parseTSV('name\tage\nAlice\t30')
const tsv = stringifyTSV([{ name: 'Alice', age: 30 }])
```

### Auto-Detect Delimiter

```ts
import { parseAuto, detectDelimiter } from '@mdxld/csv'

// Automatically detects comma, tab, semicolon, or pipe
const delimiter = detectDelimiter(content)
const data = parseAuto(content) // Uses detected delimiter
```

### Advanced Options

```ts
import { parse } from '@mdxld/csv'

const data = parse(content, {
  headers: ['name', 'age'], // Custom headers
  skipEmpty: true,          // Skip empty rows
  dynamicTyping: true,      // Convert numbers/booleans
  comments: '#',            // Skip lines starting with #
  transform: (value, column) => {
    return column === 'age' ? parseInt(value) : value
  }
})
```

### Convert to JSON-LD

```ts
import { toJSONLD } from '@mdxld/csv'

const jsonld = toJSONLD(data, {
  context: 'https://schema.org',
  type: 'ItemList'
})
```

## API

### Format Object

- `CSV.parse(input, options?)` - Parse CSV string or buffer
- `CSV.stringify(data, options?)` - Convert array to CSV string
- `CSV.fetch(url, options?)` - Fetch and parse remote CSV
- `CSV.getHeaders(data)` - Extract column headers

### Functions

- `parse(input, options?)` / `fromCSV()` - Parse CSV
- `stringify(data, options?)` / `toCSV()` - Generate CSV
- `parseTSV(input, options?)` / `fromTSV()` - Parse TSV
- `stringifyTSV(data, options?)` / `toTSV()` - Generate TSV
- `fetchCSV(url, options?)` - Fetch CSV
- `fetchTSV(url, options?)` - Fetch TSV
- `detectDelimiter(content)` - Auto-detect delimiter
- `parseAuto(input, options?)` - Parse with auto-detected delimiter
- `toJSONLD(data, options?)` - Convert to JSON-LD

## Types

```ts
interface CSVParseOptions {
  headers?: boolean | string[]
  skipEmpty?: boolean
  delimiter?: string
  transform?: (value: string, column: string) => unknown
  dynamicTyping?: boolean
  comments?: string | false
}

interface CSVStringifyOptions {
  headers?: boolean | string[]
  delimiter?: string
  quoteAll?: boolean
  lineEnding?: '\n' | '\r\n'
}
```
