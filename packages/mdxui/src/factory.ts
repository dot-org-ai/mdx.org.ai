/**
 * Component Factory
 *
 * Creates typed component implementations for any JSX runtime.
 * This allows the same component abstractions to work with React, Ink, Hono JSX, Slack JSX, etc.
 *
 * @packageDocumentation
 */

import type { ComponentName, ComponentProps } from './types.js'
import type { ComponentPropsMap, ComponentMeta } from './registry.js'
import { componentRegistry, getComponentMeta } from './registry.js'

/**
 * Generic JSX element type
 */
export type JSXElement = unknown

/**
 * Generic JSX factory function signature
 *
 * Compatible with:
 * - React.createElement
 * - Ink's createElement
 * - Hono's jsx
 * - Preact.h
 * - etc.
 */
export type JSXFactory = (
  type: string | ((props: Record<string, unknown>) => JSXElement),
  props?: Record<string, unknown> | null,
  ...children: unknown[]
) => JSXElement

/**
 * Component renderer function type
 *
 * Takes component props and returns a JSX element
 */
export type ComponentRenderer<Props> = (props: Props, jsx: JSXFactory, meta: ComponentMeta) => JSXElement

/**
 * A single component implementation
 */
export type Component<Props> = (props: Props) => JSXElement

/**
 * Full component set for a JSX runtime
 */
export type Components = {
  [K in ComponentName]: Component<ComponentPropsMap[K]>
}

/**
 * Partial component implementations
 * Renderers for specific components that override defaults
 */
export type ComponentRenderers = {
  [K in ComponentName]?: ComponentRenderer<ComponentPropsMap[K]>
}

/**
 * Options for createComponents factory
 */
export interface CreateComponentsOptions {
  /**
   * Custom component renderers
   * Override default rendering for specific components
   */
  renderers?: ComponentRenderers

  /**
   * Default element for components without renderers
   * @default 'div'
   */
  defaultElement?: string

  /**
   * Whether to pass all props to the rendered element
   * @default true
   */
  passAllProps?: boolean

  /**
   * Transform props before rendering
   */
  transformProps?: <Props>(name: ComponentName, props: Props) => Record<string, unknown>
}

/**
 * Default renderer that creates a semantic element with props
 */
function defaultRenderer<Props extends Record<string, unknown>>(
  props: Props,
  jsx: JSXFactory,
  meta: ComponentMeta,
  options: CreateComponentsOptions
): JSXElement {
  const element = meta.semanticElement || options.defaultElement || 'div'
  const { children, ...rest } = props

  const elementProps: Record<string, unknown> = {
    'data-component': meta.name,
    ...(meta.a11y?.role ? { role: meta.a11y.role } : {}),
    ...(options.passAllProps !== false ? rest : {}),
  }

  if (meta.hasChildren && children !== undefined) {
    return jsx(element, elementProps, children)
  }

  return jsx(element, elementProps)
}

/**
 * Create a complete set of typed components for a JSX runtime
 *
 * @param jsx - JSX factory function (React.createElement, h, etc.)
 * @param options - Configuration options
 * @returns Object with all component implementations
 *
 * @example React
 * ```tsx
 * import React from 'react'
 * import { createComponents } from 'mdxui'
 *
 * const components = createComponents(React.createElement, {
 *   renderers: {
 *     Hero: (props, jsx) => jsx('header', { className: 'hero' },
 *       jsx('h1', null, props.title),
 *       props.subtitle && jsx('p', null, props.subtitle)
 *     )
 *   }
 * })
 *
 * // Use in MDX
 * <components.Hero title="Welcome" subtitle="Hello world" />
 * ```
 *
 * @example Hono JSX
 * ```tsx
 * import { jsx } from 'hono/jsx'
 * import { createComponents } from 'mdxui'
 *
 * const components = createComponents(jsx)
 * ```
 *
 * @example Ink (CLI)
 * ```tsx
 * import React from 'react'
 * import { createComponents } from 'mdxui'
 * import { Box, Text } from 'ink'
 *
 * const components = createComponents(React.createElement, {
 *   renderers: {
 *     Hero: (props, jsx) => jsx(Box, { flexDirection: 'column' },
 *       jsx(Text, { bold: true, color: 'cyan' }, props.title),
 *       props.subtitle && jsx(Text, { color: 'gray' }, props.subtitle)
 *     )
 *   }
 * })
 * ```
 */
export function createComponents(jsx: JSXFactory, options: CreateComponentsOptions = {}): Components {
  const components = {} as Components
  const names = Object.keys(componentRegistry) as ComponentName[]

  for (const name of names) {
    const meta = getComponentMeta(name)
    const customRenderer = options.renderers?.[name]

    // Create the component function
    components[name] = ((props: Record<string, unknown>) => {
      // Apply prop transformation if provided
      const transformedProps = options.transformProps
        ? options.transformProps(name, props)
        : props

      // Use custom renderer if provided
      if (customRenderer) {
        return (customRenderer as ComponentRenderer<Record<string, unknown>>)(transformedProps, jsx, meta)
      }

      // Use default renderer
      return defaultRenderer(transformedProps, jsx, meta, options)
    }) as Component<ComponentPropsMap[typeof name]>
  }

  return components
}

/**
 * Create a single component for a JSX runtime
 *
 * @param name - Component name
 * @param jsx - JSX factory function
 * @param renderer - Optional custom renderer
 * @returns Component function
 *
 * @example
 * ```tsx
 * import React from 'react'
 * import { createComponent } from 'mdxui'
 *
 * const Hero = createComponent('Hero', React.createElement, (props, jsx) =>
 *   jsx('header', { className: 'hero' },
 *     jsx('h1', null, props.title)
 *   )
 * )
 * ```
 */
export function createComponent<N extends ComponentName>(
  name: N,
  jsx: JSXFactory,
  renderer?: ComponentRenderer<ComponentPropsMap[N]>
): Component<ComponentPropsMap[N]> {
  const meta = getComponentMeta(name)

  return (props: ComponentPropsMap[N]) => {
    if (renderer) {
      return renderer(props, jsx, meta)
    }
    return defaultRenderer(
      props as unknown as Record<string, unknown>,
      jsx,
      meta,
      {}
    )
  }
}

/**
 * Stub components that throw when used
 * Useful for detecting missing implementations
 */
export function createStubComponents(): Components {
  const components = {} as Components
  const names = Object.keys(componentRegistry) as ComponentName[]

  for (const name of names) {
    components[name] = ((_props: ComponentProps) => {
      throw new Error(
        `Component "${name}" is not implemented. ` +
        `Use createComponents() with a JSX factory to create implementations.`
      )
    }) as Component<ComponentPropsMap[typeof name]>
  }

  return components
}

/**
 * Create components with validation
 * Validates required props at runtime
 */
export function createValidatedComponents(
  jsx: JSXFactory,
  options: CreateComponentsOptions = {}
): Components {
  const baseComponents = createComponents(jsx, options)
  const validatedComponents = {} as Components
  const names = Object.keys(componentRegistry) as ComponentName[]

  for (const name of names) {
    const meta = getComponentMeta(name)
    const baseComponent = baseComponents[name]

    validatedComponents[name] = ((props: Record<string, unknown>) => {
      // Check required props
      for (const requiredProp of meta.requiredProps) {
        if (props[requiredProp] === undefined) {
          console.warn(
            `Component "${name}" is missing required prop "${requiredProp}"`
          )
        }
      }

      return (baseComponent as Component<Record<string, unknown>>)(props)
    }) as Component<ComponentPropsMap[typeof name]>
  }

  return validatedComponents
}

/**
 * Merge multiple component sets
 * Later sets override earlier ones
 */
export function mergeComponents(...componentSets: Partial<Components>[]): Partial<Components> {
  return Object.assign({}, ...componentSets)
}

/**
 * Pick specific components from a set
 */
export function pickComponents<K extends ComponentName>(
  components: Components,
  names: K[]
): Pick<Components, K> {
  const picked = {} as Pick<Components, K>
  for (const name of names) {
    picked[name] = components[name]
  }
  return picked
}

/**
 * Omit specific components from a set
 */
export function omitComponents<K extends ComponentName>(
  components: Components,
  names: K[]
): Omit<Components, K> {
  const omitted = { ...components }
  for (const name of names) {
    delete (omitted as Record<string, unknown>)[name]
  }
  return omitted as Omit<Components, K>
}
