# @mdxe/electron

Electron runtime for MDXLD documents - build desktop apps with MDX content and full Node.js capabilities.

## Installation

```bash
pnpm add @mdxe/electron electron
```

## Usage

### Main Process

```typescript
import { setupMainHandlers } from '@mdxe/electron/main'
import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
  const window = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Set up IPC handlers for MDX operations
  setupMainHandlers({
    baseDir: path.join(app.getPath('userData'), 'content'),
    watchFiles: true,
  })

  window.loadFile('index.html')
})
```

### Preload Script

```typescript
import { exposeElectronAPI } from '@mdxe/electron/preload'

// Expose MDX API to renderer
exposeElectronAPI()
```

### Renderer Process

```typescript
import { parse, safeParse } from '@mdxe/electron/renderer'

// Use the exposed API
const result = await window.mdx.parse(content)
if (result.success) {
  console.log(result.data)
}
```

## API

### Main Process

- `setupMainHandlers(config)` - Set up IPC handlers for file operations
- `loadMDXFile(filepath)` - Load and parse MDX file
- `saveMDXFile(filepath, doc)` - Save MDXLD document
- `watchMDXDirectory(dir, callback)` - Watch for file changes

### Preload

- `exposeElectronAPI(options)` - Expose IPC bridge to renderer

### Renderer

- `parse(content)` - Parse MDX content
- `safeParse(content)` - Parse with error handling
- `toAst(content)` - Convert to AST
- `safeToAst(content)` - Convert to AST with error handling

## Configuration

```typescript
interface ElectronMDXConfig {
  watchFiles?: boolean // Enable file watching
  baseDir?: string // Base directory for MDX files
  components?: Record<string, unknown> // Custom components
  ipcPrefix?: string // IPC channel prefix (default: 'mdx')
}
```

## Example: MDX Editor

```typescript
// main.ts
import { setupMainHandlers } from '@mdxe/electron/main'

setupMainHandlers({
  baseDir: './content',
  watchFiles: true,
})

// renderer.ts
const content = await window.mdx.readFile('post.mdx')
const result = window.mdx.parse(content)

if (result.success) {
  // Display in editor
  editor.setValue(content)
  preview.render(result.data)
}
```
