/**
 * @mdxe/hono Analytics
 *
 * Lightweight analytics with Core Web Vitals tracking.
 * Inspired by Vercel Analytics and Speed Insights.
 *
 * @packageDocumentation
 */

/**
 * Core Web Vitals metrics
 */
export interface WebVitalsMetric {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

/**
 * Page view event
 */
export interface PageViewEvent {
  url: string
  referrer: string
  title: string
  timestamp: number
  screenWidth: number
  screenHeight: number
  language: string
  timezone: string
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  name: string
  properties?: Record<string, unknown>
  timestamp: number
  url: string
}

/**
 * Configuration for analytics
 */
export interface AnalyticsConfig {
  /** Endpoint to send analytics data */
  endpoint?: string
  /** Enable Core Web Vitals tracking */
  webVitals?: boolean
  /** Enable page view tracking */
  pageViews?: boolean
  /** Enable debug mode */
  debug?: boolean
  /** Sample rate (0-1) */
  sampleRate?: number
  /** Custom beacon function */
  beacon?: (data: unknown) => void
}

/**
 * Generate the client-side analytics script
 * This will be served from /$.js
 */
export function generateAnalyticsScript(config: AnalyticsConfig = {}): string {
  const {
    endpoint = '/_analytics',
    webVitals = true,
    pageViews = true,
    debug = false,
    sampleRate = 1,
  } = config

  return `(function(){
"use strict";

// Configuration
var CONFIG = {
  endpoint: "${endpoint}",
  webVitals: ${webVitals},
  pageViews: ${pageViews},
  debug: ${debug},
  sampleRate: ${sampleRate}
};

// Check sample rate
if (Math.random() > CONFIG.sampleRate) return;

// Debug logging
function log() {
  if (CONFIG.debug && console && console.log) {
    console.log.apply(console, ['[Analytics]'].concat(Array.prototype.slice.call(arguments)));
  }
}

// Send beacon
function send(data) {
  log('Sending:', data);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(CONFIG.endpoint, JSON.stringify(data));
  } else {
    fetch(CONFIG.endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      keepalive: true,
      headers: { 'Content-Type': 'application/json' }
    }).catch(function() {});
  }
}

// Track page view
function trackPageView() {
  if (!CONFIG.pageViews) return;

  var event = {
    type: 'pageview',
    url: location.href,
    referrer: document.referrer || '',
    title: document.title || '',
    timestamp: Date.now(),
    screenWidth: screen.width,
    screenHeight: screen.height,
    language: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  };

  send(event);
}

// Core Web Vitals thresholds
var thresholds = {
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  FID: [100, 300],
  INP: [200, 500],
  LCP: [2500, 4000],
  TTFB: [800, 1800]
};

function getRating(name, value) {
  var t = thresholds[name];
  if (!t) return 'good';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}

// Generate unique ID for metric
var idCounter = 0;
function generateId() {
  return 'v' + (++idCounter) + '-' + Math.random().toString(36).substr(2, 9);
}

// Track Web Vital
function trackWebVital(name, value, delta, navigationType) {
  if (!CONFIG.webVitals) return;

  var metric = {
    type: 'webvital',
    name: name,
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    rating: getRating(name, value),
    delta: Math.round(name === 'CLS' ? delta * 1000 : delta),
    id: generateId(),
    navigationType: navigationType || 'navigate',
    timestamp: Date.now(),
    url: location.href
  };

  log('Web Vital:', name, metric);
  send(metric);
}

// Web Vitals implementation
function initWebVitals() {
  if (!CONFIG.webVitals) return;
  if (typeof PerformanceObserver === 'undefined') return;

  // First Contentful Paint (FCP)
  try {
    var fcpObserver = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].name === 'first-contentful-paint') {
          trackWebVital('FCP', entries[i].startTime, entries[i].startTime, getNavigationType());
          fcpObserver.disconnect();
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) { log('FCP error:', e); }

  // Largest Contentful Paint (LCP)
  try {
    var lcpValue = 0;
    var lcpObserver = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      var lastEntry = entries[entries.length - 1];
      lcpValue = lastEntry.startTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // Report on visibility hidden or pagehide
    var reportLCP = function() {
      if (lcpValue > 0) {
        trackWebVital('LCP', lcpValue, lcpValue, getNavigationType());
        lcpValue = 0;
      }
      lcpObserver.disconnect();
    };
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') reportLCP();
    });
    window.addEventListener('pagehide', reportLCP);
  } catch (e) { log('LCP error:', e); }

  // Cumulative Layout Shift (CLS)
  try {
    var clsValue = 0;
    var clsObserver = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].hadRecentInput) {
          clsValue += entries[i].value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    var reportCLS = function() {
      if (clsValue > 0) {
        trackWebVital('CLS', clsValue, clsValue, getNavigationType());
      }
      clsObserver.disconnect();
    };
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') reportCLS();
    });
    window.addEventListener('pagehide', reportCLS);
  } catch (e) { log('CLS error:', e); }

  // First Input Delay (FID) / Interaction to Next Paint (INP)
  try {
    var fidReported = false;
    var inpValue = 0;
    var fidObserver = new PerformanceObserver(function(list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var delay = entry.processingStart - entry.startTime;

        // FID: first interaction only
        if (!fidReported && delay > 0) {
          trackWebVital('FID', delay, delay, getNavigationType());
          fidReported = true;
        }

        // INP: track worst interaction
        var duration = entry.duration;
        if (duration > inpValue) {
          inpValue = duration;
        }
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Also observe event entries for INP
    try {
      var eventObserver = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          var duration = entries[i].duration;
          if (duration > inpValue) {
            inpValue = duration;
          }
        }
      });
      eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 });

      var reportINP = function() {
        if (inpValue > 0) {
          trackWebVital('INP', inpValue, inpValue, getNavigationType());
        }
      };
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') reportINP();
      });
      window.addEventListener('pagehide', reportINP);
    } catch (e) { log('INP error:', e); }
  } catch (e) { log('FID error:', e); }

  // Time to First Byte (TTFB)
  try {
    var navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry && navEntry.responseStart > 0) {
      var ttfb = navEntry.responseStart;
      trackWebVital('TTFB', ttfb, ttfb, getNavigationType());
    }
  } catch (e) { log('TTFB error:', e); }
}

function getNavigationType() {
  try {
    var navEntry = performance.getEntriesByType('navigation')[0];
    return navEntry ? navEntry.type : 'navigate';
  } catch (e) {
    return 'navigate';
  }
}

// Initialize
function init() {
  log('Initializing analytics');

  // Track page view on load
  if (document.readyState === 'complete') {
    trackPageView();
  } else {
    window.addEventListener('load', trackPageView);
  }

  // Initialize Web Vitals
  initWebVitals();

  // SPA navigation tracking
  if (typeof history !== 'undefined' && history.pushState) {
    var originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      setTimeout(trackPageView, 0);
    };

    window.addEventListener('popstate', function() {
      setTimeout(trackPageView, 0);
    });
  }
}

// Run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose API
window.__analytics = {
  track: function(name, properties) {
    send({
      type: 'event',
      name: name,
      properties: properties || {},
      timestamp: Date.now(),
      url: location.href
    });
  }
};

})();`
}

/**
 * Minified version of the analytics script for production
 */
export function generateMinifiedAnalyticsScript(config: AnalyticsConfig = {}): string {
  // For now, return the same script - in production you'd want to actually minify this
  // Could use esbuild or terser to minify
  return generateAnalyticsScript(config)
}

/**
 * Generate HTML script tag for analytics
 */
export function analyticsScriptTag(src = '/$.js'): string {
  return `<script defer src="${src}"></script>`
}
