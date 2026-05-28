/**
 * screens/receta-nueva.js
 *
 * Form for both CREATE and EDIT modes of a recipe.
 *
 *   - Without params.id  →  empty form  →  addReceta()
 *   - With params.id     →  prefilled   →  updateReceta(id, fields)
 *
 * After saving, navigates to the recipe detail page.
 */

import { state, addReceta, updateReceta } from '../state.js';
import { navigate } from '../router.js';
import { foodIcon, uiIcon, ICON_PICK_ALL, iconKey } from '../components/icon.js';
import { Prop } from '../components/prop.js';
import { impactMedium, notifySuccess } from '../native/haptics.js';

const NUTRI_OPTIONS = [
  { value: 'proteina',      label: 'Proteína' },
  { value: 'carbohidratos', label: 'Carbohidratos' },
  { value: 'verdura',       label: 'Verdura' },
  { value: 'mixto',         label: 'Mixto' },
];

const COCINA_OPTIONS = [
  { value: 'mediterraneo',  label: 'Mediterráneo' },
  { value: 'italiano',      label: 'Italiano' },
  { value: 'asiatico',      label: 'Asiático' },
  { value: 'nacional',      label: 'Nacional' },
  { value: 'internacional', label: 'Internacional' },
];

const CANTIDAD_OPTIONS = [
  { value: 'pequena', label: 'Pequeña' },
  { value: 'media',   label: 'Media' },
  { value: 'grande',  label: 'Grande' },
];

const DIFICULTAD_OPTIONS = [
  { value: 'fácil',    label: 'Fácil' },
  { value: 'media',    label: 'Media' },
  { value: 'difícil',  label: 'Difícil' },
];

function escapeAttr(s) {
  return (s || '').replace(/"/g, '&quot;');
}

export function render(root, params = {}) {
  const editId  = params.id || null;
  const existing = editId ? state.recetas.find((r) => r.id === editId) : null;

  // If we were asked to edit a non-existent recipe, bail out gracefully
  if (editId && !existing) {
    root.innerHTML = `
      <div class="device" style="padding:24px">
        <p class="t-h2" style="margin-top:24px">Receta no encontrada</p>
        <p class="t-body t-muted">No se puede editar esta receta porque no existe.</p>
        <button class="btn btn-primary" style="margin-top:16px" onclick="window.location.hash='#/planificacion/recetario'">Volver al recetario</button>
      </div>
    `;
    return;
  }

  // Initial selections — fall back to a sensible default when creating new
  const initial = {
    emoji:           existing?.emoji           || 'pollo',
    tipoNutricional: existing?.tipoNutricional || NUTRI_OPTIONS[0].value,
    tipoCocina:      existing?.tipoCocina      || COCINA_OPTIONS[0].value,
    cantidad:        existing?.cantidad        || 'media',
    dificultad:      existing?.dificultad      || 'media',
    diasNevera:      existing?.diasNevera      ?? 3,
    calorias:        existing?.calorias        ?? 450,
    tiempoPrep:      existing?.tiempoPrep      ?? 30,
    nombre:          existing?.nombre          || '',
    instrucciones:   existing?.instrucciones   || '',
    ingredientes:    existing?.ingredientes?.length ? existing.ingredientes : [{ nombre: '', cantidad: '' }],
  };

  // Icono actual normalizado al pack (los datos antiguos guardaban un emoji).
  const currentIcon = iconKey(initial.emoji);
  // Lista del selector: incluye el icono actual aunque no esté en el pack.
  const iconList = ICON_PICK_ALL.includes(currentIcon)
    ? ICON_PICK_ALL
    : [currentIcon, ...ICON_PICK_ALL];

  const titleText = existing ? 'Editar receta' : 'Crear receta';
  const subText   = existing
    ? `Modifica los datos de "${existing.nombre}". Los cambios se aplican también a los tuppers que la usen esta semana.`
    : 'Añade una receta nueva a tu recetario.';
  const eyebrow   = existing ? 'Editar receta' : 'Nueva receta';
  const submitLbl = existing ? 'Guardar cambios' : 'Guardar receta';
  const successLbl = existing ? '✓ Cambios guardados' : '✓ Receta creada';

  const frame = document.createElement('div');
  frame.className = 'device';
  frame.innerHTML = `
    <header class="app-header detail-header" style="padding: 0 var(--screen-padding)">
      <button class="back-btn" data-back aria-label="Volver">${uiIcon('back', { size: 18 })}</button>
      <span class="app-header__sub">${eyebrow}</span>
      <button class="back-btn ghost" aria-label="placeholder" style="visibility:hidden">${uiIcon('edit', { size: 16 })}</button>
    </header>
    <div class="device-scroll detail-scroll">
      <h1 class="detail-title" style="margin-top: var(--space-3)">${titleText}</h1>
      <p class="t-body t-muted" style="margin-top: 0">${subText}</p>

      <form id="new-receta-form" class="form-stack">
        <!-- Icono -->
        <section class="form-field">
          <label class="form-label">Icono</label>
          <div class="emoji-grid" data-emoji-grid>
            ${iconList.map((e) => `
              <button type="button" class="emoji-pick${e === currentIcon ? ' selected' : ''}" data-emoji="${e}">${foodIcon(e, { size: 26 })}</button>
            `).join('')}
          </div>
        </section>

        <!-- Nombre -->
        <section class="form-field">
          <label class="form-label" for="nf-nombre">Nombre *</label>
          <input id="nf-nombre" name="nombre" class="input" placeholder="Ej. Lentejas con verduras" required value="${escapeAttr(initial.nombre)}" />
        </section>

        <!-- Tipo nutricional -->
        <section class="form-field">
          <label class="form-label">Tipo nutricional</label>
          <div class="chip-picker" data-chip-group="tipoNutricional">
            ${NUTRI_OPTIONS.map((o) => `
              <button type="button" class="chip${o.value === initial.tipoNutricional ? ' chip-active' : ''}" data-value="${o.value}">${o.label}</button>
            `).join('')}
          </div>
        </section>

        <!-- Tipo cocina -->
        <section class="form-field">
          <label class="form-label">Tipo de cocina</label>
          <div class="chip-picker" data-chip-group="tipoCocina">
            ${COCINA_OPTIONS.map((o) => `
              <button type="button" class="chip chip-outline${o.value === initial.tipoCocina ? ' chip-active' : ''}" data-value="${o.value}">${o.label}</button>
            `).join('')}
          </div>
        </section>

        <!-- Cantidad -->
        <section class="form-field">
          <label class="form-label">Ración</label>
          <div class="chip-picker" data-chip-group="cantidad">
            ${CANTIDAD_OPTIONS.map((o) => `
              <button type="button" class="chip${o.value === initial.cantidad ? ' chip-active' : ''}" data-value="${o.value}">${o.label}</button>
            `).join('')}
          </div>
        </section>

        <!-- Dificultad -->
        <section class="form-field">
          <label class="form-label">Dificultad</label>
          <div class="chip-picker" data-chip-group="dificultad">
            ${DIFICULTAD_OPTIONS.map((o) => `
              <button type="button" class="chip chip-outline${o.value === initial.dificultad ? ' chip-active' : ''}" data-value="${o.value}">${o.label}</button>
            `).join('')}
          </div>
        </section>

        <!-- Numeric trio -->
        <section class="form-row-3">
          <div class="form-field">
            <label class="form-label" for="nf-tiempo">Tiempo (min)</label>
            <input id="nf-tiempo" name="tiempoPrep" class="input" type="number" min="0" inputmode="numeric" value="${initial.tiempoPrep}" />
          </div>
          <div class="form-field">
            <label class="form-label" for="nf-cal">Calorías</label>
            <input id="nf-cal" name="calorias" class="input" type="number" min="0" inputmode="numeric" value="${initial.calorias}" />
          </div>
          <div class="form-field">
            <label class="form-label" for="nf-dias">Días nevera</label>
            <input id="nf-dias" name="diasNevera" class="input" type="number" min="0" inputmode="numeric" value="${initial.diasNevera}" />
          </div>
        </section>

        <!-- Ingredientes -->
        <section class="form-field">
          <label class="form-label">Ingredientes</label>
          <div class="ingredientes-list" data-ingredientes>
            ${initial.ingredientes.map((ing) => `
              <div class="ingrediente-row">
                <input class="input" data-ing-nombre placeholder="Ingrediente" value="${escapeAttr(ing.nombre)}" />
                <input class="input" data-ing-cantidad placeholder="Cantidad" value="${escapeAttr(ing.cantidad)}" />
                <button type="button" class="ing-remove" data-ing-remove aria-label="Quitar">×</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-add-ing style="margin-top: var(--space-2)">+ Añadir ingrediente</button>
        </section>

        <!-- Instrucciones -->
        <section class="form-field">
          <label class="form-label" for="nf-instr">Preparación</label>
          <textarea
            id="nf-instr"
            name="instrucciones"
            class="input"
            rows="5"
            placeholder="Describe los pasos. Sepáralos con puntos para que se muestren numerados."
            style="resize: vertical; min-height: 110px; padding: 14px 16px; line-height: 1.5;"
          >${(initial.instrucciones || '').replace(/</g, '&lt;')}</textarea>
        </section>

        <p class="form-error" data-error style="display:none"></p>

        <div class="detail-cta" style="margin-top: var(--space-5)">
          <button type="submit" class="btn btn-primary btn-block" data-submit>
            ${submitLbl}
          </button>
        </div>
      </form>
    </div>
  `;
  root.appendChild(frame);

  // Decorative background props
  const newScroll = frame.querySelector('.detail-scroll');
  if (newScroll) {
    newScroll.appendChild(Prop({
      src: 'persona_gestionando_tareas.png',
      size: 'md',
      style: { top: '180px', right: '-26px' },
      tilt: 5,
    }));
    newScroll.appendChild(Prop({
      src: 'trapo_cocina.png',
      size: 'sm',
      style: { top: '720px', left: '-18px' },
      tilt: -8,
    }));
  }

  // ── Form state ─────────────────────────────────────────────
  const formState = {
    emoji:           currentIcon,
    tipoNutricional: initial.tipoNutricional,
    tipoCocina:      initial.tipoCocina,
    cantidad:        initial.cantidad,
    dificultad:      initial.dificultad,
  };

  // ── Back ────────────────────────────────────────────────────
  frame.querySelector('[data-back]').addEventListener('click', () => {
    if (existing) navigate(`/receta/${existing.id}`);
    else          navigate('/planificacion/recetario');
  });

  // ── Emoji picker ───────────────────────────────────────────
  const emojiGrid = frame.querySelector('[data-emoji-grid]');
  emojiGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-pick');
    if (!btn) return;
    formState.emoji = btn.dataset.emoji;
    emojiGrid.querySelectorAll('.emoji-pick').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
  });

  // ── Chip pickers (single select per group) ─────────────────
  frame.querySelectorAll('.chip-picker').forEach((group) => {
    const key = group.dataset.chipGroup;
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      formState[key] = btn.dataset.value;
      group.querySelectorAll('.chip').forEach((c) => c.classList.remove('chip-active'));
      btn.classList.add('chip-active');
    });
  });

  // ── Ingredientes dinámicos ─────────────────────────────────
  const ingList = frame.querySelector('[data-ingredientes]');
  frame.querySelector('[data-add-ing]').addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'ingrediente-row';
    row.innerHTML = `
      <input class="input" data-ing-nombre placeholder="Ingrediente" />
      <input class="input" data-ing-cantidad placeholder="Cantidad" />
      <button type="button" class="ing-remove" data-ing-remove aria-label="Quitar">×</button>
    `;
    ingList.appendChild(row);
    row.querySelector('[data-ing-nombre]').focus();
  });
  ingList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ing-remove]');
    if (!btn) return;
    if (ingList.querySelectorAll('.ingrediente-row').length === 1) {
      // Keep at least one empty row, just clear it
      const row = btn.closest('.ingrediente-row');
      row.querySelector('[data-ing-nombre]').value = '';
      row.querySelector('[data-ing-cantidad]').value = '';
      return;
    }
    btn.closest('.ingrediente-row').remove();
  });

  // ── Submit ─────────────────────────────────────────────────
  const form = frame.querySelector('#new-receta-form');
  const errorEl = frame.querySelector('[data-error]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = form.elements.nombre.value.trim();
    if (!nombre) {
      errorEl.textContent = 'Ponle un nombre a tu receta.';
      errorEl.style.display = 'block';
      form.elements.nombre.focus();
      return;
    }
    errorEl.style.display = 'none';

    const ingredientes = [...ingList.querySelectorAll('.ingrediente-row')]
      .map((row) => ({
        nombre: row.querySelector('[data-ing-nombre]').value.trim(),
        cantidad: row.querySelector('[data-ing-cantidad]').value.trim(),
      }))
      .filter((ing) => ing.nombre);

    const payload = {
      nombre,
      tipoNutricional: formState.tipoNutricional,
      tipoCocina: formState.tipoCocina,
      cantidad: formState.cantidad,
      dificultad: formState.dificultad,
      diasNevera: form.elements.diasNevera.value,
      calorias: form.elements.calorias.value,
      tiempoPrep: form.elements.tiempoPrep.value,
      emoji: formState.emoji,
      ingredientes,
      instrucciones: form.elements.instrucciones.value.trim(),
    };

    await impactMedium();
    let recetaId;
    if (existing) {
      recetaId = await updateReceta(existing.id, payload);
    } else {
      recetaId = await addReceta(payload);
    }
    await notifySuccess();

    const submitBtn = frame.querySelector('[data-submit]');
    submitBtn.classList.add('btn-success');
    submitBtn.textContent = successLbl;
    setTimeout(() => navigate(`/receta/${recetaId}`), 500);
  });
}

