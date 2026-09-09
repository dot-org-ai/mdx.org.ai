import type {
  DurableObjectIdLike,
  DORelationship,
  MDXDatabaseStubLike,
} from '../../src/providers/do.js'

/** The provider's structural stub plus the extra RPCs the tests inspect. */
export interface TestStub extends MDXDatabaseStubLike {
  relationships(url: string, options?: { predicate?: string; reverse?: string }): Promise<DORelationship[]>
}

export interface TestNamespace {
  idFromName(name: string): DurableObjectIdLike
  get(id: DurableObjectIdLike): TestStub
}

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    MDXDB: TestNamespace
    DATABASE_URL: string
  }
}

