/**
 * screens/nevera.js
 *
 * Tab 1 · Mi Nevera. Ingredient inventory grouped by expiration:
 *   - ⚠ Caducan pronto (≤ 2 días)
 *   - ✓ En buen estado
 *
 * Sorted by `diasRestantes` ascending so the urgent items come first.
 *
 * Actions:
 *   - Tap on any row → opens an info sheet with an "Eliminar" CTA
 *   - "+ Añadir ingrediente" → opens a form sheet
 *   - sessionStorage flag `nevera.openAdd` opens the add sheet on mount
 *     (used by the Home preview "Añadir" link)
 */

import { state, addNeveraItem, removeNeveraItem, subscribe } from '../state.js';
import { DeviceShell } from '../components/device-shell.js';
import { Subtabs } from '../components/subtabs.js';
import { makeSheet, closeSheet } from '../components/sheet.js';
import { foodIcon, uiIcon, ICON_INGREDIENTES } from '../components/icon.js';
import { Prop } from '../components/prop.js';
import { impactMedium, notifySuccess } from '../native/haptics.js';

const CATEGORIAS = [
  { value: 'proteina',      label: 'Proteína' },
  { value: 'carbohidratos', label: 'Carbohidratos' },
  { value: 'verdura',       label: 'Verdura' },
  { value: 'mixto',         label: 'Mixto' },
];

const CAT_LABEL = {
  proteina: 'Proteína',
  carbohidratos: 'Carbohidratos',
  verdura: 'Verdura',
  mixto: 'Mixto',
};

// ── Filtros disponibles ─────────────────────────────────────────────────

const SORT_OPTIONS = [
  { id: 'caducidad', label: 'Caducidad', desc: 'Caducan antes primero' },
  { id: 'nombre',    label: 'Nombre',    desc: 'A → Z' },
  { id: 'categoria', label: 'Categoría', desc: 'Agrupado por tipo' },
  { id: 'recientes', label: 'Recién añadido', desc: 'Más reciente arriba' },
];

const CAT_FILTERS = [
  { id: 'todas',         label: 'Todas',         cat: null },
  { id: 'proteina',      label: 'Proteína',      cat: 'proteina' },
  { id: 'carbohidratos', label: 'Carbohidratos', cat: 'carbohidratos' },
  { id: 'verdura',       label: 'Verdura',       cat: 'verdura' },
  { id: 'mixto',         label: 'Mixto',         cat: 'mixto' },
];

// Persisted across renders within the same session
let filterState = { sort: 'caducidad', cat: 'todas' };

const EMOJI_NEVERA = ICON_INGREDIENTES;

export function render(root) {
  const { frame, scroll } = DeviceShell({
    currentPath: '/planificacion/nevera',
  });
  root.appendChild(frame);

  // Decorative background props
  scroll.appendChild(Prop({
    src: 'contenedor_para_medir.png',
    size: 'sm',
    style: { top: '60px', right: '-22px' },
    tilt: 8,
  }));
  scroll.appendChild(Prop({
    src: 'olla.png',
    size: 'md',
    style: { top: '380px', left: '-30px' },
    tilt: -6,
  }));

  scroll.appendChild(Subtabs('nevera'));

  // ── Compact filter pills (dropdowns) ───────────────────────
  const filtersRow = document.createElement('div');
  filtersRow.className = 'filters-compact';
  scroll.appendChild(filtersRow);

  function renderFilterPills() {
    const sort = SORT_OPTIONS.find((x) => x.id === filterState.sort);
    const cat  = CAT_FILTERS.find((x) => x.id === filterState.cat);
    const catActive = filterState.cat !== 'todas';
    const sortActive = filterState.sort !== 'caducidad'; // default
    const anyActive = catActive || sortActive;
    filtersRow.innerHTML = `
      <button type="button" class="filter-pill${sortActive ? ' has-filter' : ''}" data-open="sort">
        <span class="filter-pill-label">Orden</span>
        <span class="filter-pill-sep">·</span>
        <span class="filter-pill-value">${sort?.label ?? 'Caducidad'}</span>
        <span class="filter-pill-caret">▾</span>
      </button>
      <button type="button" class="filter-pill${catActive ? ' has-filter' : ''}" data-open="cat">
        <span class="filter-pill-label">Tipo</span>
        <span class="filter-pill-sep">·</span>
        <span class="filter-pill-value">${cat?.label ?? 'Todas'}</span>
        <span class="filter-pill-caret">▾</span>
      </button>
      ${anyActive ? `<button type="button" class="filter-pill-clear" data-clear>Limpiar</button>` : ''}
    `;
    filtersRow.querySelector('[data-open="sort"]').addEventListener('click', async () => {
      await impactMedium();
      openFilterSheet('sort');
    });
    filtersRow.querySelector('[data-open="cat"]').addEventListener('click', async () => {
      await impactMedium();
      openFilterSheet('cat');
    });
    const clearBtn = filtersRow.querySelector('[data-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        await impactMedium();
        filterState.sort = 'caducidad';
        filterState.cat = 'todas';
        renderFilterPills();
        renderList();
      });
    }
  }
  renderFilterPills();

  function openFilterSheet(kind) {
    const isSort = kind === 'sort';
    const list = isSort ? SORT_OPTIONS : CAT_FILTERS;
    const selectedKey = isSort ? filterState.sort : filterState.cat;
    const title = isSort ? 'Ordenar por' : 'Filtrar por tipo';

    const backdrop = makeSheet({
      eyebrow: 'Mi Nevera',
      title,
      bodyHTML: `
        <div class="filter-options">
          ${list.map((f) => `
            <button type="button" class="filter-option${f.id === selectedKey ? ' selected' : ''}" data-id="${f.id}">
              <span class="filter-option-body">
                <span class="filter-option-label">${f.label}</span>
                ${f.desc ? `<span class="filter-option-desc">${f.desc}</span>` : ''}
              </span>
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
        if (isSort) filterState.sort = value;
        else        filterState.cat  = value;
        renderFilterPills();
        renderList();
        closeSheet(backdrop);
      });
    });
  }

  // List container — re-renders on state changes and filter changes
  const listWrap = document.createElement('div');
  listWrap.className = 'nevera-list';
  scroll.appendChild(listWrap);

  function renderList() {
    listWrap.innerHTML = '';

    // 1. Apply category filter
    const filterCat = CAT_FILTERS.find((x) => x.id === filterState.cat)?.cat;
    let items = state.nevera.slice();
    if (filterCat) items = items.filter((i) => i.categoria === filterCat);

    if (state.nevera.length === 0) {
      listWrap.innerHTML = `
        <div class="empty-state">
          ${foodIcon('🧊', { size: 48 })}
          <p class="t-body t-muted">Tu nevera está vacía.</p>
        </div>
      `;
      return;
    }
    if (items.length === 0) {
      listWrap.innerHTML = `
        <div class="empty-state">
          ${uiIcon('search', { size: 32, color: 'var(--ink-3)' })}
          <p class="t-body t-muted">No hay ingredientes con este filtro.</p>
        </div>
      `;
      return;
    }

    // 2. Apply sort + grouping
    switch (filterState.sort) {
      case 'caducidad': {
        const sorted = items.sort((a, b) => a.diasRestantes - b.diasRestantes);
        const expiring = sorted.filter((i) => i.diasRestantes <= 2);
        const ok       = sorted.filter((i) => i.diasRestantes > 2);
        if (expiring.length) listWrap.appendChild(Section('warn', '⚠ Caducan pronto', expiring));
        if (ok.length)       listWrap.appendChild(Section('ok',   '✓ En buen estado', ok));
        break;
      }
      case 'nombre': {
        const sorted = items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        listWrap.appendChild(Section('plain', 'Todos los ingredientes', sorted));
        break;
      }
      case 'categoria': {
        // Group by categoria
        const groups = new Map();
        items.forEach((i) => {
          const k = i.categoria || 'mixto';
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(i);
        });
        // Order categories deterministically
        const order = ['proteina', 'carbohidratos', 'verdura', 'mixto'];
        order.forEach((k) => {
          if (!groups.has(k)) return;
          const groupItems = groups.get(k).sort((a, b) => a.diasRestantes - b.diasRestantes);
          listWrap.appendChild(Section('plain', CAT_LABEL[k] || k, groupItems));
        });
        break;
      }
      case 'recientes': {
        // Most recent first — by id (which we generate from Date.now())
        const sorted = items.sort((a, b) => {
          const aN = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
          const bN = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
          return bN - aN;
        });
        listWrap.appendChild(Section('plain', 'Recién añadidos', sorted));
        break;
      }
    }

    // Wire row taps → detail sheet
    listWrap.querySelectorAll('[data-item-id]').forEach((row) => {
      row.addEventListener('click', async () => {
        await impactMedium();
        const item = state.nevera.find((x) => x.id === row.dataset.itemId);
        if (item) openItemSheet({ item });
      });
    });
  }
  renderList();

  // Add link
  const addRow = document.createElement('div');
  addRow.style.textAlign = 'center';
  addRow.style.padding = 'var(--space-4) 0';
  addRow.innerHTML = `<button class="add-link" data-action="add">Añadir ingrediente</button>`;
  scroll.appendChild(addRow);
  addRow.querySelector('[data-action="add"]').addEventListener('click', async () => {
    await impactMedium();
    openAddSheet();
  });

  // Auto-open from Home shortcut
  if (sessionStorage.getItem('nevera.openAdd') === '1') {
    sessionStorage.removeItem('nevera.openAdd');
    setTimeout(() => openAddSheet(), 150);
  }

  // Live updates after add/remove
  const unsubscribe = subscribe(() => renderList());
  return () => unsubscribe();
}

// ─── Sections / rows ────────────────────────────────────────────────────

function Section(kind, title, items) {
  const sec = document.createElement('section');
  sec.className = `section-block ${kind}`;
  sec.innerHTML = `
    <div class="title">${title}</div>
    <div class="stack-sm" style="gap:8px">
      ${items.map((i) => IngCardHTML(i)).join('')}
    </div>
  `;
  return sec;
}

function IngCardHTML(i) {
  const warn = i.diasRestantes <= 2;
  return `
    <button type="button" class="ing-card ${warn ? 'warn' : ''}" data-item-id="${i.id}">
      <span class="emj">${foodIcon(i.emoji, { size: 32 })}</span>
      <div>
        <div class="name">${i.nombre}</div>
        <div class="qty">${i.cantidad}${i.nota ? ` · ${i.nota}` : ''}</div>
      </div>
      <span class="days-pill">${i.diasRestantes} ${i.diasRestantes === 1 ? 'día' : 'días'}</span>
      <span class="chev">›</span>
    </button>
  `;
}

// ─── Sheets ─────────────────────────────────────────────────────────────

function openItemSheet({ item }) {
  const warn = item.diasRestantes <= 2;
  const backdrop = makeSheet({
    eyebrow: 'Ingrediente',
    title: item.nombre,
    bodyHTML: `
      <div class="item-detail">
        <div class="item-detail-row">
          <span class="t-caption">Cantidad</span>
          <span class="item-detail-value">${item.cantidad}</span>
        </div>
        <div class="item-detail-row">
          <span class="t-caption">Caducidad</span>
          <span class="item-detail-value ${warn ? 't-error' : ''}">
            ${warn ? '⚠ ' : ''}${item.diasRestantes} ${item.diasRestantes === 1 ? 'día' : 'días'}
          </span>
        </div>
        ${item.nota ? `
          <div class="item-detail-row">
            <span class="t-caption">Nota</span>
            <span class="item-detail-value">${item.nota}</span>
          </div>
        ` : ''}
      </div>
    `,
    foot: `
      <button type="button" class="btn btn-ghost" data-close>Cerrar</button>
      <button type="button" class="btn btn-destructive" data-remove>Eliminar</button>
    `,
  });
  backdrop.querySelector('[data-remove]').addEventListener('click', async () => {
    await impactMedium();
    await removeNeveraItem(item.id);
    await notifySuccess();
    closeSheet(backdrop);
  });
}

function openAddSheet() {
  const formState = {
    emoji:     EMOJI_NEVERA[0],
    categoria: 'proteina',
  };

  const backdrop = makeSheet({
    eyebrow: 'Mi Nevera',
    title: 'Añadir ingrediente',
    bodyHTML: `
      <form id="nev-form" class="sheet-form">
        <section class="form-field">
          <label class="form-label" for="nv-nombre">Nombre</label>
          <input id="nv-nombre" name="nombre" class="input" placeholder="Ej. Yogur natural" autocomplete="off" required />
        </section>

        <section class="form-field">
          <label class="form-label" for="nv-cant">Cantidad</label>
          <input id="nv-cant" name="cantidad" class="input" placeholder="Ej. 500 g · 4 ud · 1 L" autocomplete="off" required />
        </section>

        <section class="form-field">
          <label class="form-label">Icono</label>
          <div class="emoji-grid" data-emoji-grid>
            ${EMOJI_NEVERA.map((e, i) => `
              <button type="button" class="emoji-pick${i === 0 ? ' selected' : ''}" data-emoji="${e}">${foodIcon(e, { size: 26 })}</button>
            `).join('')}
          </div>
        </section>

        <section class="form-field">
          <label class="form-label">Categoría</label>
          <div class="chip-picker" data-chip-group="categoria">
            ${CATEGORIAS.map((c) => `
              <button type="button" class="chip${c.value === 'proteina' ? ' chip-active' : ''}" data-value="${c.value}">${c.label}</button>
            `).join('')}
          </div>
        </section>

        <section class="form-field">
          <label class="form-label" for="nv-dias">Días hasta caducar</label>
          <input id="nv-dias" name="diasRestantes" class="input" type="number" inputmode="numeric" min="0" max="60" value="5" required />
        </section>

        <section class="form-field">
          <label class="form-label" for="nv-nota">Nota (opcional)</label>
          <input id="nv-nota" name="nota" class="input" placeholder="Ej. abierto hace 2 días" autocomplete="off" />
        </section>

        <p class="form-error" data-error style="display:none"></p>
      </form>
    `,
    foot: `
      <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
      <button type="submit" form="nev-form" class="btn btn-primary">Guardar</button>
    `,
  });

  // Emoji picker
  const emojiGrid = backdrop.querySelector('[data-emoji-grid]');
  emojiGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-pick');
    if (!btn) return;
    formState.emoji = btn.dataset.emoji;
    emojiGrid.querySelectorAll('.emoji-pick').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // Categoría picker
  backdrop.querySelectorAll('.chip-picker').forEach((group) => {
    const key = group.dataset.chipGroup;
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      formState[key] = btn.dataset.value;
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip-active'));
      btn.classList.add('chip-active');
    });
  });

  const form = backdrop.querySelector('#nev-form');
  const errorEl = backdrop.querySelector('[data-error]');
  setTimeout(() => backdrop.querySelector('#nv-nombre').focus(), 220);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = form.elements.nombre.value.trim();
    const cantidad = form.elements.cantidad.value.trim();
    const dias = parseInt(form.elements.diasRestantes.value, 10);
    if (!nombre || !cantidad) {
      errorEl.textContent = 'Nombre y cantidad son obligatorios.';
      errorEl.style.display = 'block';
      return;
    }
    if (Number.isNaN(dias) || dias < 0) {
      errorEl.textContent = 'Pon un número válido de días.';
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';
    await impactMedium();
    await addNeveraItem({
      nombre,
      cantidad,
      emoji: formState.emoji,
      categoria: formState.categoria,
      diasRestantes: dias,
      nota: form.elements.nota.value.trim(),
    });
    await notifySuccess();
    closeSheet(backdrop);
  });
}
