/**
 * @mdxe/next Widgets
 *
 * Dynamic widget system for serving fumadocs components and other UI widgets.
 * Widgets are served as bundled JavaScript and CSS files via Next.js API routes.
 *
 * @packageDocumentation
 */

/**
 * Widget configuration
 */
export interface WidgetConfig {
  /** Widget name */
  name: string
  /** Widget description */
  description?: string
  /** CSS styles for the widget */
  css?: string
  /** JavaScript code for the widget */
  js?: string
  /** Dependencies (CDN URLs) */
  dependencies?: string[]
}

/**
 * Available widgets
 */
export type WidgetName = 'chatbox' | 'searchbox' | 'toc' | 'theme-toggle' | 'copy-button'

/**
 * Widget CSS styles
 */
const widgetStyles: Record<WidgetName, string> = {
  chatbox: `
/* Chatbox Widget Styles */
.mdx-chatbox {
  --chatbox-bg: var(--background, #fff);
  --chatbox-fg: var(--foreground, #1a1a1a);
  --chatbox-border: var(--border, #e5e5e5);
  --chatbox-primary: var(--primary, #0066cc);
  --chatbox-radius: var(--radius, 0.5rem);
}

.mdx-chatbox-trigger {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--chatbox-primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 9998;
}

.mdx-chatbox-trigger:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.mdx-chatbox-trigger svg {
  width: 1.5rem;
  height: 1.5rem;
}

.mdx-chatbox-panel {
  position: fixed;
  bottom: 6rem;
  right: 1.5rem;
  width: 380px;
  max-height: 600px;
  background: var(--chatbox-bg);
  border: 1px solid var(--chatbox-border);
  border-radius: calc(var(--chatbox-radius) * 2);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9999;
  opacity: 0;
  transform: translateY(10px) scale(0.95);
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}

.mdx-chatbox-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.mdx-chatbox-header {
  padding: 1rem;
  border-bottom: 1px solid var(--chatbox-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mdx-chatbox-title {
  font-weight: 600;
  color: var(--chatbox-fg);
}

.mdx-chatbox-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--chatbox-fg);
  opacity: 0.6;
}

.mdx-chatbox-close:hover {
  opacity: 1;
}

.mdx-chatbox-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  min-height: 300px;
}

.mdx-chatbox-input {
  padding: 1rem;
  border-top: 1px solid var(--chatbox-border);
}

.mdx-chatbox-input textarea {
  width: 100%;
  border: 1px solid var(--chatbox-border);
  border-radius: var(--chatbox-radius);
  padding: 0.75rem;
  resize: none;
  font-family: inherit;
  font-size: 0.875rem;
}

.mdx-chatbox-input textarea:focus {
  outline: none;
  border-color: var(--chatbox-primary);
}

@media (max-width: 640px) {
  .mdx-chatbox-panel {
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    max-height: 80vh;
    border-radius: calc(var(--chatbox-radius) * 2) calc(var(--chatbox-radius) * 2) 0 0;
  }
}
`,

  searchbox: `
/* Searchbox Widget Styles */
.mdx-searchbox {
  --searchbox-bg: var(--background, #fff);
  --searchbox-fg: var(--foreground, #1a1a1a);
  --searchbox-border: var(--border, #e5e5e5);
  --searchbox-muted: var(--muted-foreground, #6b7280);
  --searchbox-radius: var(--radius, 0.5rem);
}

.mdx-searchbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.mdx-searchbox-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.mdx-searchbox-dialog {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  width: 90%;
  max-width: 600px;
  background: var(--searchbox-bg);
  border: 1px solid var(--searchbox-border);
  border-radius: calc(var(--searchbox-radius) * 2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}

.mdx-searchbox-dialog.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.mdx-searchbox-input-wrapper {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--searchbox-border);
}

.mdx-searchbox-input-wrapper svg {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--searchbox-muted);
  margin-right: 0.75rem;
}

.mdx-searchbox-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--searchbox-fg);
}

.mdx-searchbox-input:focus {
  outline: none;
}

.mdx-searchbox-results {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

.mdx-searchbox-result {
  padding: 0.75rem 1rem;
  border-radius: var(--searchbox-radius);
  cursor: pointer;
}

.mdx-searchbox-result:hover,
.mdx-searchbox-result.selected {
  background: var(--muted, #f5f5f5);
}

.mdx-searchbox-result-title {
  font-weight: 500;
  color: var(--searchbox-fg);
}

.mdx-searchbox-result-description {
  font-size: 0.875rem;
  color: var(--searchbox-muted);
  margin-top: 0.25rem;
}

.mdx-searchbox-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--searchbox-border);
  font-size: 0.75rem;
  color: var(--searchbox-muted);
}

.mdx-searchbox-kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: var(--muted, #f5f5f5);
  border: 1px solid var(--searchbox-border);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}
`,

  toc: `
/* Table of Contents Widget Styles */
.mdx-toc {
  --toc-fg: var(--foreground, #1a1a1a);
  --toc-muted: var(--muted-foreground, #6b7280);
  --toc-primary: var(--primary, #0066cc);
  --toc-border: var(--border, #e5e5e5);
}

.mdx-toc {
  position: sticky;
  top: 2rem;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  padding-right: 1rem;
}

.mdx-toc-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--toc-fg);
  margin-bottom: 1rem;
}

.mdx-toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mdx-toc-item {
  margin-bottom: 0.5rem;
}

.mdx-toc-link {
  display: block;
  font-size: 0.875rem;
  color: var(--toc-muted);
  text-decoration: none;
  padding: 0.25rem 0;
  border-left: 2px solid transparent;
  padding-left: 0.75rem;
  margin-left: -0.75rem;
  transition: color 0.2s, border-color 0.2s;
}

.mdx-toc-link:hover {
  color: var(--toc-fg);
}

.mdx-toc-link.active {
  color: var(--toc-primary);
  border-left-color: var(--toc-primary);
}

.mdx-toc-link[data-depth="3"] {
  padding-left: 1.5rem;
}

.mdx-toc-link[data-depth="4"] {
  padding-left: 2.25rem;
}
`,

  'theme-toggle': `
/* Theme Toggle Widget Styles */
.mdx-theme-toggle {
  background: none;
  border: 1px solid var(--border, #e5e5e5);
  border-radius: var(--radius, 0.5rem);
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--foreground, #1a1a1a);
  transition: background 0.2s;
}

.mdx-theme-toggle:hover {
  background: var(--muted, #f5f5f5);
}

.mdx-theme-toggle svg {
  width: 1.25rem;
  height: 1.25rem;
}

.mdx-theme-toggle .sun {
  display: block;
}

.mdx-theme-toggle .moon {
  display: none;
}

[data-theme="dark"] .mdx-theme-toggle .sun {
  display: none;
}

[data-theme="dark"] .mdx-theme-toggle .moon {
  display: block;
}
`,

  'copy-button': `
/* Copy Button Widget Styles */
.mdx-copy-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: var(--muted, #f5f5f5);
  border: 1px solid var(--border, #e5e5e5);
  border-radius: var(--radius, 0.5rem);
  padding: 0.375rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

pre:hover .mdx-copy-button {
  opacity: 1;
}

.mdx-copy-button:hover {
  background: var(--accent, #e5e5e5);
}

.mdx-copy-button svg {
  width: 1rem;
  height: 1rem;
  color: var(--foreground, #1a1a1a);
}

.mdx-copy-button.copied svg {
  color: var(--primary, #0066cc);
}
`,
}

/**
 * Widget JavaScript
 */
const widgetScripts: Record<WidgetName, string> = {
  chatbox: `
(function() {
  'use strict';

  function createChatbox(config) {
    config = config || {};
    var title = config.title || 'Chat with us';
    var placeholder = config.placeholder || 'Type a message...';

    var trigger = document.createElement('button');
    trigger.className = 'mdx-chatbox-trigger';
    trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    trigger.setAttribute('aria-label', 'Open chat');

    var panel = document.createElement('div');
    panel.className = 'mdx-chatbox-panel';
    panel.innerHTML = '<div class="mdx-chatbox-header"><span class="mdx-chatbox-title">' + title + '</span><button class="mdx-chatbox-close" aria-label="Close chat">&times;</button></div><div class="mdx-chatbox-messages"></div><div class="mdx-chatbox-input"><textarea placeholder="' + placeholder + '" rows="2"></textarea></div>';

    document.body.appendChild(trigger);
    document.body.appendChild(panel);

    var isOpen = false;

    trigger.addEventListener('click', function() {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      if (isOpen) {
        panel.querySelector('textarea').focus();
      }
    });

    panel.querySelector('.mdx-chatbox-close').addEventListener('click', function() {
      isOpen = false;
      panel.classList.remove('open');
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isOpen) {
        isOpen = false;
        panel.classList.remove('open');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { createChatbox(window.__chatboxConfig); });
  } else {
    createChatbox(window.__chatboxConfig);
  }
})();
`,

  searchbox: `
(function() {
  'use strict';

  function createSearchbox(config) {
    config = config || {};
    var placeholder = config.placeholder || 'Search documentation...';

    var overlay = document.createElement('div');
    overlay.className = 'mdx-searchbox-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'mdx-searchbox-dialog';
    dialog.innerHTML = '<div class="mdx-searchbox-input-wrapper"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg><input type="text" class="mdx-searchbox-input" placeholder="' + placeholder + '"></div><div class="mdx-searchbox-results"></div><div class="mdx-searchbox-footer"><span class="mdx-searchbox-kbd">↑↓</span> to navigate <span class="mdx-searchbox-kbd">↵</span> to select <span class="mdx-searchbox-kbd">esc</span> to close</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    var isOpen = false;
    var input = dialog.querySelector('.mdx-searchbox-input');

    function open() {
      isOpen = true;
      overlay.classList.add('open');
      dialog.classList.add('open');
      input.focus();
    }

    function close() {
      isOpen = false;
      overlay.classList.remove('open');
      dialog.classList.remove('open');
      input.value = '';
    }

    overlay.addEventListener('click', close);

    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? close() : open();
      }
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { createSearchbox(window.__searchboxConfig); });
  } else {
    createSearchbox(window.__searchboxConfig);
  }
})();
`,

  toc: `
(function() {
  'use strict';

  function createToc(container) {
    var headings = document.querySelectorAll('article h2, article h3, article h4');
    if (headings.length === 0) return;

    var nav = document.createElement('nav');
    nav.className = 'mdx-toc';
    nav.innerHTML = '<div class="mdx-toc-title">On this page</div>';

    var list = document.createElement('ul');
    list.className = 'mdx-toc-list';

    headings.forEach(function(heading, i) {
      if (!heading.id) {
        heading.id = 'heading-' + i;
      }

      var item = document.createElement('li');
      item.className = 'mdx-toc-item';

      var link = document.createElement('a');
      link.className = 'mdx-toc-link';
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.setAttribute('data-depth', heading.tagName.charAt(1));

      item.appendChild(link);
      list.appendChild(item);
    });

    nav.appendChild(list);

    if (container) {
      container.appendChild(nav);
    } else {
      var aside = document.querySelector('aside');
      if (aside) {
        aside.appendChild(nav);
      }
    }

    var links = nav.querySelectorAll('.mdx-toc-link');
    function updateActive() {
      var scrollY = window.scrollY + 100;
      var current = null;
      headings.forEach(function(h) {
        if (h.offsetTop <= scrollY) {
          current = h.id;
        }
      });
      links.forEach(function(link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { createToc(document.querySelector('[data-toc]')); });
  } else {
    createToc(document.querySelector('[data-toc]'));
  }
})();
`,

  'theme-toggle': `
(function() {
  'use strict';

  function createThemeToggle(container) {
    var button = document.createElement('button');
    button.className = 'mdx-theme-toggle';
    button.innerHTML = '<svg class="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg><svg class="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    button.setAttribute('aria-label', 'Toggle theme');

    function getTheme() {
      return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }

    setTheme(getTheme());

    button.addEventListener('click', function() {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });

    if (container) {
      container.appendChild(button);
    } else {
      var nav = document.querySelector('nav ul:last-child');
      if (nav) {
        var li = document.createElement('li');
        li.appendChild(button);
        nav.appendChild(li);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { createThemeToggle(document.querySelector('[data-theme-toggle]')); });
  } else {
    createThemeToggle(document.querySelector('[data-theme-toggle]'));
  }
})();
`,

  'copy-button': `
(function() {
  'use strict';

  function addCopyButtons() {
    document.querySelectorAll('pre').forEach(function(pre) {
      if (pre.querySelector('.mdx-copy-button')) return;

      pre.style.position = 'relative';

      var button = document.createElement('button');
      button.className = 'mdx-copy-button';
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      button.setAttribute('aria-label', 'Copy code');

      button.addEventListener('click', function() {
        var code = pre.querySelector('code');
        var text = code ? code.textContent : pre.textContent;
        navigator.clipboard.writeText(text).then(function() {
          button.classList.add('copied');
          setTimeout(function() {
            button.classList.remove('copied');
          }, 2000);
        });
      });

      pre.appendChild(button);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCopyButtons);
  } else {
    addCopyButtons();
  }
})();
`,
}

/**
 * Get widget CSS
 */
export function getWidgetCSS(widgets: WidgetName[]): string {
  return widgets.map(w => widgetStyles[w] || '').join('\n')
}

/**
 * Get widget JavaScript
 */
export function getWidgetJS(widgets: WidgetName[]): string {
  return widgets.map(w => widgetScripts[w] || '').join('\n')
}

/**
 * Get all widget CSS
 */
export function getAllWidgetCSS(): string {
  return Object.values(widgetStyles).join('\n')
}

/**
 * Get all widget JavaScript
 */
export function getAllWidgetJS(): string {
  return Object.values(widgetScripts).join('\n')
}

/**
 * Parse widget names from query string
 */
export function parseWidgetQuery(query: string): WidgetName[] {
  const validWidgets: WidgetName[] = ['chatbox', 'searchbox', 'toc', 'theme-toggle', 'copy-button']
  return query
    .split(',')
    .map(w => w.trim() as WidgetName)
    .filter(w => validWidgets.includes(w))
}

/**
 * Create a Next.js API route handler for widget CSS
 *
 * @example
 * ```ts
 * // app/api/widgets.css/route.ts
 * import { createWidgetCSSHandler } from '@mdxe/next/widgets'
 * export const GET = createWidgetCSSHandler()
 * ```
 */
export function createWidgetCSSHandler() {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const widgetParam = url.searchParams.get('w') || url.searchParams.get('widgets')

    let css: string
    if (widgetParam) {
      const widgets = parseWidgetQuery(widgetParam)
      css = getWidgetCSS(widgets)
    } else {
      css = getAllWidgetCSS()
    }

    return new Response(css, {
      status: 200,
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }
}

/**
 * Create a Next.js API route handler for widget JavaScript
 *
 * @example
 * ```ts
 * // app/api/widgets.js/route.ts
 * import { createWidgetJSHandler } from '@mdxe/next/widgets'
 * export const GET = createWidgetJSHandler()
 * ```
 */
export function createWidgetJSHandler() {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const widgetParam = url.searchParams.get('w') || url.searchParams.get('widgets')

    let js: string
    if (widgetParam) {
      const widgets = parseWidgetQuery(widgetParam)
      js = getWidgetJS(widgets)
    } else {
      js = getAllWidgetJS()
    }

    return new Response(js, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }
}
