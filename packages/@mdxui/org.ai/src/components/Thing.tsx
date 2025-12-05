import * as React from 'react'

export interface ThingProperty {
  name: string
  type: string
  description: string
}

export interface ThingRelationship {
  name: string
  target: string
  description: string
}

export interface ThingSearch {
  name: string
  parameters: string
  description: string
}

export interface ThingAction {
  name: string
  object: string
  result: string
  description: string
}

export interface ThingEvent {
  name: string
  description: string
}

export interface ThingProps {
  name: string
  description: string
  properties?: ThingProperty[]
  relationships?: ThingRelationship[]
  searches?: ThingSearch[]
  actions?: ThingAction[]
  events?: ThingEvent[]
}

/**
 * Detail view for a single ontology entity using semantic HTML.
 * Renders properties, relationships, searches, actions, and events in tables.
 */
export function Thing({
  name,
  description,
  properties,
  relationships,
  searches,
  actions,
  events,
}: ThingProps) {
  return (
    <>
      <h1>{name}</h1>
      <p>{description}</p>

      {properties && properties.length > 0 && (
        <section aria-labelledby="properties">
          <h2 id="properties">Properties</h2>
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((prop, i) => (
                <tr key={i}>
                  <td>{prop.name}</td>
                  <td>{prop.type}</td>
                  <td>{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {relationships && relationships.length > 0 && (
        <section aria-labelledby="relationships">
          <h2 id="relationships">Relationships</h2>
          <table>
            <thead>
              <tr>
                <th>Relationship</th>
                <th>Target Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((rel, i) => (
                <tr key={i}>
                  <td>{rel.name}</td>
                  <td>{rel.target}</td>
                  <td>{rel.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {searches && searches.length > 0 && (
        <section aria-labelledby="searches">
          <h2 id="searches">Searches</h2>
          <table>
            <thead>
              <tr>
                <th>Search</th>
                <th>Parameters</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {searches.map((search, i) => (
                <tr key={i}>
                  <td>{search.name}</td>
                  <td>{search.parameters}</td>
                  <td>{search.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {actions && actions.length > 0 && (
        <section aria-labelledby="actions">
          <h2 id="actions">Actions</h2>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Object</th>
                <th>Result</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action, i) => (
                <tr key={i}>
                  <td>{action.name}</td>
                  <td>{action.object}</td>
                  <td>{action.result}</td>
                  <td>{action.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {events && events.length > 0 && (
        <section aria-labelledby="events">
          <h2 id="events">Events</h2>
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr key={i}>
                  <td>{event.name}</td>
                  <td>{event.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
