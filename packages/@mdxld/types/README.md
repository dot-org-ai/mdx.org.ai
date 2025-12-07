# @mdxld/types

Shared TypeScript type definitions for all MDXLD format packages. Provides a consistent interface pattern across JSON, YAML, CSV, XLSX, PDF, Markdown, and HTML converters.

## Installation

```bash
pnpm add @mdxld/types
```

## Usage

```ts
import type {
  Format,
  BiDirectionalFormat,
  TextFormat,
  BinaryFormat,
  ReadOnlyFormat,
  TabularFormat,
  DocumentFormat
} from '@mdxld/types'
```

## Core Interfaces

### Format

Base interface that all format converters implement:

```ts
interface Format<T = unknown, ParseOptions = unknown, StringifyOptions = unknown> {
  parse(input: string | ArrayBuffer, options?: ParseOptions): T
  stringify?(data: T, options?: StringifyOptions): string | ArrayBuffer
  fetch(url: string, options?: FormatFetchOptions & ParseOptions): Promise<T>

  readonly name: string
  readonly mimeTypes: readonly string[]
  readonly extensions: readonly string[]
}
```

### BiDirectionalFormat

Formats that support both parse and stringify (JSON, YAML, CSV, XLSX):

```ts
interface BiDirectionalFormat<T, ParseOptions, StringifyOptions>
  extends Format<T, ParseOptions, StringifyOptions> {
  stringify(data: T, options?: StringifyOptions): string | ArrayBuffer
}
```

### TextFormat

Text-based formats where input and output are always strings (JSON, YAML, CSV, Markdown):

```ts
interface TextFormat<T, ParseOptions, StringifyOptions>
  extends BiDirectionalFormat<T, ParseOptions, StringifyOptions, string, string> {
  stringify(data: T, options?: StringifyOptions): string
}
```

### BinaryFormat

Binary formats where output is ArrayBuffer (XLSX):

```ts
interface BinaryFormat<T, ParseOptions, StringifyOptions>
  extends BiDirectionalFormat<T, ParseOptions, StringifyOptions, string | ArrayBuffer, ArrayBuffer> {
  stringify(data: T, options?: StringifyOptions): ArrayBuffer
}
```

### ReadOnlyFormat

Formats that only support reading (PDF):

```ts
interface ReadOnlyFormat<T, ParseOptions>
  extends Omit<Format<T, ParseOptions, never>, 'stringify'> {
  readonly readonly: true
}
```

### TabularFormat

Formats for tabular text data (CSV, TSV):

```ts
interface TabularFormat<T = Record<string, unknown>[], ParseOptions, StringifyOptions>
  extends TextFormat<T, ParseOptions, StringifyOptions> {
  getHeaders(data: T): string[]
}
```

### TabularBinaryFormat

Formats for tabular binary data (XLSX):

```ts
interface TabularBinaryFormat<T = Record<string, unknown>[], ParseOptions, StringifyOptions>
  extends BinaryFormat<T, ParseOptions, StringifyOptions> {
  getHeaders(data: T): string[]
}
```

## Type Guards

```ts
import { isBiDirectional, isReadOnly, isTabular } from '@mdxld/types'

if (isBiDirectional(format)) {
  // format.stringify is available
}

if (isReadOnly(format)) {
  // format.readonly === true, no stringify
}

if (isTabular(format)) {
  // format.getHeaders is available
}
```

## Example Implementation

```ts
import type { TextFormat } from '@mdxld/types'

const MyFormat: TextFormat<MyData, MyParseOptions, MyStringifyOptions> = {
  name: 'myformat',
  mimeTypes: ['application/x-myformat'],
  extensions: ['myf'],

  parse(input: string, options?: MyParseOptions): MyData {
    // Implementation
  },

  stringify(data: MyData, options?: MyStringifyOptions): string {
    // Implementation
  },

  async fetch(url: string, options?: FormatFetchOptions & MyParseOptions): Promise<MyData> {
    const response = await fetch(url)
    const text = await response.text()
    return this.parse(text, options)
  }
}
```

## Packages Using These Types

- `@mdxld/json` - JSON and JSON-LD
- `@mdxld/yaml` - YAML and YAML-LD
- `@mdxld/csv` - CSV and TSV
- `@mdxld/xlsx` - Excel spreadsheets
- `@mdxld/pdf` - PDF documents
- `@mdxld/markdown` - Markdown
- `@mdxld/html` - HTML
- `@mdxld/formats` - Unified access to all formats
