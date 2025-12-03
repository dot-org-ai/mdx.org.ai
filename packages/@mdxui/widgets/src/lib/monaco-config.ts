import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

// MDX language configuration
export function configureMDX(monaco: Monaco) {
  // Register MDX as a language
  monaco.languages.register({ id: 'mdx' })

  // Set up MDX tokenizer (extends markdown with JSX)
  monaco.languages.setMonarchTokensProvider('mdx', {
    defaultToken: '',
    tokenPostfix: '.mdx',
    tokenizer: {
      root: [
        // JSX tags
        [/<\/?[\w-]+/, 'tag'],
        // JSX expressions
        [/\{[^}]+\}/, 'variable'],
        // Frontmatter
        [/^---$/, 'meta'],
        // Headers
        [/^#{1,6}\s.*$/, 'keyword'],
        // Bold
        [/\*\*[^*]+\*\*/, 'strong'],
        // Italic
        [/\*[^*]+\*/, 'emphasis'],
        // Inline code
        [/`[^`]+`/, 'string'],
        // Code blocks
        [/^```\w*$/, 'string'],
        // Links
        [/\[[^\]]+\]\([^)]+\)/, 'string.link'],
        // Comments
        [/{\/\*[\s\S]*?\*\/}/, 'comment'],
      ],
    },
  })
}

// Custom dark theme matching shadcn neutral
export function defineEditorTheme(monaco: Monaco) {
  monaco.editor.defineTheme('editor-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'tag', foreground: '93c5fd' }, // blue-300
      { token: 'variable', foreground: 'fcd34d' }, // yellow-300
      { token: 'keyword', foreground: 'f9fafb' }, // gray-50
      { token: 'string', foreground: 'a5b4fc' }, // indigo-300
      { token: 'strong', foreground: 'f9fafb', fontStyle: 'bold' },
      { token: 'emphasis', foreground: 'f9fafb', fontStyle: 'italic' },
      { token: 'meta', foreground: '737373' }, // neutral-500
      { token: 'comment', foreground: '525252' }, // neutral-600
      { token: 'string.link', foreground: '60a5fa' }, // blue-400
    ],
    colors: {
      'editor.background': '#171717', // neutral-900
      'editor.foreground': '#fafafa', // neutral-50
      'editor.lineHighlightBackground': '#26262680', // neutral-800 with alpha
      'editor.selectionBackground': '#3b82f620', // blue-500/20
      'editorLineNumber.foreground': '#737373', // neutral-500
      'editorLineNumber.activeForeground': '#a3a3a3', // neutral-400
      'editorGutter.background': '#171717', // neutral-900
      'editorCursor.foreground': '#fafafa', // neutral-50
      'editor.inactiveSelectionBackground': '#3b82f610',
      'editorIndentGuide.background': '#26262680',
      'editorIndentGuide.activeBackground': '#404040',
      'editorWidget.background': '#262626', // neutral-800
      'editorWidget.border': '#404040', // neutral-700
      'editorSuggestWidget.background': '#262626',
      'editorSuggestWidget.border': '#404040',
      'editorSuggestWidget.selectedBackground': '#3b82f620',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#52525280',
      'scrollbarSlider.hoverBackground': '#525252',
      'scrollbarSlider.activeBackground': '#737373',
    },
  })
}

// Default editor options
export const editorOptions: editor.IStandaloneEditorConstructionOptions = {
  fontFamily: 'Berkeley Mono, JetBrains Mono, Menlo, Monaco, monospace',
  fontSize: 14,
  lineHeight: 1.6,
  fontLigatures: true,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'on',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  renderLineHighlight: 'line',
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  lineNumbers: 'on',
  glyphMargin: false,
  folding: true,
  padding: { top: 16, bottom: 16 },
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  renderWhitespace: 'none',
  guides: {
    indentation: true,
    bracketPairs: false,
  },
  bracketPairColorization: {
    enabled: false,
  },
}
