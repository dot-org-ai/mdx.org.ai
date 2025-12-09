/**
 * MDXLD VSCode Extension
 *
 * Provides enhanced MDX editing support with:
 * - GFM syntax highlighting
 * - Embedded language support (yaml`, sql`, csv`, tsv`)
 * - Mermaid diagram preview
 * - TypeScript type import visualization
 * - Code block attributes
 */

import * as vscode from 'vscode'

// Types for @mdxld/remark (dynamically imported ESM module)
interface ParsedImport {
  type: 'value' | 'type' | 'mixed'
  source: string
  specifiers: Array<{ name: string; isType: boolean; alias?: string }>
  isTypeOnly: boolean
  originalLine: string
  strippedLine: string
}

interface ParsedExport {
  type: 'value' | 'type' | 'mixed'
  names: string[]
  isTypeOnly: boolean
  isDefault: boolean
  source?: string
  originalLine: string
  strippedLine: string
}

interface TypeScriptESMResult {
  imports: ParsedImport[]
  exports: ParsedExport[]
  strippedContent: string
  hasTypeScript: boolean
}

interface TypeInfo {
  typeImports: Array<{ source: string; names: string[] }>
  valueImports: Array<{ source: string; names: string[] }>
  typeExports: string[]
  valueExports: string[]
}

interface MermaidAST {
  type: string
  source: string
  direction?: string
  nodes?: Array<{ id: string; label?: string; shape?: string }>
  edges?: Array<{ from: string; to: string; label?: string; type?: string }>
  participants?: Array<{ id: string; alias?: string }>
}

interface ExtractedMermaidDiagram {
  source: string
  ast: MermaidAST
  position: { start: number; end: number }
}

// Dynamic import helpers
let remarkModule: {
  parseTypeScriptESM: (source: string) => TypeScriptESMResult
  extractTypeInfo: (result: TypeScriptESMResult) => TypeInfo
  hasTypeScriptImportExport: (line: string) => boolean
  parseMermaid: (source: string) => MermaidAST
  extractMermaidDiagrams: (content: string) => ExtractedMermaidDiagram[]
  validateMermaid: (ast: MermaidAST) => string[]
} | null = null

async function loadRemarkModule() {
  if (remarkModule) return remarkModule
  try {
    const [tsModule, mainModule] = await Promise.all([
      import('@mdxld/remark/typescript'),
      import('@mdxld/remark'),
    ])
    remarkModule = {
      parseTypeScriptESM: tsModule.parseTypeScriptESM,
      extractTypeInfo: tsModule.extractTypeInfo,
      hasTypeScriptImportExport: tsModule.hasTypeScriptImportExport,
      parseMermaid: mainModule.parseMermaid,
      extractMermaidDiagrams: mainModule.extractMermaidDiagrams,
      validateMermaid: mainModule.validateMermaid,
    }
    return remarkModule
  } catch (e) {
    console.error('Failed to load @mdxld/remark:', e)
    return null
  }
}

let mermaidPreviewPanel: vscode.WebviewPanel | undefined

export function activate(context: vscode.ExtensionContext) {
  console.log('MDXLD extension activated')

  // Load the remark module asynchronously
  loadRemarkModule().then((mod) => {
    if (mod) {
      console.log('MDXLD: @mdxld/remark module loaded successfully')
    }
  })

  // Register document formatting provider
  const formatProvider = vscode.languages.registerDocumentFormattingEditProvider('mdxld', {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      // TODO: Implement formatting using @mdxld/remark
      return []
    },
  })

  // Register hover provider for TypeScript imports
  const hoverProvider = vscode.languages.registerHoverProvider('mdxld', {
    async provideHover(document: vscode.TextDocument, position: vscode.Position) {
      const mod = await loadRemarkModule()
      if (!mod) return undefined

      const line = document.lineAt(position.line).text

      // Check if on an import/export line
      if (line.startsWith('import') || line.startsWith('export')) {
        if (mod.hasTypeScriptImportExport(line)) {
          const result = mod.parseTypeScriptESM(line)
          const info = mod.extractTypeInfo(result)

          const contents = new vscode.MarkdownString()
          contents.appendMarkdown('**TypeScript Import/Export**\n\n')

          if (info.typeImports.length > 0) {
            contents.appendMarkdown('Type imports (stripped for runtime):\n')
            for (const ti of info.typeImports) {
              contents.appendMarkdown(`- \`${ti.names.join(', ')}\` from \`${ti.source}\`\n`)
            }
          }

          if (info.valueImports.length > 0) {
            contents.appendMarkdown('\nValue imports (kept for runtime):\n')
            for (const vi of info.valueImports) {
              contents.appendMarkdown(`- \`${vi.names.join(', ')}\` from \`${vi.source}\`\n`)
            }
          }

          return new vscode.Hover(contents)
        }
      }

      // Check if on a mermaid code block
      const text = document.getText()
      const diagrams = mod.extractMermaidDiagrams(text)
      const offset = document.offsetAt(position)

      for (const diagram of diagrams) {
        if (offset >= diagram.position.start && offset <= diagram.position.end) {
          const contents = new vscode.MarkdownString()
          contents.appendMarkdown(`**Mermaid Diagram: ${diagram.ast.type}**\n\n`)

          if (diagram.ast.nodes) {
            contents.appendMarkdown(`Nodes: ${diagram.ast.nodes.length}\n`)
          }
          if (diagram.ast.edges) {
            contents.appendMarkdown(`Edges: ${diagram.ast.edges.length}\n`)
          }
          if (diagram.ast.participants) {
            contents.appendMarkdown(`Participants: ${diagram.ast.participants.length}\n`)
          }

          const errors = mod.validateMermaid(diagram.ast)
          if (errors.length > 0) {
            contents.appendMarkdown('\n**Warnings:**\n')
            for (const error of errors) {
              contents.appendMarkdown(`- ${error}\n`)
            }
          }

          return new vscode.Hover(contents)
        }
      }

      return undefined
    },
  })

  // Register mermaid preview command
  const previewMermaidCommand = vscode.commands.registerCommand('mdxld.previewMermaid', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('No active editor')
      return
    }

    const mod = await loadRemarkModule()
    if (!mod) {
      vscode.window.showErrorMessage('Failed to load MDXLD remark module')
      return
    }

    const text = editor.document.getText()
    const diagrams = mod.extractMermaidDiagrams(text)

    if (diagrams.length === 0) {
      vscode.window.showWarningMessage('No mermaid diagrams found in document')
      return
    }

    // Create or show preview panel
    if (mermaidPreviewPanel) {
      mermaidPreviewPanel.reveal()
    } else {
      mermaidPreviewPanel = vscode.window.createWebviewPanel(
        'mdxldMermaidPreview',
        'Mermaid Preview',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
        }
      )

      mermaidPreviewPanel.onDidDispose(() => {
        mermaidPreviewPanel = undefined
      })
    }

    // Generate HTML with mermaid
    mermaidPreviewPanel.webview.html = getMermaidPreviewHtml(diagrams)
  })

  // Register extract type info command
  const extractTypeInfoCommand = vscode.commands.registerCommand('mdxld.extractTypeInfo', async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('No active editor')
      return
    }

    const mod = await loadRemarkModule()
    if (!mod) {
      vscode.window.showErrorMessage('Failed to load MDXLD remark module')
      return
    }

    const text = editor.document.getText()
    const result = mod.parseTypeScriptESM(text)

    if (!result.hasTypeScript) {
      vscode.window.showInformationMessage('No TypeScript-specific imports/exports found')
      return
    }

    const info = mod.extractTypeInfo(result)
    const output = vscode.window.createOutputChannel('MDXLD Type Info')
    output.clear()
    output.appendLine('TypeScript Import/Export Analysis')
    output.appendLine('='.repeat(40))
    output.appendLine('')

    output.appendLine('Type Imports (stripped for runtime):')
    for (const ti of info.typeImports) {
      output.appendLine(`  - ${ti.names.join(', ')} from "${ti.source}"`)
    }

    output.appendLine('')
    output.appendLine('Value Imports (kept for runtime):')
    for (const vi of info.valueImports) {
      output.appendLine(`  - ${vi.names.join(', ')} from "${vi.source}"`)
    }

    output.appendLine('')
    output.appendLine('Type Exports:')
    output.appendLine(`  ${info.typeExports.join(', ') || '(none)'}`)

    output.appendLine('')
    output.appendLine('Value Exports:')
    output.appendLine(`  ${info.valueExports.join(', ') || '(none)'}`)

    output.show()
  })

  // Register diagnostics provider for mermaid validation
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('mdxld')

  const updateDiagnostics = async (document: vscode.TextDocument) => {
    if (document.languageId !== 'mdxld') return

    const mod = await loadRemarkModule()
    if (!mod) return

    const diagnostics: vscode.Diagnostic[] = []
    const text = document.getText()
    const diagrams = mod.extractMermaidDiagrams(text)

    for (const diagram of diagrams) {
      const errors = mod.validateMermaid(diagram.ast)
      for (const error of errors) {
        const startPos = document.positionAt(diagram.position.start)
        const endPos = document.positionAt(diagram.position.end)
        const range = new vscode.Range(startPos, endPos)
        diagnostics.push(new vscode.Diagnostic(range, error, vscode.DiagnosticSeverity.Warning))
      }
    }

    diagnosticCollection.set(document.uri, diagnostics)
  }

  // Update diagnostics on document change
  const changeHandler = vscode.workspace.onDidChangeTextDocument((event) => {
    updateDiagnostics(event.document)
  })

  // Update diagnostics on document open
  const openHandler = vscode.workspace.onDidOpenTextDocument((document) => {
    updateDiagnostics(document)
  })

  // Register all disposables
  context.subscriptions.push(
    formatProvider,
    hoverProvider,
    previewMermaidCommand,
    extractTypeInfoCommand,
    diagnosticCollection,
    changeHandler,
    openHandler
  )

  // Initial diagnostics for open documents
  vscode.workspace.textDocuments.forEach(updateDiagnostics)
}

export function deactivate() {
  if (mermaidPreviewPanel) {
    mermaidPreviewPanel.dispose()
  }
}

/**
 * Generate HTML for mermaid preview
 */
function getMermaidPreviewHtml(
  diagrams: ExtractedMermaidDiagram[]
): string {
  const diagramsHtml = diagrams
    .map(
      (d, i) => `
    <div class="diagram">
      <h3>Diagram ${i + 1} (${d.ast.type})</h3>
      <div class="mermaid">
${d.source}
      </div>
    </div>
  `
    )
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mermaid Preview</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    .diagram {
      margin-bottom: 40px;
      padding: 20px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
    }
    h3 {
      margin-top: 0;
      color: var(--vscode-textLink-foreground);
    }
    .mermaid {
      text-align: center;
    }
  </style>
</head>
<body>
  <h2>Mermaid Diagrams</h2>
  ${diagramsHtml}
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default'
    });
  </script>
</body>
</html>`
}
