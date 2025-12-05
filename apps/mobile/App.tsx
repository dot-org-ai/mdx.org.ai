import { StatusBar } from 'expo-status-bar'
import { ScrollView, StyleSheet, View, Text } from 'react-native'
import { parse } from 'mdxld'

// Example MDX content
const mdxContent = `---
title: Welcome to MDX Mobile
description: Render MDX content in React Native
author: MDX Team
---

# Hello MDX on Mobile!

This is a **demo** of rendering MDX content in React Native using the \`@mdxe/expo\` package.

## Features

- Parse YAML frontmatter
- Convert to AST
- Render with native components

## Code Example

\`\`\`typescript
import { parse } from 'mdxld'
const doc = parse(content)
\`\`\`

> MDX brings the power of components to Markdown.

### Try it out!

1. Edit this content
2. See it update live
3. Build amazing apps
`

// Simple AST-based renderer
function MDXRenderer({ content }: { content: string }) {
  const doc = parse(content)

  return (
    <View style={styles.content}>
      {/* Frontmatter */}
      <View style={styles.frontmatter}>
        <Text style={styles.title}>{doc.data.title as string}</Text>
        <Text style={styles.description}>{doc.data.description as string}</Text>
        <Text style={styles.author}>By {doc.data.author as string}</Text>
      </View>

      {/* Content preview */}
      <View style={styles.markdown}>
        <Text style={styles.markdownText}>{doc.content}</Text>
      </View>
    </View>
  )
}

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <MDXRenderer content={mdxContent} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  content: {
    gap: 20,
  },
  frontmatter: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 16,
    color: '#666',
  },
  author: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  markdown: {
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  markdownText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
})
