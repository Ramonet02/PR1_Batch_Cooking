/**
 * main.js
 *
 * Application entry point. Steps:
 *   1. Load any persisted state from Preferences/localStorage.
 *   2. Hydrate the live state object.
 *   3. Register routes (lazy-loaded screen modules).
 *   4. Boot the hash router, which renders the initial screen.
 */

import { loadState, saveState } from './storage.js';
import { hydrate, state, loadTheMealDBRecipes } from './state.js';
import { initRouter, route } from './router.js';
import { fetchTheMealDBRecipes } from './api/themealdb.js';
import { hasSeenWelcoming, showWelcoming } from './screens/welcoming.js';

// ── Route table ──────────────────────────────────────────────────────────
// Order doesn't matter; the router resolves on demand.

route('/',                        () => import('./screens/home.js'));
route('/batch',                   () => import('./screens/batch.js'));
route('/planificacion',           () => import('./screens/recetario.js'));
route('/planificacion/recetario', () => import('./screens/recetario.js'));
route('/planificacion/nevera',    () => import('./screens/nevera.js'));
route('/planificacion/compra',    () => import('./screens/compra.js'));
route('/receta-nueva',            () => import('./screens/receta-nueva.js'));
route('/receta/:id/editar',       () => import('./screens/receta-nueva.js'));
route('/receta/:id',              () => import('./screens/receta-detalle.js'));

// ── Bootstrap ────────────────────────────────────────────────────────────

(async function bootstrap() {
  const saved = await loadState();
  if (saved) {
    hydrate(saved);
  } else {
    // First launch: persist the seed data so it survives a refresh
    await saveState(state);
  }

  // ── TheMealDB background fetch ─────────────────────────────────────────
  // Only runs once: if we have no API-sourced recipes yet (ids start with
  // 'meal_'), fetch ~40 from TheMealDB and merge into state. Fire-and-forget
  // so the UI starts instantly regardless of network.
  const hasMealDB = state.recetas.some((r) => r.id.startsWith('meal_'));
  if (!hasMealDB) {
    fetchTheMealDBRecipes()
      .then((recipes) => loadTheMealDBRecipes(recipes))
      .catch((e) => console.warn('[TheMealDB] fetch skipped:', e.message));
  }

  const appEl = document.getElementById('app');

  // First-launch onboarding: block router init until the user dismisses
  // the welcoming slides. Persisted flag is independent from app state.
  if (!(await hasSeenWelcoming())) {
    await showWelcoming(document.body);
  }

  initRouter(appEl);
})();
