/**
 * screens/compra.js
 *
 * Tab 1 · Lista de la Compra.
 *
 * Mix of two sources:
 *  · Auto: ingredientes de las recetas planificadas (descontando lo que ya está
 *    en Mi Nevera).
 *  · Manual: items añadidos por el usuario (state.compra.extras).
 *
 * Cada item permite añadir un precio (€). El total y el coste medio por
 * tupper se calculan en la cabecera. Los checks (comprados) son persistentes.
 */

import {
  state,
  getShoppingList, getCompraStats,
  setItemPrice, toggleItemComprado,
  addCompraExtra, removeCompraExtra,
  subscribe,
} from '../state.js';
import { DeviceShell } from '../components/device-shell.js';
import { Subtabs } from '../components/subtabs.js';
import { makeSheet, closeSheet } from '../components/sheet.js';
import { foodIcon, uiIcon } from '../components/icon.js';
import { Prop } from '../components/prop.js';
import { impactMedium, notifySuccess } from '../native/haptics.js';

const GROUP_LABELS = {
  proteinas: 'Proteínas',
  verduras:  'Verduras',
  otros:     'Otros',
};

export function render(root) {
  const { frame, scroll } = DeviceShell({
    currentPath: '/planificacion/compra',
  });
  root.appendChild(frame);

  // Decorative background props
  scroll.appendChild(Prop({
    src: 'persona_gestionando_gastos.png',
    size: 'md',
    style: { top: '4px', right: '-8px' },
    tilt: 5,
  }));

  scroll.appendChild(Subtabs('compra'));

  // Header — totals panel + share
  const head = document.createElement('section');
  scroll.appendChild(head);

  // Groups container
  const groupsWrap = document.createElement('div');
  scroll.appendChild(groupsWrap);

  // Add manual
  const addRow = document.createElement('div');
  addRow.style.textAlign = 'center';
  addRow.style.padding = 'var(--space-4) 0 var(--space-6)';
  addRow.innerHTML = `<button class="add-link" data-action="add-manual">Añadir producto manual</button>`;
  // Anchor the báscula prop to the addRow so it always sits next to the
  // "Añadir producto manual" button regardless of list length.
  addRow.appendChild(Prop({
    src: 'bascula.png',
    size: 'sm',
    style: { top: '-8px', left: '-8px' },
    tilt: -6,
  }));
  scroll.appendChild(addRow);
  addRow.querySelector('[data-action="add-manual"]').addEventListener('click', async () => {
    await impactMedium();
    openAddExtraSheet();
  });

  function renderAll() {
    head.innerHTML = HeaderHTML();

    groupsWrap.innerHTML = '';
    const grouped = getShoppingList();
    const empty = Object.values(grouped).every((g) => g.length === 0);
    if (empty) {
      groupsWrap.innerHTML = `
        <div class="empty-state">
          ${foodIcon('🛒', { size: 48 })}
          <p class="t-body t-muted">Tu lista está vacía. Planifica tuppers o añade productos manualmente.</p>
        </div>
      `;
      return;
    }

    Object.entries(grouped).forEach(([key, items]) => {
      if (!items.length) return;
      const pending = items.filter((i) => !i.comprado && !i.inNevera).length;
      const grp = document.createElement('section');
      grp.className = 'cl-group';
      grp.innerHTML = `
        <div class="label">
          <span class="title">${GROUP_LABELS[key]}</span>
          <span class="count">${pending}/${items.length} por comprar</span>
        </div>
        <div class="cl-list">
          ${items.map((i) => ItemHTML(i)).join('')}
        </div>
      `;

      grp.querySelectorAll('.cl-item').forEach((row) => {
        const nombre = row.dataset.nombre;
        const manualId = row.dataset.manualId || null;

        // Tap on checkbox area or row body → toggle comprado
        row.querySelector('[data-tap="toggle"]').addEventListener('click', async (e) => {
          e.stopPropagation();
          await impactMedium();
          await toggleItemComprado(nombre);
        });
        // Tap on price chip → open edit sheet
        row.querySelector('[data-tap="price"]').addEventListener('click', async (e) => {
          e.stopPropagation();
          await impactMedium();
          openPriceSheet({
            nombre,
            cantidad: row.dataset.cantidad,
            manualId,
          });
        });
      });

      groupsWrap.appendChild(grp);
    });
  }
  renderAll();

  const unsubscribe = subscribe(() => renderAll());
  return () => unsubscribe();
}

// ─── Header (totals panel) ──────────────────────────────────────────────

function HeaderHTML() {
  const s = getCompraStats();
  const fmt = (v) => v.toFixed(2).replace('.', ',') + ' €';
  return `
    <div class="compra-head">
      <div class="compra-meta">
        <div class="week">Semana 20</div>
        <div class="note">${s.numTuppers} tuppers · ${s.pendientes} por comprar</div>
      </div>
    </div>
    <div class="compra-totals">
      <div class="compra-stat">
        <span class="caption">Total compra</span>
        <span class="value">${s.totalCompra > 0 ? fmt(s.totalCompra) : '—'}</span>
      </div>
      <div class="compra-stat-divider"></div>
      <div class="compra-stat">
        <span class="caption">Coste medio / tupper</span>
        <span class="value t-tomate">${s.costePorTupperMedio > 0 ? fmt(s.costePorTupperMedio) : '—'}</span>
      </div>
    </div>
    ${s.withPrice < s.totalItems ? `
      <p class="compra-hint t-body-sm t-muted">
        ${s.withPrice} de ${s.totalItems} productos con precio.
        Toca el chip <b>+ precio</b> para añadir el coste de un producto.
      </p>
    ` : ''}
  `;
}

// ─── Item row ───────────────────────────────────────────────────────────

function ItemHTML(i) {
  const done = i.comprado || i.inNevera;
  const priceLabel = i.precio != null && i.precio > 0
    ? i.precio.toFixed(2).replace('.', ',') + ' €'
    : '+ precio';
  return `
    <div class="cl-item ${done ? 'done' : ''}${i.manual ? ' is-manual' : ''}"
         data-nombre="${escapeAttr(i.nombre)}"
         data-cantidad="${escapeAttr(i.cantidad)}"
         ${i.manual ? `data-manual-id="${i.id}"` : ''}>
      <button class="cl-tap" data-tap="toggle" aria-label="Toggle comprado">
        <span class="cl-checkbox"></span>
        <span class="cl-name">
          <span class="name">${i.nombre}</span>
          ${i.inNevera ? `<span class="note">(en nevera)</span>` : ''}
          ${i.manual ? `<span class="note">manual</span>` : ''}
        </span>
      </button>
      <button class="cl-price ${i.precio ? 'set' : 'empty'}" data-tap="price" aria-label="Editar precio">
        ${priceLabel}
      </button>
      <span class="qty">${i.cantidad || ''}</span>
    </div>
  `;
}

function escapeAttr(s) {
  return (s || '').replace(/"/g, '&quot;');
}

// ─── Sheets ─────────────────────────────────────────────────────────────

function openPriceSheet({ nombre, cantidad, manualId }) {
  const currentRaw = (state.compra?.prices?.[nombre.toLowerCase().trim()]) ?? '';
  const current = currentRaw === '' ? '' : String(currentRaw).replace('.', ',');

  const backdrop = makeSheet({
    eyebrow: 'Precio',
    title: nombre,
    bodyHTML: `
      ${cantidad ? `<p class="t-body-sm t-muted" style="margin: 0 0 var(--space-3)">Cantidad: ${cantidad}</p>` : ''}
      <form id="price-form" class="sheet-form">
        <section class="form-field">
          <label class="form-label" for="price-input">Precio total (€)</label>
          <div class="price-input-row">
            <input
              id="price-input"
              name="precio"
              class="input"
              type="text"
              inputmode="decimal"
              placeholder="0,00"
              value="${current}"
              autocomplete="off"
            />
            <span class="price-input-unit">€</span>
          </div>
          <p class="t-body-sm t-muted" style="margin: var(--space-2) 0 0">
            Si dejas el precio vacío, se borrará.
          </p>
        </section>
      </form>
    `,
    foot: `
      ${manualId ? `<button type="button" class="btn btn-destructive" data-remove>Eliminar</button>` : `<button type="button" class="btn btn-ghost" data-close>Cancelar</button>`}
      <button type="submit" form="price-form" class="btn btn-primary">Guardar</button>
    `,
  });

  const input = backdrop.querySelector('#price-input');
  setTimeout(() => { input.focus(); input.select(); }, 220);

  if (manualId) {
    backdrop.querySelector('[data-remove]').addEventListener('click', async () => {
      await impactMedium();
      await removeCompraExtra(manualId);
      await notifySuccess();
      closeSheet(backdrop);
    });
  }

  backdrop.querySelector('#price-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = input.value.replace(',', '.').trim();
    const num = raw === '' ? null : Number(raw);
    if (raw !== '' && (Number.isNaN(num) || num < 0)) {
      input.focus();
      input.select();
      return;
    }
    await impactMedium();
    await setItemPrice(nombre, raw === '' ? '' : num);
    await notifySuccess();
    closeSheet(backdrop);
  });
}

const CATS = [
  { value: 'proteinas', label: 'Proteína' },
  { value: 'verduras',  label: 'Verdura' },
  { value: 'otros',     label: 'Otros' },
];

function openAddExtraSheet() {
  const formState = { categoria: 'otros' };

  const backdrop = makeSheet({
    eyebrow: 'Lista de la compra',
    title: 'Añadir producto',
    bodyHTML: `
      <form id="add-extra-form" class="sheet-form">
        <section class="form-field">
          <label class="form-label" for="ce-nombre">Producto</label>
          <input id="ce-nombre" name="nombre" class="input" placeholder="Ej. Pan integral" autocomplete="off" required />
        </section>

        <section class="form-field">
          <label class="form-label" for="ce-cant">Cantidad</label>
          <input id="ce-cant" name="cantidad" class="input" placeholder="Ej. 1 barra · 500 g" autocomplete="off" />
        </section>

        <section class="form-field">
          <label class="form-label">Categoría</label>
          <div class="chip-picker" data-chip-group="categoria">
            ${CATS.map((c) => `
              <button type="button" class="chip${c.value === 'otros' ? ' chip-active' : ''}" data-value="${c.value}">${c.label}</button>
            `).join('')}
          </div>
        </section>

        <section class="form-field">
          <label class="form-label" for="ce-precio">Precio (opcional)</label>
          <div class="price-input-row">
            <input id="ce-precio" name="precio" class="input" type="text" inputmode="decimal" placeholder="0,00" autocomplete="off" />
            <span class="price-input-unit">€</span>
          </div>
        </section>

        <p class="form-error" data-error style="display:none"></p>
      </form>
    `,
    foot: `
      <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
      <button type="submit" form="add-extra-form" class="btn btn-primary">Añadir</button>
    `,
  });

  // Chip picker
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

  const form = backdrop.querySelector('#add-extra-form');
  const errorEl = backdrop.querySelector('[data-error]');
  setTimeout(() => backdrop.querySelector('#ce-nombre').focus(), 220);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = form.elements.nombre.value.trim();
    if (!nombre) {
      errorEl.textContent = 'El nombre es obligatorio.';
      errorEl.style.display = 'block';
      return;
    }
    const precioRaw = form.elements.precio.value.replace(',', '.').trim();
    const precio = precioRaw === '' ? null : Number(precioRaw);
    if (precioRaw !== '' && (Number.isNaN(precio) || precio < 0)) {
      errorEl.textContent = 'Precio inválido.';
      errorEl.style.display = 'block';
      return;
    }
    errorEl.style.display = 'none';
    await impactMedium();
    await addCompraExtra({
      nombre,
      cantidad: form.elements.cantidad.value.trim(),
      categoria: formState.categoria,
      precio,
    });
    await notifySuccess();
    closeSheet(backdrop);
  });
}

