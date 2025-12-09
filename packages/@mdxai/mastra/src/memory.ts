/**
 * @mdxai/mastra Memory
 *
 * Memory management for Mastra agents
 *
 * @packageDocumentation
 */

import type { Database } from '@mdxdb/fs'
import type { MDXLDData } from 'mdxld'
import type { MastraMemoryConfig } from './types.js'

/**
 * Conversation memory entry
 */
export interface ConversationEntry {
  /** Entry ID */
  id: string
  /** Thread ID */
  threadId: string
  /** Message role */
  role: 'user' | 'assistant' | 'system'
  /** Message content */
  content: string
  /** Timestamp */
  timestamp: string
  /** Metadata */
  metadata?: Record<string, unknown>
}

/**
 * Vector memory entry
 */
export interface VectorEntry {
  /** Entry ID */
  id: string
  /** Content */
  content: string
  /** Embedding vector */
  embedding?: number[]
  /** Metadata */
  metadata?: Record<string, unknown>
  /** Timestamp */
  timestamp: string
}

/**
 * Create a memory backend for Mastra agents
 *
 * Provides conversation history and semantic memory using MDXDB.
 *
 * @example
 * ```ts
 * import { createMastraMemory } from '@mdxai/mastra'
 * import { createFsDatabase } from '@mdxdb/fs'
 *
 * const db = createFsDatabase({ root: './memory' })
 * const memory = createMastraMemory({
 *   type: 'both',
 *   database: db,
 *   collection: 'agent-memory',
 * })
 *
 * // Store conversation
 * await memory.addConversation({
 *   threadId: 'thread-1',
 *   role: 'user',
 *   content: 'Hello!',
 * })
 *
 * // Retrieve conversation history
 * const history = await memory.getConversation('thread-1')
 *
 * // Store in vector memory
 * await memory.addVector({
 *   content: 'Important fact to remember',
 *   metadata: { category: 'fact' },
 * })
 *
 * // Search vector memory
 * const results = await memory.searchVector('fact about...')
 * ```
 */
export function createMastraMemory(config: MastraMemoryConfig) {
  const { type, database, collection = 'memory' } = config

  /**
   * Add a conversation entry
   */
  async function addConversation(entry: Omit<ConversationEntry, 'id' | 'timestamp'>): Promise<string> {
    if (!database) {
      throw new Error('Database is required for conversation memory')
    }

    const id = `${collection}/conversations/${entry.threadId}/${Date.now()}`
    const conversationEntry: ConversationEntry = {
      id,
      ...entry,
      timestamp: new Date().toISOString(),
    }

    await database.set(id, {
      type: 'ConversationEntry',
      data: conversationEntry as unknown as MDXLDData,
      content: entry.content,
    })

    return id
  }

  /**
   * Get conversation history
   */
  async function getConversation(threadId: string, limit = 100): Promise<ConversationEntry[]> {
    if (!database) {
      throw new Error('Database is required for conversation memory')
    }

    const result = await database.list({
      prefix: `${collection}/conversations/${threadId}`,
      limit,
    })

    return result.documents.map((doc) => doc.data as unknown as ConversationEntry)
  }

  /**
   * Clear conversation history
   */
  async function clearConversation(threadId: string): Promise<void> {
    if (!database) {
      throw new Error('Database is required for conversation memory')
    }

    const entries = await getConversation(threadId)
    await Promise.all(entries.map((entry) => database.delete(entry.id)))
  }

  /**
   * Add a vector memory entry
   */
  async function addVector(entry: Omit<VectorEntry, 'id' | 'timestamp' | 'embedding'>): Promise<string> {
    if (!database) {
      throw new Error('Database is required for vector memory')
    }

    const id = `${collection}/vectors/${Date.now()}-${Math.random().toString(36).slice(2)}`

    // In real implementation, would generate embeddings using an embedding model
    // For now, store without embeddings
    const vectorEntry: VectorEntry = {
      id,
      ...entry,
      timestamp: new Date().toISOString(),
    }

    await database.set(id, {
      type: 'VectorEntry',
      data: vectorEntry as unknown as MDXLDData,
      content: entry.content,
    })

    return id
  }

  /**
   * Search vector memory
   */
  async function searchVector(query: string, limit = 10): Promise<VectorEntry[]> {
    if (!database) {
      throw new Error('Database is required for vector memory')
    }

    // In real implementation, would use semantic search with embeddings
    // For now, use text search
    const result = await database.search({
      query,
      limit,
      type: 'VectorEntry',
    })

    return result.documents.map((doc) => doc.data as unknown as VectorEntry)
  }

  /**
   * Clear vector memory
   */
  async function clearVector(): Promise<void> {
    if (!database) {
      throw new Error('Database is required for vector memory')
    }

    const result = await database.list({
      prefix: `${collection}/vectors`,
      limit: 1000,
    })

    await Promise.all(result.documents.map((doc) => database.delete(doc.id ?? doc.data.$id as string)))
  }

  return {
    // Conversation memory
    addConversation: type === 'conversation' || type === 'both' ? addConversation : undefined,
    getConversation: type === 'conversation' || type === 'both' ? getConversation : undefined,
    clearConversation: type === 'conversation' || type === 'both' ? clearConversation : undefined,

    // Vector memory
    addVector: type === 'vector' || type === 'both' ? addVector : undefined,
    searchVector: type === 'vector' || type === 'both' ? searchVector : undefined,
    clearVector: type === 'vector' || type === 'both' ? clearVector : undefined,
  }
}

/**
 * Memory backend type
 */
export type MastraMemory = ReturnType<typeof createMastraMemory>
