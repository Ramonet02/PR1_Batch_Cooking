/**
 * screens/recetario.js
 *
 * Tab 1 · Recetario. The user's saved recipes with multi-dimensional filters,
 * search, surprise-me random pick (with shake gesture on device), and tap-to-
 * see-detail on each card.
 *
 * Improvements over v1:
 *   - Cards now show both nutritional + cuisine chips
 *   - "✓ esta semana" badge when the recipe is planned in a tupper this week
 *   - Cuisine filter row alongside the nutritional filters
 *   - "✨ Sorpréndeme" button — picks a random recipe and opens its detail
 *   - Shake gesture (via @capacitor/motion) → same as Sorpréndeme
 */

import { state } from '../state.js';
import { DeviceShell } from '../components/device-shell.js';
import { Subtabs } from '../components/subtabs.js';
import { makeSheet, closeSheet } from '../components/sheet.js';
import { foodIcon, uiIcon } from '../components/icon.js';
import { Prop } from '../components/prop.js';
import { navigate } from '../router.js';
import { watchShake } from '../native/motion.js';
import { impactMedium } from '../native/haptics.js';

const NUTRI_FILTERS = [
  { id: 'todas',         label: 'Todas',         cat: null },
  { id: 'proteina',      label: 'Proteína',      cat: 'proteina' },
  { id: 'verdura',       label: 'Verdura',       cat: 'verdura' },
  { id: 'carbohidratos', label: 'Carbohidratos', cat: 'carbohidratos' },
  { id: 'mixto',         label: 'Mixto',         cat: 'mixto' },
];

const CUISINE_FILTERS = [
  { id: 'all',          label: 'Cualquiera', cui: null },
  { id: 'mediterraneo', label: 'Mediterráneo',     cui: 'mediterraneo' },
  { id: 'italiano',     label: 'Italiano',         cui: 'italiano' },
  { id: 'asiatico',     label: 'Asiático',         cui: 'asiatico' },
  { id: 'nacional',     label: 'Nacional',         cui: 'nacional' },
  { id: 'internacional',label: 'Internacional',    cui: 'internacional' },
];

const DIFICULTAD_FILTERS = [
  { id: 'all',     label: 'Cualquier', val: null },
  { id: 'facil',   label: 'Fácil',           val: 'fácil' },
  { id: 'media',   label: 'Media',           val: 'media' },
  { id: 'dificil', label: 'Difícil',         val: 'difícil' },
];

const TIEMPO_FILTERS = [
  { id: 'all',    label: 'Cualquier', min: 0,  max: Infinity },
  { id: 'rapido', label: '≤ 20 min',         min: 0,  max: 20 },
  { id: 'medio',  label: '20 – 45 min',      min: 21, max: 45 },
  { id: 'largo',  label: '> 45 min',         min: 46, max: Infinity },
];

const TIPO_LABEL = { proteina: 'Proteína', carbohidratos: 'Carbo', verdura: 'Verdura', mixto: 'Mixto' };
const COCINA_LABEL = { mediterraneo: 'Mediterráneo', italiano: 'Italiano', asiatico: 'Asiático', nacional: 'Nacional', internacional: 'Internacional' };
const DIFICULTAD_CHIP = { 'fácil': 'oliva', 'media': 'mostaza', 'difícil': 'tomate' };

let filterState = { nutri: 'todas', cuisine: 'all', dificultad: 'all', tiempo: 'all', search: '' };

export function render(root) {
  const { frame, scroll } = DeviceShell({
    currentPath: '/planificacion/recetario',
  });
  root.appendChild(frame);

  // Decorative background props
  scroll.appendChild(Prop({
    src: 'persona_cortando.png',
    size: 'md',
    style: { top: '200px', right: '-26px' },
    tilt: 5,
  }));
  scroll.appendChild(Prop({
    src: 'tabla_de_cortar.png',
    size: 'sm',
    style: { top: '760px', left: '-18px' },
    tilt: -8,
  }));

  scroll.appendChild(Subtabs('recetario'));

  // ── Search + Sorpréndeme ───────────────────────────────────
  const searchRow = document.createElement('div');
  searchRow.className = 'search-row';
  searchRow.innerHTML = `
    <input type="text" class="input input-search" placeholder="Buscar receta..." />
  `;
  searchRow.querySelector('input').addEventListener('input', (e) => {
    filterState.search = e.target.value.toLowerCase();
    renderList();
  });
  scroll.appendChild(searchRow);

  // ── Compact filter pills (dropdowns) ───────────────────────
  const filtersRow = document.createElement('div');
  filtersRow.className = 'filters-compact';
  scroll.appendChild(filtersRow);

  function renderFilterPills() {
    const nutri  = NUTRI_FILTERS.find((x) => x.id === filterState.nutri);
    const cui    = CUISINE_FILTERS.find((x) => x.id === filterState.cuisine);
    const dif    = DIFICULTAD_FILTERS.find((x) => x.id === filterState.dificultad);
    const tpo    = TIEMPO_FILTERS.find((x) => x.id === filterState.tiempo);
    const nutriActive = filterState.nutri !== 'todas';
    const cuiActive   = filterState.cuisine !== 'all';
    const difActive   = filterState.dificultad !== 'all';
    const tpoActive   = filterState.tiempo !== 'all';
    const anyActive   = nutriActive || cuiActive || difActive || tpoActive;
    filtersRow.innerHTML = `
      <button type="button" class="filter-pill${nutriActive ? ' has-filter' : ''}" data-open="nutri">
        <span class="filter-pill-label">Tipo</span>
        <span class="filter-pill-sep">·</span>
        <span class="filter-pill-value">${nutri?.label ?? 'Todas'}</span>
        <span class="filter-pill-caret">▾</span>
      </button>
      <button type="button" class="filter-pill${cuiActive ? ' has-filter' : ''}" data-open="cuisine">
        <span class="filter-pill-label">Cocina</span>
        <span class="filter-pill-sep">·</span>
        <span class="filter-pill-value">${cui?.label ?? 'Cualquiera'}</span>
        <span class="filter-pill-caret">▾</span>
      </button>
      <button type="button" class="filter-pill${difActive ? ' has-filter' : ''}" data-open="dificultad">
        <span class="filter-pill-label">Nivel</span>
        <span class="filter-pill-sep">·</span>
        <span class="filter-pill-value">${dif?.label ?? 'Todos'}</span>
        <span class="filter-pill-caret">▾</span>
      </button>
      <button type="button" class="filter-pill${tpoActive ? ' has-filter' : ''}" data-open="tiempo">
        <span class="filter-pill-label">Tiempo</span>
        <span class="filter-pill-sep">·</span>
        <span class="filter-pill-value">${tpo?.label ?? 'Todos'}</span>
        <span class="filter-pill-caret">▾</span>
      </button>
      ${anyActive ? `<button type="button" class="filter-pill-clear" data-clear>Limpiar</button>` : ''}
    `;
    filtersRow.querySelector('[data-open="nutri"]').addEventListener('click', async () => {
      await impactMedium();
      openFilterSheet('nutri');
    });
    filtersRow.querySelector('[data-open="cuisine"]').addEventListener('click', async () => {
      await impactMedium();
      openFilterSheet('cuisine');
    });
    filtersRow.querySelector('[data-open="dificultad"]').addEventListener('click', async () => {
      await impactMedium();
      openFilterSheet('dificultad');
    });
    filtersRow.querySelector('[data-open="tiempo"]').addEventListener('click', async () => {
      await impactMedium();
      openFilterSheet('tiempo');
    });
    const clearBtn = filtersRow.querySelector('[data-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        await impactMedium();
        filterState.nutri = 'todas';
        filterState.cuisine = 'all';
        filterState.dificultad = 'all';
        filterState.tiempo = 'all';
        renderFilterPills();
        renderList();
      });
    }
  }
  renderFilterPills();

  function openFilterSheet(kind) {
    const isNutri = kind === 'nutri';
    const isDif   = kind === 'dificultad';
    const isTpo   = kind === 'tiempo';
    const list = isNutri ? NUTRI_FILTERS
               : isDif   ? DIFICULTAD_FILTERS
               : isTpo   ? TIEMPO_FILTERS
               : CUISINE_FILTERS;
    const selectedKey = isNutri ? filterState.nutri
                      : isDif   ? filterState.dificultad
                      : isTpo   ? filterState.tiempo
                      : filterState.cuisine;
    const eyebrow = 'Filtros';
    const title = isNutri ? 'Tipo nutricional'
                : isDif   ? 'Nivel de dificultad'
                : isTpo   ? 'Tiempo de preparación'
                : 'Tipo de cocina';

    const backdrop = makeSheet({
      eyebrow,
      title,
      bodyHTML: `
        <div class="filter-options">
          ${list.map((f) => `
            <button type="button" class="filter-option${f.id === selectedKey ? ' selected' : ''}" data-id="${f.id}">
              <span class="filter-option-label">${f.label}</span>
              ${f.id === selectedKey ? uiIcon('check', { size: 18, color: 'var(--marina)' }) : ''}
            </button>
          `).join('')}
        </div>
      `,
      foot: '',
    });

    backdrop.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await impactMedium();
        const value = btn.dataset.id;
        if (isNutri)     filterState.nutri = value;
        else if (isDif)  filterState.dificultad = value;
        else if (isTpo)  filterState.tiempo = value;
        else             filterState.cuisine = value;
        renderFilterPills();
        renderList();
        closeSheet(backdrop);
      });
    });
  }

  // ── Recipe list ────────────────────────────────────────────
  const listWrap = document.createElement('div');
  listWrap.className = 'recipes-list';
  listWrap.style.marginTop = 'var(--space-3)';
  scroll.appendChild(listWrap);

  // ── FAB ───────────────────────────────────────────────────
  const fab = document.createElement('div');
  fab.style.position = 'absolute';
  fab.style.right = '20px';
  fab.style.bottom = 'calc(var(--bottom-nav-h) + var(--safe-bottom) + 20px)';
  fab.style.zIndex = '10';
  fab.innerHTML = `<button class="fab" aria-label="Nueva receta">${uiIcon('plus', { size: 26 })}</button>`;
  fab.querySelector('.fab').addEventListener('click', async () => {
    await impactMedium();
    navigate('/receta-nueva');
  });
  frame.appendChild(fab);

  // ── Shake gesture ─────────────────────────────────────────
  let stopShake = null;
  watchShake(surpriseMe).then((stop) => { stopShake = stop; });

  function renderList() {
    const nutri = NUTRI_FILTERS.find((x) => x.id === filterState.nutri);
    const cui   = CUISINE_FILTERS.find((x) => x.id === filterState.cuisine);
    const dif   = DIFICULTAD_FILTERS.find((x) => x.id === filterState.dificultad);
    const tpo   = TIEMPO_FILTERS.find((x) => x.id === filterState.tiempo);
    const recs = state.recetas.filter((r) => {
      const okCat  = !nutri.cat || r.tipoNutricional === nutri.cat;
      const okCui  = !cui.cui   || r.tipoCocina === cui.cui;
      const okDif  = !dif.val   || r.dificultad === dif.val;
      const okTime = tpo.id === 'all'
                   || (r.tiempoPrep >= tpo.min && r.tiempoPrep <= tpo.max);
      const okQ    = !filterState.search || r.nombre.toLowerCase().includes(filterState.search);
      return okCat && okCui && okDif && okTime && okQ;
    });

    if (recs.length === 0) {
      listWrap.innerHTML = `
        <div class="empty-state">
          ${uiIcon('search', { size: 32, color: 'var(--ink-3)' })}
          <p class="t-body t-muted">No hay recetas con estos filtros.</p>
        </div>
      `;
      return;
    }

    listWrap.innerHTML = recs.map((r) => RecipeCardHTML(r)).join('');
    listWrap.querySelectorAll('.recipe-card[data-recipe]').forEach((card) => {
      card.addEventListener('click', () => {
        navigate(`/receta/${card.dataset.recipe}`);
      });
    });
  }
  renderList();

  // Cleanup: stop motion listener on screen unmount
  return () => {
    if (stopShake) stopShake();
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

async function surpriseMe() {
  const pool = state.recetas;
  if (pool.length === 0) return;
  await impactMedium();
  const r = pool[Math.floor(Math.random() * pool.length)];
  navigate(`/receta/${r.id}`);
}

function shortCat(c) { return ({ proteina: 'protein', carbohidratos: 'carb', verdura: 'veg', mixto: 'mix' })[c] || 'mix'; }
function shortCui(c) { return ({ mediterraneo: 'medi', italiano: 'it', asiatico: 'asia', nacional: 'nac', internacional: 'intl' })[c] || 'medi'; }
function difChip(d)  {
  if (!d) return '';
  const col = DIFICULTAD_CHIP[d] || 'days';
  const lbl = d.charAt(0).toUpperCase() + d.slice(1);
  return `<span class="chip chip-soft chip-soft-${col}">${lbl}</span>`;
}

function RecipeCardHTML(r) {
  const planeada = state.tuppers.some((t) => t.recetaId === r.id);
  return `
    <article class="recipe-card" data-recipe="${r.id}">
      <div class="ph ph-tone-${shortCat(r.tipoNutricional)}">${foodIcon(r.emoji || '🍽', { size: 56 })}</div>
      <div class="body">
        <h3 class="name">${r.nombre}</h3>
        ${planeada ? `<span class="recipe-badge">${uiIcon('check', { size: 12 })} esta semana</span>` : ''}
        <div class="chips">
          <span class="chip chip-soft chip-soft-${shortCat(r.tipoNutricional)}">${TIPO_LABEL[r.tipoNutricional] || r.tipoNutricional}</span>
          <span class="chip chip-soft chip-soft-${shortCui(r.tipoCocina)}">${COCINA_LABEL[r.tipoCocina] || r.tipoCocina}</span>
          ${difChip(r.dificultad)}
        </div>
        <div class="meta">
          <span class="num">${uiIcon('clock', { size: 14 })}<b>${r.tiempoPrep}</b><span>min</span></span>
          <span class="num">${uiIcon('flame', { size: 14 })}<b>${r.calorias}</b><span>kcal</span></span>
          <span class="num">${uiIcon('calendar', { size: 14 })}<b>${r.diasNevera}</b><span>días</span></span>
        </div>
      </div>
    </article>
  `;
}
