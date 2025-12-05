import * as React from 'react'

export interface ThingsEntity {
  name: string
  href: string
  description: string
  icon?: string
  propertyCount?: number
  relationshipCount?: number
}

export interface ThingsCategory {
  name: string
  description?: string
  entities: ThingsEntity[]
}

export interface ThingsProps {
  title: string
  description?: string
  categories: ThingsCategory[]
}

/**
 * Directory/card list view displaying multiple ontology entities.
 * Renders categories with entity cards showing name, description, and counts.
 */
export function Things({ title, description, categories }: ThingsProps) {
  return (
    <>
      <h1>{title}</h1>
      {description && <p>{description}</p>}

      {categories.map((category, i) => (
        <section key={i}>
          <h2 id={category.name.toLowerCase().replace(/\s+/g, '-')}>
            {category.name}
          </h2>
          {category.description && <p>{category.description}</p>}

          <div>
            {category.entities.map((entity, j) => (
              <article key={j}>
                <a href={entity.href}>
                  {entity.icon && <span>{entity.icon}</span>}
                  <header>
                    <h3>{entity.name}</h3>
                    <p>{entity.description}</p>
                  </header>
                  <footer>
                    {entity.propertyCount !== undefined && (
                      <data value={entity.propertyCount}>
                        {entity.propertyCount} properties
                      </data>
                    )}
                    {entity.relationshipCount !== undefined && (
                      <data value={entity.relationshipCount}>
                        {entity.relationshipCount} relationships
                      </data>
                    )}
                  </footer>
                </a>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
