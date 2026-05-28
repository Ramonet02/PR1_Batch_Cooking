/**
 * router.js
 *
 * Minimal hash-based router with path-param support.
 *
 *   route('/', loader)                  → exact match
 *   route('/receta/:id', loader)        → matches /receta/rec_pollo_limon,
 *                                          params = { id: 'rec_pollo_limon' }
 *
 * Hash routing (not history API) because Capacitor's WebView serves files
 * from a non-standard origin and history-based routing can break navigation.
 * Hash routes are bulletproof in WebViews.
 *
 * Each route's render() may return a cleanup function called on navigation.
 */

const routes = [];
let appEl = null;
let currentScreen = null;

// Tab order for slide direction: Batch(0) · Home(1) · Recetas(2)
// -1 = sub-screen / detail view
let currentTabIndex = 1;

function getTabIndex(path) {
  if (path.startsWith('/batch')) return 0;
  if (path === '/' || path === '') return 1;
  if (path.startsWith('/planificacion')) return 2;
  return -1; // detail / sub-screen
}

/**
 * Register a route. Path may contain `:paramName` segments.
 * @param {string} path
 * @param {() => Promise<{ render: (root, params) => void | (() => void) }>} loader
 */
export function route(path, loader) {
  const paramNames = [];
  const regexStr = '^' + path.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  }) + '$';
  routes.push({
    pattern: new RegExp(regexStr),
    paramNames,
    loader,
  });
}

/**
 * Navigate to a path. Updates the URL hash; the hashchange listener does
 * the actual rendering.
 */
export function navigate(path) {
  if (window.location.hash === `#${path}`) {
    render(path);
    return;
  }
  window.location.hash = path;
}

async function render(path) {
  if (!appEl) return;

  let match = null;
  let params = {};

  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      match = r;
      r.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      break;
    }
  }

  // Fallback: try home if nothing matched
  if (!match) {
    match = routes.find((r) => r.pattern.test('/'));
    params = {};
  }
  if (!match) {
    appEl.innerHTML = '<p style="padding:24px">Ruta no encontrada</p>';
    return;
  }

  try {
    // ── Determine slide direction ─────────────────────────────
    const newTabIndex = getTabIndex(path);
    let slideClass = null;
    if (newTabIndex !== -1 && currentTabIndex !== -1 && newTabIndex !== currentTabIndex) {
      // Tab → Tab: slide in the direction of tab order
      slideClass = newTabIndex > currentTabIndex ? 'screen-slide-right' : 'screen-slide-left';
    } else if (newTabIndex === -1 && currentTabIndex !== -1) {
      // Primary → detail (drill down): enter from the right
      slideClass = 'screen-slide-right';
    } else if (newTabIndex !== -1 && currentTabIndex === -1) {
      // Detail → primary (back): enter from the left
      slideClass = 'screen-slide-left';
    }
    // Update current tab index (keep -1 only for sub-screens)
    if (newTabIndex !== -1) currentTabIndex = newTabIndex;

    if (typeof currentScreen === 'function') {
      try { currentScreen(); } catch (e) { console.warn(e); }
    }
    const mod = await match.loader();
    if (typeof mod.render !== 'function') {
      console.error('[router] route module missing render()', path);
      return;
    }
    appEl.innerHTML = '';
    const cleanup = mod.render(appEl, params);
    currentScreen = typeof cleanup === 'function' ? cleanup : null;

    // Apply slide animation to the freshly rendered frame
    if (slideClass) {
      const frame = appEl.querySelector('.device');
      if (frame) frame.classList.add(slideClass);
    }

    const scroll = appEl.querySelector('.device-scroll');
    if (scroll) scroll.scrollTop = 0;
  } catch (err) {
    console.error('[router] render error', err);
    appEl.innerHTML = `<pre style="padding:24px;color:red">${err.message}\n${err.stack}</pre>`;
  }
}

/**
 * Boot the router. Call once after the app mounts.
 */
export function initRouter(rootEl) {
  appEl = rootEl;
  const initial = window.location.hash.slice(1) || '/';
  // Pre-seed currentTabIndex so the first render never triggers a slide
  const idx = getTabIndex(initial);
  currentTabIndex = idx === -1 ? 1 : idx;

  window.addEventListener('hashchange', () => {
    const path = window.location.hash.slice(1) || '/';
    render(path);
  });
  if (!window.location.hash) {
    window.history.replaceState(null, '', '#/');
  }
  render(initial);
}
