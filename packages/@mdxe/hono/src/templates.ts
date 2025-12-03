/**
 * @mdxe/hono Templates
 *
 * Semantic HTML templates for MDXLD types following BuilderCSS conventions.
 * These templates are designed to work with any CSS theme.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument } from 'mdxld'

export interface TemplateContext {
  siteName: string
  siteUrl: string
  year: number
}

export interface StyleConfig {
  color?: string
  background?: string
  mode?: string
  font?: string
  radius?: string
}

export interface RenderOptions {
  toc?: string
  ctx: TemplateContext
  style?: StyleConfig
}

/**
 * Escape HTML entities
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Build CSS URL with query params
 */
function buildCssUrl(type: string, style?: StyleConfig): string {
  const params = new URLSearchParams()
  if (style?.color) params.set('color', style.color)
  if (style?.background) params.set('bg', style.background)
  if (style?.mode) params.set('mode', style.mode)
  if (style?.font) params.set('font', style.font)
  if (style?.radius) params.set('radius', style.radius)

  const query = params.toString()
  return `/styles/${type.toLowerCase()}.css${query ? '?' + query : ''}`
}

/**
 * Base HTML template shell
 */
function baseTemplate(
  body: string,
  opts: {
    title: string
    description: string
    type: string
    style?: StyleConfig
    head?: string
    ctx: TemplateContext
  }
): string {
  const { title, description, type, style, head = '', ctx } = opts
  const cssUrl = buildCssUrl(type, style)
  const modeAttr = style?.mode && style.mode !== 'auto' ? ` data-mode="${style.mode}"` : ''

  return `<!DOCTYPE html>
<html lang="en"${modeAttr}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${cssUrl}">
  ${head}
</head>
<body>
${body}
</body>
</html>`
}

/**
 * Standard header - semantic structure (body > header > nav)
 */
function renderHeader(ctx: TemplateContext, nav?: string[]): string {
  const navItems = nav || ['Docs', 'Blog']
  return `
  <header>
    <nav>
      <a href="/"><strong>${escapeHtml(ctx.siteName)}</strong></a>
      <ul>
        ${navItems.map(item => `<li><a href="/${item.toLowerCase()}">${item}</a></li>`).join('\n        ')}
        <li><a href="/llms.txt">LLMs</a></li>
      </ul>
    </nav>
  </header>`
}

/**
 * Standard footer - semantic structure (body > footer)
 */
function renderFooter(ctx: TemplateContext): string {
  return `
  <footer>
    <p><small>&copy; ${ctx.year} ${escapeHtml(ctx.siteName)}. Powered by MDXE.</small></p>
  </footer>`
}

/**
 * Render Website type (default)
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > article: main content
 * - body > main > aside: optional TOC
 * - body > footer: site footer
 */
export function renderWebsite(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || opts.ctx.siteName
  const description = (doc.data.description as string) || ''

  const body = `
${renderHeader(opts.ctx)}
  <main>
    <article>
      ${content}
    </article>
    ${opts.toc ? `<aside><nav aria-label="On this page">${opts.toc}</nav></aside>` : ''}
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'Website',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render LandingPage type
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > section (first): hero section
 * - body > main > section (subsequent): content sections
 * - body > footer: site footer
 */
export function renderLandingPage(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || opts.ctx.siteName
  const description = (doc.data.description as string) || ''
  const tagline = (doc.data.tagline as string) || ''
  const headline = (doc.data.headline as string) || title
  const cta = (doc.data.cta as string) || 'Get Started'

  const body = `
${renderHeader(opts.ctx)}
  <main>
    <section>
      ${tagline ? `<small>${escapeHtml(tagline)}</small>` : ''}
      <h1>${escapeHtml(headline)}</h1>
      <p>${escapeHtml(description)}</p>
      <form>
        <input type="email" placeholder="Enter your email" required>
        <button type="submit">${escapeHtml(cta)}</button>
      </form>
    </section>
    <section>
      ${content}
    </section>
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'LandingPage',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render Waitlist type
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > section: centered hero with signup form
 * - body > footer: site footer
 */
export function renderWaitlist(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || opts.ctx.siteName
  const description = (doc.data.description as string) || 'Be the first to know when we launch.'
  const tagline = (doc.data.tagline as string) || 'Coming Soon'
  const cta = (doc.data.cta as string) || 'Join Waitlist'
  const count = doc.data.count as number | undefined

  const body = `
${renderHeader(opts.ctx)}
  <main>
    <section>
      <small>${escapeHtml(tagline)}</small>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <form>
        <input type="email" placeholder="your@email.com" required>
        <button type="submit">${escapeHtml(cta)}</button>
      </form>
      ${count ? `<aside><small>Join ${count.toLocaleString()} others waiting</small></aside>` : ''}
      ${content}
    </section>
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'Waitlist',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render Blog type (list of posts)
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > header: blog title/description
 * - body > main > section > article[]: post list
 * - body > footer: site footer
 */
export function renderBlog(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Blog'
  const description = (doc.data.description as string) || ''

  const body = `
${renderHeader(opts.ctx)}
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </header>
    <section>
      ${content}
    </section>
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'Blog',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render BlogPost type
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > article > header: post metadata (date, title, author, tags)
 * - body > main > article > section: post content
 * - body > main > aside: optional TOC
 * - body > footer: site footer
 */
export function renderBlogPost(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Untitled'
  const description = (doc.data.description as string) || ''
  const date = doc.data.date as string
  const author = doc.data.author as string
  const tags = (doc.data.tags as string[]) || []

  const body = `
${renderHeader(opts.ctx)}
  <main>
    <article>
      <header>
        ${date ? `<time datetime="${date}">${new Date(date).toLocaleDateString()}</time>` : ''}
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
        ${author ? `<address>By ${escapeHtml(author)}</address>` : ''}
        ${tags.length ? `<aside>${tags.map(t => `<span>${escapeHtml(t)}</span>`).join('')}</aside>` : ''}
      </header>
      <section>
        ${content}
      </section>
    </article>
    ${opts.toc ? `<aside><nav aria-label="On this page">${opts.toc}</nav></aside>` : ''}
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'BlogPost',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render Docs type - Fumadocs-inspired three-column layout
 *
 * Semantic structure (no classes needed):
 * - body > header: site header with nav
 * - body > aside: left sidebar navigation
 * - body > main: content wrapper
 * - body > main > article: main content
 * - body > main > aside: right TOC
 * - body > footer: site footer
 */
export function renderDocs(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Documentation'
  const description = (doc.data.description as string) || ''
  const sidebar = doc.data.sidebar as string | undefined
  const prev = doc.data.prev as { title: string; href: string } | undefined
  const next = doc.data.next as { title: string; href: string } | undefined

  const body = `
  <header>
    <nav>
      <a href="/"><strong>${escapeHtml(opts.ctx.siteName)}</strong></a>
      <ul>
        <li><a href="/docs">Docs</a></li>
        <li><a href="/api">API</a></li>
        <li><a href="/llms.txt">LLMs</a></li>
      </ul>
    </nav>
  </header>
  <aside>
    <nav aria-label="Documentation">
      ${sidebar || opts.toc || '<p>No navigation</p>'}
    </nav>
  </aside>
  <main>
    <article>
      <header>
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
      </header>
      <section>
        ${content}
      </section>
      ${prev || next ? `
      <footer>
        ${prev ? `<a href="${prev.href}"><small>Previous</small><span>${escapeHtml(prev.title)}</span></a>` : '<span></span>'}
        ${next ? `<a href="${next.href}"><small>Next</small><span>${escapeHtml(next.title)}</span></a>` : '<span></span>'}
      </footer>` : ''}
    </article>
    <aside>
      <nav aria-label="On this page">
        <strong>On this page</strong>
        ${opts.toc || ''}
      </nav>
    </aside>
  </main>
  <footer>
    <p><small>&copy; ${opts.ctx.year} ${escapeHtml(opts.ctx.siteName)}</small></p>
  </footer>`

  return baseTemplate(body, {
    title,
    description,
    type: 'Docs',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render Collection type
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > header: collection title/description
 * - body > main > section: collection content and card grid
 * - body > footer: site footer
 */
export function renderCollection(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Collection'
  const description = (doc.data.description as string) || ''

  const body = `
${renderHeader(opts.ctx)}
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </header>
    <section>
      ${content}
    </section>
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'Collection',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render PricingPage type
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > header: pricing title/description
 * - body > main > section > article[]: pricing tiers
 * - body > main > section (subsequent): FAQ, comparison tables
 * - body > footer: site footer
 */
export function renderPricingPage(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Pricing'
  const description = (doc.data.description as string) || ''
  const tagline = (doc.data.tagline as string) || ''

  const body = `
${renderHeader(opts.ctx)}
  <main>
    <header>
      ${tagline ? `<small>${escapeHtml(tagline)}</small>` : ''}
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </header>
    <section>
      ${content}
    </section>
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'PricingPage',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render Slides type
 *
 * Semantic structure:
 * - body > header: presentation title and controls
 * - body > main > section[]: individual slides
 * - body > aside: progress bar
 */
export function renderSlides(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Presentation'
  const description = (doc.data.description as string) || ''

  // Split content into slides by --- or horizontal rules
  const slides = content.split(/<hr\s*\/?>/gi).filter(s => s.trim())

  const body = `
  <header>
    <nav>
      <strong>${escapeHtml(title)}</strong>
      <menu>
        <li><button data-action="prev">Prev</button></li>
        <li><output>1 / ${slides.length}</output></li>
        <li><button data-action="next">Next</button></li>
        <li><button data-action="fullscreen">Fullscreen</button></li>
      </menu>
    </nav>
  </header>
  <main>
    ${slides.map((slide, i) => `
    <section${i === 0 ? ' aria-current="true"' : ''}>
      ${slide}
    </section>`).join('')}
  </main>
  <aside>
    <progress value="1" max="${slides.length}"></progress>
  </aside>
  <script>
    const slides = document.querySelectorAll('main > section');
    const counter = document.querySelector('output');
    const progress = document.querySelector('progress');
    let current = 0;

    function goTo(n) {
      slides[current].removeAttribute('aria-current');
      current = Math.max(0, Math.min(n, slides.length - 1));
      slides[current].setAttribute('aria-current', 'true');
      slides[current].scrollIntoView({ behavior: 'smooth' });
      counter.textContent = (current + 1) + ' / ' + slides.length;
      progress.value = current + 1;
    }

    document.querySelector('[data-action="prev"]').onclick = () => goTo(current - 1);
    document.querySelector('[data-action="next"]').onclick = () => goTo(current + 1);
    document.querySelector('[data-action="fullscreen"]').onclick = () => document.documentElement.requestFullscreen();

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goTo(current + 1);
      if (e.key === 'ArrowLeft') goTo(current - 1);
    });
  </script>`

  return baseTemplate(body, {
    title,
    description,
    type: 'Slides',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render Directory type
 *
 * Semantic structure:
 * - body > header: site header with nav
 * - body > main > nav: breadcrumb navigation
 * - body > main > header: directory title/description
 * - body > main > section > article[]: file/folder list
 * - body > footer: site footer
 */
export function renderDirectory(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Directory'
  const description = (doc.data.description as string) || ''
  const breadcrumb = doc.data.breadcrumb as string[] | undefined

  const body = `
${renderHeader(opts.ctx)}
  <main>
    ${breadcrumb ? `<nav aria-label="Breadcrumb">${breadcrumb.map((b, i) => i === breadcrumb.length - 1 ? `<span>${escapeHtml(b)}</span>` : `<a href="#">${escapeHtml(b)}</a>`).join(' / ')}</nav>` : ''}
    <header>
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </header>
    <section>
      ${content}
    </section>
  </main>
${renderFooter(opts.ctx)}`

  return baseTemplate(body, {
    title,
    description,
    type: 'Directory',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render App type - Dashboard/application layout
 *
 * Semantic structure:
 * - body > header: app header with nav and user menu
 * - body > aside: sidebar navigation
 * - body > main > header: page title and actions
 * - body > main > section: main content
 * - body > footer: optional app footer
 */
export function renderApp(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Dashboard'
  const description = (doc.data.description as string) || ''
  const sidebar = doc.data.sidebar as string | undefined

  const body = `
  <header>
    <nav>
      <a href="/"><strong>${escapeHtml(opts.ctx.siteName)}</strong></a>
      <menu>
        <li><a href="/settings">Settings</a></li>
        <li><a href="/logout">Logout</a></li>
      </menu>
    </nav>
  </header>
  <aside>
    <nav aria-label="App navigation">
      ${sidebar || '<ul><li><a href="/" aria-current="page">Dashboard</a></li></ul>'}
    </nav>
  </aside>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </header>
    <section>
      ${content}
    </section>
  </main>`

  return baseTemplate(body, {
    title,
    description,
    type: 'App',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Render Agent type - AI agent chat interface
 *
 * Semantic structure:
 * - body > header: agent name and status
 * - body > main > section: chat messages
 * - body > main > form: message input
 * - body > aside: optional agent info/tools panel
 */
export function renderAgent(doc: MDXLDDocument, content: string, opts: RenderOptions): string {
  const title = (doc.data.title as string) || 'Agent'
  const description = (doc.data.description as string) || ''
  const status = (doc.data.status as string) || 'online'

  const body = `
  <header>
    <nav>
      <a href="/"><strong>${escapeHtml(opts.ctx.siteName)}</strong></a>
      <hgroup>
        <h1>${escapeHtml(title)}</h1>
        <p><small data-status="${status}">${status}</small></p>
      </hgroup>
    </nav>
  </header>
  <main>
    <section aria-label="Messages">
      ${content}
    </section>
    <form>
      <textarea placeholder="Type a message..." required></textarea>
      <button type="submit">Send</button>
    </form>
  </main>
  <aside>
    <nav aria-label="Agent tools">
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
    </nav>
  </aside>`

  return baseTemplate(body, {
    title,
    description,
    type: 'Agent',
    style: opts.style,
    ctx: opts.ctx,
  })
}

/**
 * Get renderer for a given $type
 */
export function getRenderer(type: string | undefined): (doc: MDXLDDocument, content: string, opts: RenderOptions) => string {
  const renderers: Record<string, (doc: MDXLDDocument, content: string, opts: RenderOptions) => string> = {
    // Content types
    Website: renderWebsite,
    LandingPage: renderLandingPage,
    landing: renderLandingPage,
    Waitlist: renderWaitlist,
    Blog: renderBlog,
    BlogPost: renderBlogPost,
    article: renderBlogPost,
    // Documentation types
    Docs: renderDocs,
    documentation: renderDocs,
    // Collection types
    Collection: renderCollection,
    gallery: renderCollection,
    Directory: renderDirectory,
    folder: renderDirectory,
    index: renderDirectory,
    // Interactive types
    Slides: renderSlides,
    presentation: renderSlides,
    App: renderApp,
    dashboard: renderApp,
    Agent: renderAgent,
    // Commerce types
    PricingPage: renderPricingPage,
    pricing: renderPricingPage,
  }

  return renderers[type || 'Website'] || renderWebsite
}
