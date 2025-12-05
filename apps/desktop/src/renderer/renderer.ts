/**
 * Renderer process for MDX Desktop
 */

// Type declarations for exposed APIs
declare global {
  interface Window {
    mdx: {
      parse: (content: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
      toAst: (content: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    }
    app: {
      platform: string
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}

const editor = document.getElementById('editor') as HTMLTextAreaElement
const status = document.getElementById('status') as HTMLDivElement
const previewTitle = document.getElementById('preview-title') as HTMLHeadingElement
const previewDescription = document.getElementById('preview-description') as HTMLParagraphElement
const previewContent = document.getElementById('preview-content') as HTMLDivElement

let debounceTimer: number | null = null

async function updatePreview() {
  const content = editor.value

  try {
    status.textContent = 'Parsing...'
    const result = await window.mdx.parse(content)

    if (result.success && result.data) {
      const doc = result.data as { data: Record<string, unknown>; content: string }

      previewTitle.textContent = (doc.data.title as string) || 'Untitled'
      previewDescription.textContent = (doc.data.description as string) || ''
      previewContent.textContent = doc.content

      status.textContent = `Parsed successfully | Node ${window.app.versions.node} | Electron ${window.app.versions.electron}`
    } else {
      status.textContent = `Error: ${result.error}`
    }
  } catch (error) {
    status.textContent = `Error: ${error}`
  }
}

// Debounced update on input
editor.addEventListener('input', () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = window.setTimeout(updatePreview, 150)
})

// Initial parse
updatePreview()

// Log app info
console.log('MDX Desktop running on:', window.app.platform)
console.log('Versions:', window.app.versions)
