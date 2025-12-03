/**
 * AI Workflows primitives integration
 *
 * Re-exports from ai-workflows package for convenient access via mdxld.
 * This is an optional integration - ai-workflows must be installed separately.
 *
 * @example
 * ```ts
 * import { Workflow, on, every } from 'mdxld/workflows'
 *
 * // Create a workflow with $ context
 * const workflow = Workflow($ => {
 *   $.on.Customer.created(async (customer, $) => {
 *     $.log('New customer:', customer.name)
 *     await $.send('Email.welcome', { to: customer.email })
 *   })
 *
 *   $.every.hour(async ($) => {
 *     $.log('Hourly check')
 *   })
 * })
 *
 * // Start the workflow
 * await workflow.start()
 *
 * // Emit events
 * await workflow.send('Customer.created', { name: 'John', email: 'john@example.com' })
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from ai-workflows
export * from 'ai-workflows'
