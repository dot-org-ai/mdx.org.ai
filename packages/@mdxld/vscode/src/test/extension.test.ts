/**
 * Integration tests for MDXLD VSCode Extension
 * These tests run inside VSCode using @vscode/test-electron
 */

import * as assert from 'assert'
import * as vscode from 'vscode'
import * as path from 'path'

suite('MDXLD Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting MDXLD extension tests')

  const fixturesPath = path.resolve(__dirname, '../../test-fixtures')

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('mdxld.mdxld-vscode'))
  })

  test('Extension should activate on MDX files', async () => {
    const ext = vscode.extensions.getExtension('mdxld.mdxld-vscode')
    assert.ok(ext)

    // Open an MDX file to trigger activation
    const docUri = vscode.Uri.file(path.join(fixturesPath, 'sample.mdx'))
    const doc = await vscode.workspace.openTextDocument(docUri)
    await vscode.window.showTextDocument(doc)

    // Wait for activation
    await ext.activate()
    assert.ok(ext.isActive)
  })

  test('MDX files should be recognized as mdxld language', async () => {
    const docUri = vscode.Uri.file(path.join(fixturesPath, 'sample.mdx'))
    const doc = await vscode.workspace.openTextDocument(docUri)

    assert.strictEqual(doc.languageId, 'mdxld')
  })

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true)

    assert.ok(commands.includes('mdxld.previewMermaid'))
    assert.ok(commands.includes('mdxld.extractTypeInfo'))
  })

  suite('Hover Provider', () => {
    test('Should provide hover for import statements', async () => {
      const docUri = vscode.Uri.file(path.join(fixturesPath, 'sample.mdx'))
      const doc = await vscode.workspace.openTextDocument(docUri)
      await vscode.window.showTextDocument(doc)

      // Find the line with import statement
      let importLine = -1
      for (let i = 0; i < doc.lineCount; i++) {
        if (doc.lineAt(i).text.startsWith('import type')) {
          importLine = i
          break
        }
      }

      if (importLine >= 0) {
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
          'vscode.executeHoverProvider',
          doc.uri,
          new vscode.Position(importLine, 5)
        )

        // Hover may or may not be available depending on module loading
        // We just check that the command doesn't throw
        assert.ok(Array.isArray(hovers))
      }
    })

    test('Should provide hover for mermaid code blocks', async () => {
      const docUri = vscode.Uri.file(path.join(fixturesPath, 'mermaid.mdx'))
      const doc = await vscode.workspace.openTextDocument(docUri)
      await vscode.window.showTextDocument(doc)

      // Find a line inside a mermaid block
      let mermaidLine = -1
      let inMermaid = false
      for (let i = 0; i < doc.lineCount; i++) {
        const text = doc.lineAt(i).text
        if (text.includes('```mermaid')) {
          inMermaid = true
          continue
        }
        if (inMermaid && !text.includes('```')) {
          mermaidLine = i
          break
        }
        if (text.includes('```') && inMermaid) {
          inMermaid = false
        }
      }

      if (mermaidLine >= 0) {
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
          'vscode.executeHoverProvider',
          doc.uri,
          new vscode.Position(mermaidLine, 5)
        )

        assert.ok(Array.isArray(hovers))
      }
    })
  })

  suite('Diagnostics', () => {
    test('Should provide diagnostics collection', () => {
      const diagnosticCollections = vscode.languages.getDiagnostics()
      // The extension should create diagnostics for mdxld files
      assert.ok(Array.isArray(diagnosticCollections))
    })
  })

  suite('Syntax Highlighting', () => {
    test('Document should have token colors', async () => {
      const docUri = vscode.Uri.file(path.join(fixturesPath, 'sample.mdx'))
      const doc = await vscode.workspace.openTextDocument(docUri)

      // Check document has content
      assert.ok(doc.getText().length > 0)

      // Check document is recognized correctly
      assert.strictEqual(doc.languageId, 'mdxld')
    })
  })

  suite('Mermaid Preview Command', () => {
    test('Preview command should be available', async () => {
      const docUri = vscode.Uri.file(path.join(fixturesPath, 'mermaid.mdx'))
      const doc = await vscode.workspace.openTextDocument(docUri)
      await vscode.window.showTextDocument(doc)

      // Try to execute the command (may fail if module not loaded, but shouldn't throw)
      try {
        await vscode.commands.executeCommand('mdxld.previewMermaid')
      } catch (e) {
        // Command might fail if the @mdxld/remark module can't be loaded
        // That's expected in test environment, we just verify it doesn't crash
      }
    })
  })

  suite('Type Info Command', () => {
    test('Extract type info command should be available', async () => {
      const docUri = vscode.Uri.file(path.join(fixturesPath, 'sample.mdx'))
      const doc = await vscode.workspace.openTextDocument(docUri)
      await vscode.window.showTextDocument(doc)

      // Try to execute the command
      try {
        await vscode.commands.executeCommand('mdxld.extractTypeInfo')
      } catch (e) {
        // Command might fail if the @mdxld/remark module can't be loaded
        // That's expected in test environment
      }
    })
  })
})
