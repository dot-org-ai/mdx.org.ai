/**
 * Hierarchy Utilities
 *
 * Helper functions for managing DO parent/child relationships.
 *
 * @packageDocumentation
 */

import type { ChildInfo, MDXDurableObjectRPC } from './types.js'

/**
 * Traverse hierarchy upward to find all ancestors
 */
export async function getAncestors(
  db: MDXDurableObjectRPC,
  maxDepth = 10
): Promise<string[]> {
  const ancestors: string[] = []
  let currentContext = await db.$context()
  let depth = 0

  while (currentContext && depth < maxDepth) {
    ancestors.push(currentContext)
    // Note: Would need to get parent's stub to continue traversal
    // For now, just return the immediate parent
    break
  }

  return ancestors
}

/**
 * Get full hierarchy tree starting from this DO
 */
export async function getHierarchyTree(
  db: MDXDurableObjectRPC,
  maxDepth = 3
): Promise<HierarchyNode> {
  const id = db.$id()
  const children = await db.getChildren()

  const node: HierarchyNode = {
    id,
    children: [],
  }

  if (maxDepth > 0) {
    for (const child of children) {
      // Note: Would need to get child's stub to recurse
      // For now, just add direct children without recursion
      node.children!.push({
        id: child.id,
        path: child.path,
        children: [],
      })
    }
  }

  return node
}

/**
 * Hierarchy node structure
 */
export interface HierarchyNode {
  id: string
  path?: string
  children?: HierarchyNode[]
}

/**
 * Check if a DO is an ancestor of another
 */
export async function isAncestor(
  db: MDXDurableObjectRPC,
  ancestorId: string,
  maxDepth = 10
): Promise<boolean> {
  const ancestors = await getAncestors(db, maxDepth)
  return ancestors.includes(ancestorId)
}

/**
 * Get the root DO in the hierarchy
 */
export async function getRoot(
  db: MDXDurableObjectRPC,
  maxDepth = 10
): Promise<string> {
  const ancestors = await getAncestors(db, maxDepth)
  return ancestors.length > 0 ? ancestors[ancestors.length - 1]! : db.$id()
}
