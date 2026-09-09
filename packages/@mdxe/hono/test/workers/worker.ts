/**
 * Test worker: a Hono app serving one MDXLD document through the format
 * middleware — exactly the shape a deployed Worker takes — so the suite
 * fetches it via `SELF` and checks the text-register headers as workerd
 * emits them.
 */
import { Hono } from 'hono'
import { parse } from 'mdxld'
import { formatMiddleware, formatResponse } from '../../src/format.js'

export const source = `---
$type: BlogPost
title: Hello from workerd
description: The text registers on the HTTP face
---

# Hello from workerd

This is **bold** and *italic*.

- one
- two
`

export const doc = parse(source)

const app = new Hono()
app.use('*', formatMiddleware())
app.get('/doc', (c) => formatResponse(c, doc))

export default app
