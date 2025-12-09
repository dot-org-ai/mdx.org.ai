import { createContext, useContext, useMemo, type ReactNode } from '../react'

/* -------------------------------------------------------------------------------------------------
 * createContext with scope
 * -----------------------------------------------------------------------------------------------*/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Scope<C = any> = { [scopeName: string]: React.Context<C>[] } | undefined

type ScopeHook = (scope: Scope) => { [__scopeProp: string]: Scope }

interface CreateScope {
  scopeName: string
  (): ScopeHook
}

/**
 * Creates a context with scope support.
 * This allows multiple instances of the same component to have their own context.
 *
 * @param scopeName - A unique name for the scope
 * @param createContextScopeDeps - Dependencies from other scopes
 */
function createContextScope(
  scopeName: string,
  createContextScopeDeps: CreateScope[] = []
) {
  let defaultContexts: unknown[] = []

  /* ------------------------------------------------------------------------------------------
   * createContext
   * ---------------------------------------------------------------------------------------- */

  function createScopedContext<ContextValueType extends object | null>(
    rootComponentName: string,
    defaultContext?: ContextValueType
  ) {
    const BaseContext = createContext<ContextValueType | undefined>(defaultContext)
    const index = defaultContexts.length
    defaultContexts = [...defaultContexts, defaultContext]

    function Provider(
      props: ContextValueType & { scope: Scope<ContextValueType>; children: ReactNode }
    ) {
      const { scope, children, ...context } = props
      const Context = scope?.[scopeName]?.[index] || BaseContext
      // We cast to ContextValueType because the check above ensures it exists
      const value = useMemo(
        () => context as ContextValueType,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        Object.values(context)
      )
      return <Context.Provider value={value}>{children}</Context.Provider>
    }

    function useContextValue(
      consumerName: string,
      scope: Scope<ContextValueType | undefined>
    ): ContextValueType {
      const Context = scope?.[scopeName]?.[index] || BaseContext
      const context = useContext(Context)

      if (context === undefined) {
        throw new Error(
          `\`${consumerName}\` must be used within \`${rootComponentName}\``
        )
      }

      return context
    }

    Provider.displayName = rootComponentName + 'Provider'

    return [Provider, useContextValue] as const
  }

  /* ------------------------------------------------------------------------------------------
   * createScope
   * ---------------------------------------------------------------------------------------- */

  const createScope: CreateScope = () => {
    const scopeContexts = defaultContexts.map((defaultContext) => {
      return createContext(defaultContext)
    })

    return function useScope(scope: Scope) {
      const contexts = scope?.[scopeName] || scopeContexts
      return useMemo(
        () => ({
          [`__scope${scopeName}`]: { ...scope, [scopeName]: contexts },
        }),
        [scope, contexts]
      )
    }
  }

  createScope.scopeName = scopeName

  return [
    createScopedContext,
    composeContextScopes(createScope, ...createContextScopeDeps),
  ] as const
}

/* -------------------------------------------------------------------------------------------------
 * composeContextScopes
 * -----------------------------------------------------------------------------------------------*/

function composeContextScopes(...scopes: CreateScope[]) {
  const baseScope = scopes[0]
  if (!baseScope) return undefined as unknown as CreateScope
  if (scopes.length === 1) return baseScope

  const createScope: CreateScope = () => {
    const scopeHooks = scopes.map((createScope) => ({
      useScope: createScope(),
      scopeName: createScope.scopeName,
    }))

    return function useComposedScopes(overrideScopes) {
      const nextScopes = scopeHooks.reduce(
        (nextScopes, { useScope, scopeName }) => {
          // We are calling a hook inside a callback which React warns against to avoid
          // having inconsistent order of hooks called. This is because we need to
          // call the scopes in the same order they were created. React doesn't know
          // how to handle this so we need to silence the warning.
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const scopeProps = useScope(overrideScopes)
          const currentScope = scopeProps[`__scope${scopeName}`]
          return { ...nextScopes, ...currentScope }
        },
        {}
      )

      return useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes])
    }
  }

  createScope.scopeName = baseScope.scopeName
  return createScope
}

export { createContextScope }
export type { CreateScope, Scope }
