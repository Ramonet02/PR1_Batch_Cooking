/**
 * screens/home.js
 *
 * Home / Weekly dashboard. The visual center of the app.
 *
 * Layout:
 *   - Header (Batch Cook · avatar)
 *   - Day selector L M X J V with status dots
 *   - Selected-day card (tupper detail with 4 dimension chips)
 *   - Recommendations
 *   - Stats (two p5.js canvases)
 *   - Mi Nevera preview
 *
 * Native plugins used: Haptics (on "Listo" tap), Camera (on "Foto" tap — TODO)
 */

import {
  state, setSelectedDay, toggleTupperPreparado, subscribe,
  getRecommendations, getCostePorTupper,
  removeTupper, setManualTupper, setTupperFoto,
} from '../state.js';
import { DeviceShell } from '../components/device-shell.js';
import { makeSheet, closeSheet } from '../components/sheet.js';
import { foodIcon, uiIcon, ICON_PICK_ALL, iconKey } from '../components/icon.js';
import { Prop } from '../components/prop.js';
import { navigate } from '../router.js';
import { impactMedium, notifySuccess } from '../native/haptics.js';
import { takeTupperPhoto } from '../native/camera.js';
import { startNutritionDonut, startCuisineBubbles, startCostLine } from '../canvas/home-stats.js';

const DAYS = [
  { key: 'lunes',     letter: 'L' },
  { key: 'martes',    letter: 'M' },
  { key: 'miercoles', letter: 'X' },
  { key: 'jueves',    letter: 'J' },
  { key: 'viernes',   letter: 'V' },
];

const TIPO_LABEL = {
  proteina:      'Proteína',
  carbohidratos: 'Carbohidratos',
  verdura:       'Verdura',
  mixto:         'Mixto',
};
const COCINA_LABEL = {
  mediterraneo: 'Mediterráneo',
  italiano:     'Italiano',
  asiatico:     'Asiático',
  nacional:     'Nacional',
  internacional:'Internacional',
};
const CANTIDAD_LABEL = {
  pequena: 'Ración pequeña',
  media:   'Ración media',
  grande:  'Ración grande',
};

export function render(root) {
  const { frame, scroll } = DeviceShell({
    currentPath: '/',
  });
  root.appendChild(frame);

  // Decorative background props
  scroll.appendChild(Prop({
    src: 'persona_preparando_fiambrera.png',
    size: 'md',
    style: { top: '-10px', right: '-28px' },
    tilt: 6,
  }));
  scroll.appendChild(Prop({
    src: 'utensilios_cocina.png',
    size: 'sm',
    style: { top: '820px', left: '-24px' },
    tilt: -8,
  }));
  scroll.appendChild(Prop({
    src: 'persona_gestionando_tareas.png',
    size: 'md',
    style: { top: '1560px', right: '-30px' },
    tilt: 4,
  }));

  const container = document.createElement('div');
  container.className = 'home-stack';
  scroll.appendChild(container);

  let cleanups = [];

  function rerender() {
    container.innerHTML = '';
    container.appendChild(HomeHero());
    container.appendChild(WeekBar());
    container.appendChild(DayCard());
    container.appendChild(Recommendations());
    container.appendChild(Stats());
    container.appendChild(NeveraPreview());

    // Cleanup old canvases
    cleanups.forEach((fn) => { try { fn(); } catch {} });
    cleanups = [];

    // Mount canvases
    const nutritionHost = container.querySelector('[data-canvas="nutrition"]');
    const cuisineHost   = container.querySelector('[data-canvas="cuisine"]');
    const costHost      = container.querySelector('[data-canvas="cost-line"]');
    if (nutritionHost) cleanups.push(startNutritionDonut(nutritionHost));
    if (cuisineHost)   cleanups.push(startCuisineBubbles(cuisineHost));
    if (costHost)      cleanups.push(startCostLine(costHost));
  }

  rerender();

  // Re-render on state changes (e.g., toggling preparado from elsewhere).
  // The canvases subscribe independently for live updates.
  const unsubscribe = subscribe(() => {
    updateDayCard();
    updateWeekBar();
  });

  function updateDayCard() {
    const newCard = DayCard();
    const oldCard = container.querySelector('[data-block="daycard"]');
    if (oldCard) oldCard.replaceWith(newCard);
  }
  // Full re-render of the weekbar so day-cat tints + food emojis reflect
  // any add / change / remove tupper operation, not just the preparado flag.
  function updateWeekBar() {
    const newBar = WeekBar();
    const oldBar = container.querySelector('.weekbar');
    if (oldBar) oldBar.replaceWith(newBar);
  }

  return () => {
    unsubscribe();
    cleanups.forEach((fn) => { try { fn(); } catch {} });
  };
}

// ─── Sub-renderers ────────────────────────────────────────────────────────

function WeekBar() {
  const el = document.createElement('div');
  el.className = 'weekbar';
  el.innerHTML = DAYS.map(({ key, letter }) => {
    const t = state.tuppers.find((x) => x.dia === key);
    const receta = t ? (state.recetas ?? []).find((r) => r.id === t.recetaId) : null;
    const food = t?.emoji ?? receta?.emoji ?? null;
    const catKey = t ? shortCat(t.tipoNutricional) : '';
    const isActive = key === state.selectedDay;
    const cls = [
      'day',
      isActive && 'active',
      t?.preparado && 'done',
      t && !t.preparado && 'pending',
      catKey && `day-cat-${catKey}`,
    ].filter(Boolean).join(' ');
    return `
      <button class="${cls}" data-day="${key}">
        <span class="day-pill">
          ${letter}
          ${food ? `<span class="day-food">${foodIcon(food, { size: 16 })}</span>` : ''}
        </span>
        <span class="day-status"></span>
      </button>
    `;
  }).join('');
  el.querySelectorAll('.day').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const day = btn.dataset.day;
      await setSelectedDay(day);
    });
  });
  return el;
}

function DayCard() {
  const t = state.tuppers.find((x) => x.dia === state.selectedDay);
  const card = document.createElement('article');
  card.className = 'daycard';
  card.dataset.block = 'daycard';

  if (!t) {
    card.innerHTML = `
      <div class="daycard-hero daycard-hero-empty">
        <span class="daycard-big-emoji">${foodIcon('📅', { size: 72 })}</span>
      </div>
      <div class="daycard-head">
        <h2 class="daycard-day">${capitalize(state.selectedDay)}</h2>
        <span class="daycard-status"><span class="dot"></span>Sin asignar</span>
      </div>
      <p class="t-body t-muted" style="margin:0">No hay tupper planificado para este día.</p>
      <div class="daycard-actions">
        <button class="btn btn-primary" data-action="asignar">+ Asignar receta</button>
        <button class="btn btn-secondary" data-action="libre">Comida libre</button>
      </div>
    `;
    card.querySelector('[data-action="asignar"]').addEventListener('click', async () => {
      await impactMedium();
      navigate('/planificacion/recetario');
    });
    card.querySelector('[data-action="libre"]').addEventListener('click', async () => {
      await impactMedium();
      openManualTupperSheet({ dia: state.selectedDay });
    });
    return card;
  }

  const catKey = shortCat(t.tipoNutricional);
  const receta = (state.recetas ?? []).find((r) => r.id === t.recetaId);
  const emoji = t.emoji || receta?.emoji || '🍱';
  const tipoClass = `chip-soft-${catKey}`;
  const cocinaClass = `chip-soft-${shortCui(t.tipoCocina)}`;
  const isManual = !t.recetaId;

  card.innerHTML = `
    <div class="daycard-hero daycard-hero-${catKey}${t.fotoUri ? ' daycard-hero-photo' : ''}">
      ${t.fotoUri
        ? `<img class="daycard-photo" src="${t.fotoUri}" alt="Foto del tupper" />`
        : `<span class="daycard-big-emoji">${foodIcon(emoji, { size: 86 })}</span>`
      }
      <button class="daycard-menu" data-action="menu" aria-label="Editar día" title="Editar día">···</button>
      <span class="daycard-status ${t.preparado ? 'done' : ''}">
        <span class="dot"></span>${t.preparado ? 'Preparado' : 'Pendiente'}
      </span>
    </div>
    <div class="daycard-head">
      <h2 class="daycard-day">${capitalize(t.dia)}${isManual ? ' · comida libre' : ''}</h2>
    </div>
    <h3 class="daycard-meal">${t.nombre}</h3>
    <div class="daycard-tags">
      <span class="chip chip-soft ${tipoClass}">${TIPO_LABEL[t.tipoNutricional] || t.tipoNutricional}</span>
      <span class="chip chip-soft ${cocinaClass}">${COCINA_LABEL[t.tipoCocina] || t.tipoCocina}</span>
      <span class="chip chip-soft chip-soft-days">${CANTIDAD_LABEL[t.cantidad] || t.cantidad}</span>
      ${t.diasNevera ? `<span class="chip chip-soft chip-soft-days">🗓 ${t.diasNevera} días</span>` : ''}
    </div>
    ${(() => {
      const coste = getCostePorTupper()[t.id] || 0;
      const items = [];
      if (t.tiempoPrep) items.push(`<span class="num">${uiIcon('clock', { size: 16 })}<b>${t.tiempoPrep}</b><span>min</span></span>`);
      if (t.calorias)   items.push(`<span class="num">${uiIcon('flame', { size: 16 })}<b>${t.calorias}</b><span>kcal</span></span>`);
      if (coste > 0)    items.push(`<span class="num">${uiIcon('euro', { size: 16 })}<b>${coste.toFixed(2).replace('.', ',')}</b><span>€</span></span>`);
      return items.length ? `<div class="daycard-meta">${items.join('')}</div>` : '';
    })()}
    ${t.notas ? `<div class="daycard-note">"${t.notas}"</div>` : ''}
    <div class="daycard-actions">
      <button class="btn btn-secondary" data-action="foto">${uiIcon('camera', { size: 16 })} ${t.fotoUri ? 'Cambiar foto' : 'Foto'}</button>
      <button class="btn btn-primary" data-action="listo">${t.preparado ? uiIcon('refresh', { size: 16 }) + ' Deshacer' : uiIcon('check', { size: 16 }) + ' Listo'}</button>
    </div>
  `;

  card.querySelector('[data-action="listo"]').addEventListener('click', async () => {
    await impactMedium();
    await toggleTupperPreparado(t.id);
  });

  card.querySelector('[data-action="foto"]').addEventListener('click', async () => {
    await impactMedium();
    const dataUrl = await takeTupperPhoto();
    if (!dataUrl) return; // user cancelled
    await setTupperFoto(t.id, dataUrl);
    await notifySuccess();
  });

  card.querySelector('[data-action="menu"]').addEventListener('click', async () => {
    await impactMedium();
    openTupperEditSheet({ tupper: t });
  });

  return card;
}

function Recommendations() {
  const recs = getRecommendations();
  const wrap = document.createElement('section');
  wrap.innerHTML = `<h2 class="section-title" style="margin-bottom:12px">Recomendaciones</h2>`;
  const list = document.createElement('div');
  list.className = 'recs';
  if (recs.length === 0) {
    list.innerHTML = `<div class="banner banner-ok"><span class="glyph">✓</span><span>Semana bien planificada</span></div>`;
  } else {
    list.innerHTML = recs.map((r) => `
      <div class="banner banner-${r.kind === 'warn' ? 'warn' : 'ok'}">
        <span class="glyph">${r.kind === 'warn' ? '!' : '✓'}</span>
        <span>${r.text}</span>
        <span class="chev">›</span>
      </div>
    `).join('');
  }
  wrap.appendChild(list);
  return wrap;
}

function Stats() {
  const wrap = document.createElement('section');
  wrap.innerHTML = `
    <div class="section-title-row">
      <h2 class="section-title">Stats de la semana</h2>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="title">Balance nutricional</span>
        <span class="sub">kcal por categoría</span>
        <div class="canvas-host" data-canvas="nutrition"></div>
        <div class="stat-legend">
          <span class="em protein">Prot.</span>
          <span class="em carb">Carb.</span>
          <span class="em veg">Verd.</span>
          <span class="em mix">Mixto</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="title">Tipos de cocina</span>
        <span class="sub">frecuencia</span>
        <div class="canvas-host" data-canvas="cuisine"></div>
        <div class="stat-legend">
          <span class="em medi">Medi.</span>
          <span class="em it">Italiano</span>
          <span class="em nac">Nacional</span>
        </div>
      </div>
      <div class="stat-card stat-card-wide">
        <span class="title">Precio medio por tupper</span>
        <span class="sub">últimas semanas · semana actual destacada</span>
        <div class="canvas-host canvas-host-line" data-canvas="cost-line"></div>
        <div class="stat-legend">
          <span class="em medi">Histórico</span>
          <span class="em it">Esta semana</span>
        </div>
      </div>
    </div>
  `;
  return wrap;
}

function NeveraPreview() {
  const wrap = document.createElement('section');
  const top3 = [...state.nevera].sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 3);

  wrap.innerHTML = `
    <div class="section-title-row" style="margin-bottom:12px">
      <h2 class="section-title">Mi Nevera</h2>
      <button class="add-link" data-action="open-nevera-add">Añadir</button>
    </div>
    <button type="button" class="nevera-preview" data-action="open-nevera">
      ${top3.map((i) => `
        <div class="nevera-row ${i.diasRestantes <= 2 ? 'warn' : ''}">
          <span class="emj">${foodIcon(i.emoji, { size: 32 })}</span>
          <div>
            <div class="name">${i.nombre}</div>
            <div class="qty">${i.cantidad}${i.nota ? ` · ${i.nota}` : ''}</div>
          </div>
          <span class="days">${i.diasRestantes <= 2 ? '⚠ ' : ''}${i.diasRestantes} ${i.diasRestantes === 1 ? 'día' : 'días'}</span>
          <span class="chev">›</span>
        </div>
      `).join('')}
      <div class="nevera-foot">
        <span class="add-link" aria-hidden="true">Ver todos</span>
      </div>
    </button>
  `;
  wrap.querySelector('[data-action="open-nevera"]').addEventListener('click', async () => {
    await impactMedium();
    navigate('/planificacion/nevera');
  });
  wrap.querySelector('[data-action="open-nevera-add"]').addEventListener('click', async (e) => {
    e.stopPropagation();
    await impactMedium();
    // sessionStorage flag picked up by the nevera screen on mount
    sessionStorage.setItem('nevera.openAdd', '1');
    navigate('/planificacion/nevera');
  });
  return wrap;
}

function HomeHero() {
  const planned = state.tuppers.length;
  const done = state.tuppers.filter((t) => t.preparado).length;
  const nombre = state.user?.nombre?.split(' ')[0] ?? 'Chef';

  const el = document.createElement('div');
  el.className = 'home-hero';
  el.innerHTML = `
    <p class="home-hero__label">${getGreeting()}</p>
    <h1 class="home-hero__name">${nombre}.</h1>
    <p class="home-hero__sub">${
      planned > 0
        ? `${done} de ${planned} tuppers listos`
        : 'Empieza a planificar tu semana'
    }</p>
  `;
  return el;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días Ramón';
  if (h < 20) return 'Buenas tardes Ramón';
  return 'Buenas noches';
}

// ─── Edit-day sheets (cambiar receta · comida libre · quitar) ───────────

function openTupperEditSheet({ tupper }) {
  const backdrop = makeSheet({
    eyebrow: 'Editar día',
    title: `${capitalize(tupper.dia)}`,
    bodyHTML: `
      <p class="t-body-sm t-muted" style="margin: 0 0 var(--space-3)">
        Actualmente: <b style="color: var(--ink)">${tupper.nombre}</b>
      </p>
      <div class="sheet-actions">
        <button class="sheet-action" data-act="receta">
          <span class="ico">${foodIcon('🍽', { size: 24 })}</span>
          <div class="meta"><b>Cambiar por una receta</b><span>Eligela del recetario</span></div>
          <span class="chev">›</span>
        </button>
        <button class="sheet-action" data-act="libre">
          <span class="ico">${uiIcon('edit', { size: 22 })}</span>
          <div class="meta"><b>Comida libre</b><span>Escribe qué comerás</span></div>
          <span class="chev">›</span>
        </button>
        <button class="sheet-action sheet-action-danger" data-act="quitar">
          <span class="ico">${uiIcon('trash', { size: 22 })}</span>
          <div class="meta"><b>Quitar tupper</b><span>Deja el día sin asignar</span></div>
          <span class="chev">›</span>
        </button>
      </div>
    `,
    foot: '', // no footer — actions live in the body
  });

  backdrop.querySelector('[data-act="receta"]').addEventListener('click', () => {
    closeSheet(backdrop);
    navigate('/planificacion/recetario');
  });
  backdrop.querySelector('[data-act="libre"]').addEventListener('click', () => {
    closeSheet(backdrop);
    openManualTupperSheet({ dia: tupper.dia, prefill: tupper });
  });
  backdrop.querySelector('[data-act="quitar"]').addEventListener('click', () => {
    closeSheet(backdrop);
    openConfirmRemoveSheet({ tupper });
  });
}

function openConfirmRemoveSheet({ tupper }) {
  const backdrop = makeSheet({
    eyebrow: 'Confirmar',
    title: '¿Quitar este tupper?',
    bodyHTML: `
      <p class="t-body" style="margin: 0">
        Se eliminará "<b>${tupper.nombre}</b>" del ${capitalize(tupper.dia)}. Podrás asignar otra receta o comida libre cuando quieras.
      </p>
    `,
    foot: `
      <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
      <button type="button" class="btn btn-tomate" data-confirm>Sí, quitar</button>
    `,
  });
  backdrop.querySelector('[data-confirm]').addEventListener('click', async () => {
    await impactMedium();
    await removeTupper(tupper.id);
    await notifySuccess();
    closeSheet(backdrop);
  });
}

const NUTRI_OPTIONS = [
  { value: 'proteina',      label: 'Proteína' },
  { value: 'carbohidratos', label: 'Carbohidratos' },
  { value: 'verdura',       label: 'Verdura' },
  { value: 'mixto',         label: 'Mixto' },
];
const CANTIDAD_OPTIONS = [
  { value: 'pequena', label: 'Pequeña' },
  { value: 'media',   label: 'Media' },
  { value: 'grande',  label: 'Grande' },
];
const QUICK_EMOJIS = ICON_PICK_ALL;

function openManualTupperSheet({ dia, prefill }) {
  // If we have a prefill, use only its values if it's manual (no receta).
  const seed = (prefill && !prefill.recetaId) ? prefill : {};
  const state0 = {
    emoji:          seed.emoji          || '🍱',
    tipoNutricional: seed.tipoNutricional || 'mixto',
    cantidad:       seed.cantidad       || 'media',
  };

  const backdrop = makeSheet({
    eyebrow: 'Comida libre',
    title: `Para el ${capitalize(dia)}`,
    bodyHTML: `
      <form id="manual-form" class="sheet-form">
        <section class="form-field">
          <label class="form-label" for="ml-nombre">Qué comes</label>
          <input id="ml-nombre" name="nombre" class="input" placeholder="Ej. Macarrones con tomate y una manzana" autocomplete="off" required value="${seed.nombre || ''}" />
        </section>

        <section class="form-field">
          <label class="form-label">Icono</label>
          <div class="emoji-grid emoji-grid-sm" data-emoji-grid>
            ${QUICK_EMOJIS.map((e) => `
              <button type="button" class="emoji-pick${e === iconKey(state0.emoji) ? ' selected' : ''}" data-emoji="${e}">${foodIcon(e, { size: 26 })}</button>
            `).join('')}
          </div>
        </section>

        <section class="form-field">
          <label class="form-label">Tipo</label>
          <div class="chip-picker" data-chip-group="tipoNutricional">
            ${NUTRI_OPTIONS.map((o) => `
              <button type="button" class="chip${o.value === state0.tipoNutricional ? ' chip-active' : ''}" data-value="${o.value}">${o.label}</button>
            `).join('')}
          </div>
        </section>

        <section class="form-field">
          <label class="form-label">Ración</label>
          <div class="chip-picker" data-chip-group="cantidad">
            ${CANTIDAD_OPTIONS.map((o) => `
              <button type="button" class="chip${o.value === state0.cantidad ? ' chip-active' : ''}" data-value="${o.value}">${o.label}</button>
            `).join('')}
          </div>
        </section>

        <p class="form-error" data-error style="display:none"></p>
      </form>
    `,
    foot: `
      <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
      <button type="submit" form="manual-form" class="btn btn-primary">Guardar</button>
    `,
  });

  // Emoji picker
  const emojiGrid = backdrop.querySelector('[data-emoji-grid]');
  emojiGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-pick');
    if (!btn) return;
    state0.emoji = btn.dataset.emoji;
    emojiGrid.querySelectorAll('.emoji-pick').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // Chip pickers
  backdrop.querySelectorAll('.chip-picker').forEach((group) => {
    const key = group.dataset.chipGroup;
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      state0[key] = btn.dataset.value;
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip-active'));
      btn.classList.add('chip-active');
    });
  });

  const form = backdrop.querySelector('#manual-form');
  const errorEl = backdrop.querySelector('[data-error]');
  setTimeout(() => backdrop.querySelector('#ml-nombre').focus(), 220);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = form.elements.nombre.value.trim();
    if (!nombre) {
      errorEl.textContent = 'Cuéntame qué vas a comer.';
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';
    await impactMedium();
    await setManualTupper({
      dia,
      nombre,
      emoji: state0.emoji,
      tipoNutricional: state0.tipoNutricional,
      cantidad: state0.cantidad,
      tipoCocina: 'nacional',
    });
    await notifySuccess();
    closeSheet(backdrop);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function shortCat(c) {
  return ({ proteina: 'protein', carbohidratos: 'carb', verdura: 'veg', mixto: 'mix' })[c] || 'days';
}
function shortCui(c) {
  return ({ mediterraneo: 'medi', italiano: 'it', asiatico: 'asia', nacional: 'nac', internacional: 'intl' })[c] || 'medi';
}
