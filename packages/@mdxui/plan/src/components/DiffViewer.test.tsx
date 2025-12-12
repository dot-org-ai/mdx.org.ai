import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiffViewer } from './DiffViewer'

describe('DiffViewer', () => {
  it('renders diff lines correctly', () => {
    const diff = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 const x = 1
-const y = 2
+const y = 3
 const z = 4`

    const { container } = render(<DiffViewer diff={diff} />)

    // Check that the text content is present (whitespace-agnostic)
    expect(container.textContent).toContain('const x = 1')
    expect(container.textContent).toContain('const y = 2')
    expect(container.textContent).toContain('const y = 3')
    expect(container.textContent).toContain('const z = 4')
  })

  it('added lines have green background', () => {
    const diff = `+const added = true`
    const { container } = render(<DiffViewer diff={diff} />)

    const addedLine = container.querySelector('.bg-green-900\\/30')
    expect(addedLine).toBeInTheDocument()
    expect(addedLine).toHaveClass('text-green-300')
  })

  it('removed lines have red background', () => {
    const diff = `-const removed = false`
    const { container } = render(<DiffViewer diff={diff} />)

    const removedLine = container.querySelector('.bg-red-900\\/30')
    expect(removedLine).toBeInTheDocument()
    expect(removedLine).toHaveClass('text-red-300')
  })

  it('context lines have no special background', () => {
    const diff = ` const context = true`
    const { container } = render(<DiffViewer diff={diff} />)

    // Context lines should have text-gray-400 but not green/red backgrounds
    const contextLine = container.querySelector('.text-gray-400')
    expect(contextLine).toBeInTheDocument()
    expect(contextLine).not.toHaveClass('bg-green-900/30')
    expect(contextLine).not.toHaveClass('bg-red-900/30')
  })

  it('hunk headers have blue background', () => {
    const diff = `@@ -1,5 +1,6 @@`
    const { container } = render(<DiffViewer diff={diff} />)

    const hunkHeader = container.querySelector('.bg-blue-900\\/30')
    expect(hunkHeader).toBeInTheDocument()
    expect(hunkHeader).toHaveClass('text-blue-300')
    expect(hunkHeader).toHaveClass('font-semibold')
  })

  it('does not treat --- header as removed line', () => {
    const diff = `--- a/file.ts
-actual removed`
    const { container } = render(<DiffViewer diff={diff} />)

    // --- should NOT have red background (it's a header)
    const lines = container.querySelectorAll('.bg-red-900\\/30')
    expect(lines.length).toBe(1) // Only the actual removed line
  })

  it('does not treat +++ header as added line', () => {
    const diff = `+++ b/file.ts
+actual added`
    const { container } = render(<DiffViewer diff={diff} />)

    // +++ should NOT have green background (it's a header)
    const lines = container.querySelectorAll('.bg-green-900\\/30')
    expect(lines.length).toBe(1) // Only the actual added line
  })

  it('renders "Diff" header', () => {
    render(<DiffViewer diff="+ added line" />)
    expect(screen.getByText('Diff')).toBeInTheDocument()
  })

  it('handles empty lines', () => {
    const diff = `+const a = 1

+const b = 2`
    render(<DiffViewer diff={diff} />)

    // Lines include their prefix
    expect(screen.getByText('+const a = 1')).toBeInTheDocument()
    expect(screen.getByText('+const b = 2')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<DiffViewer diff="+line" className="custom-class" />)
    const diffViewer = container.querySelector('.diff-viewer')
    expect(diffViewer).toHaveClass('custom-class')
  })

  it('renders inside a dark themed container', () => {
    const { container } = render(<DiffViewer diff="+line" />)
    const darkContainer = container.querySelector('.bg-gray-900')
    expect(darkContainer).toBeInTheDocument()
  })

  it('has proper header styling', () => {
    const { container } = render(<DiffViewer diff="+line" />)
    const header = container.querySelector('.bg-gray-800')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('border-b', 'border-gray-700')
  })

  it('handles multi-line diff correctly', () => {
    const diff = `--- a/test.ts
+++ b/test.ts
@@ -1,4 +1,5 @@
 import React from 'react'

-const Component = () => null
+const Component = () => {
+  return <div>Hello</div>
+}

 export default Component`

    const { container } = render(<DiffViewer diff={diff} />)

    // Check that the text content is present (whitespace-agnostic)
    expect(container.textContent).toContain("import React from 'react'")
    expect(container.textContent).toContain('const Component = () => null')
    expect(container.textContent).toContain('const Component = () => {')
    expect(container.textContent).toContain('return <div>Hello</div>')
    expect(container.textContent).toContain('export default Component')
  })

  it('uses monospace font for diff content', () => {
    const { container } = render(<DiffViewer diff="+code" />)
    const monoContainer = container.querySelector('.font-mono')
    expect(monoContainer).toBeInTheDocument()
  })

  it('has max height with overflow scroll', () => {
    const { container } = render(<DiffViewer diff="+line" />)
    const scrollContainer = container.querySelector('.max-h-96')
    expect(scrollContainer).toBeInTheDocument()
    expect(scrollContainer).toHaveClass('overflow-auto')
  })
})
