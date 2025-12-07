# @mdxld/xlsx

Excel (XLSX/XLS) format support with bi-directional conversion. Parse spreadsheets to JSON and create Excel files from data. Supports multiple sheets, custom headers, and password-protected files.

## Installation

```bash
pnpm add @mdxld/xlsx
```

## Usage

### Basic XLSX Parsing

```ts
import { XLSX, parse, stringify } from '@mdxld/xlsx'

// Parse XLSX buffer
const data = parse(buffer)
// [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]

// Or use the format object
const data2 = XLSX.parse(buffer)

// Convert to XLSX buffer
const buffer = stringify([{ name: 'Alice', age: 30 }])
```

### Fetch Remote XLSX

```ts
import { fetchXLSX } from '@mdxld/xlsx'

const data = await fetchXLSX('https://example.com/data.xlsx')
```

### Multi-Sheet Support

```ts
import { parseAllSheets, stringifyMultiSheet } from '@mdxld/xlsx'

// Parse all sheets
const sheets = parseAllSheets(buffer)
// { Sheet1: [...], Sheet2: [...] }

// Create multi-sheet XLSX
const buffer = stringifyMultiSheet({
  Sales: salesData,
  Inventory: inventoryData
})
```

### Advanced Options

```ts
import { parse, stringify } from '@mdxld/xlsx'

// Parse specific sheet
const data = parse(buffer, {
  sheet: 'Sales',        // Or use index: 0
  headers: true,         // First row as headers
  range: 'A1:C10',      // Parse specific range
  skipEmpty: true,       // Skip empty rows
  password: 'secret'     // For protected files
})

// Stringify with options
const buffer = stringify(data, {
  sheetName: 'Report',
  headers: ['name', 'value'],
  columnWidths: [20, 15],
  bookType: 'xlsx',      // or 'xls', 'csv', 'ods'
  compression: 6
})
```

### Convert to/from CSV

```ts
import { toCSV, fromCSV } from '@mdxld/xlsx'

// XLSX to CSV
const csv = toCSV(buffer, { sheet: 0 })

// CSV to XLSX
const buffer = fromCSV(csvString)
```

### Utilities

```ts
import { getSheetNames, getHeaders, toJSONLD } from '@mdxld/xlsx'

// Get sheet names
const names = getSheetNames(buffer)
// ['Sheet1', 'Sheet2']

// Get column headers
const headers = getHeaders(data)
// ['name', 'age', 'email']

// Convert to JSON-LD
const jsonld = toJSONLD(data, {
  context: 'https://schema.org',
  type: 'ItemList'
})
```

## API

### Format Object

- `XLSX.parse(input, options?)` - Parse XLSX buffer
- `XLSX.stringify(data, options?)` - Create XLSX buffer
- `XLSX.fetch(url, options?)` - Fetch and parse remote XLSX
- `XLSX.getHeaders(data)` - Extract column headers

### Functions

- `parse(input, options?)` / `fromXLSX()` - Parse XLSX
- `stringify(data, options?)` / `toXLSX()` - Create XLSX
- `parseAllSheets(input, options?)` - Parse all sheets
- `stringifyMultiSheet(sheets, options?)` - Create multi-sheet XLSX
- `fetchXLSX(url, options?)` - Fetch XLSX
- `getSheetNames(input)` - Get sheet names
- `toCSV(input, options?)` - Convert to CSV
- `fromCSV(csv, options?)` - Create XLSX from CSV
- `toJSONLD(data, options?)` - Convert to JSON-LD

## Types

```ts
interface XLSXParseOptions {
  sheet?: string | number
  headers?: boolean | string[]
  range?: string
  skipEmpty?: boolean
  raw?: boolean
  password?: string
}

interface XLSXStringifyOptions {
  sheetName?: string
  headers?: boolean | string[]
  columnWidths?: number[]
  bookType?: 'xlsx' | 'xls' | 'csv' | 'ods'
  compression?: number
}

type XLSXData = Record<string, unknown>[]
type XLSXMultiSheet = Record<string, XLSXData>
```
