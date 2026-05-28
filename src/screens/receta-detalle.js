/**
 * screens/receta-detalle.js
 *
 * Recipe detail screen. Reached via `/receta/:id`.
 *
 * Layout:
 *   - Modal-style header with back button
 *   - Hero placeholder (sage-tinted, emoji centered)
 *   - Title + 4 dimension chips + meta (time / kcal)
 *   - Ingredientes section (text list)
 *   - Preparación section (numbered steps)
 *   - Day picker (L M X J V) + "Añadir a la semana" primary CTA
 *
 * The user can assign the recipe to any day of the week from here. Tapping
 * the CTA replaces whatever was planned for that day with this recipe.
 */

import { state, addRecetaToWeek } from '../state.js';
import { navigate } from '../router.js';
import { foodIcon, uiIcon } from '../components/icon.js';
import { Prop } from '../components/prop.js';
import { impactMedium, notifySuccess } from '../native/haptics.js';

const DAYS = [
  { key: 'lunes',     letter: 'L' },
  { key: 'martes',    letter: 'M' },
  { key: 'miercoles', letter: 'X' },
  { key: 'jueves',    letter: 'J' },
  { key: 'viernes',   letter: 'V' },
];

const TIPO_LABEL = { proteina: 'Proteína', carbohidratos: 'Carbohidratos', verdura: 'Verdura', mixto: 'Mixto' };
const COCINA_LABEL = { mediterraneo: 'Mediterráneo', italiano: 'Italiano', asiatico: 'Asiático', nacional: 'Nacional', internacional: 'Internacional' };
const CANTIDAD_LABEL = { pequena: 'Ración pequeña', media: 'Ración media', grande: 'Ración grande' };
const DIF_COLOR = { 'fácil': 'oliva', 'media': 'mostaza', 'difícil': 'tomate' };

function shortCat(c) { return ({ proteina: 'protein', carbohidratos: 'carb', verdura: 'veg', mixto: 'mix' })[c] || 'mix'; }
function shortCui(c) { return ({ mediterraneo: 'medi', italiano: 'it', asiatico: 'asia', nacional: 'nac', internacional: 'intl' })[c] || 'medi'; }
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

export function render(root, params = {}) {
  const recetaId = params.id;
  const receta = state.recetas.find((r) => r.id === recetaId);

  // Not-found state
  if (!receta) {
    root.innerHTML = `
      <div class="device" style="padding:24px">
        <div class="app-header" style="padding:0">
          <button class="back-btn" data-back>←</button>
        </div>
        <p class="t-h2" style="margin-top:24px">Receta no encontrada</p>
        <p class="t-body t-muted">Esta receta ya no existe o el enlace está roto.</p>
      </div>
    `;
    root.querySelector('[data-back]')?.addEventListener('click', () => navigate('/planificacion/recetario'));
    return;
  }

  // Detail frame (no bottom nav — this is a modal-style screen)
  const frame = document.createElement('div');
  frame.className = 'device';
  frame.innerHTML = `
    <header class="app-header detail-header" style="padding: 0 var(--screen-padding)">
      <button class="back-btn" data-back aria-label="Volver">${uiIcon('back', { size: 18 })}</button>
      <span class="app-header__sub">Detalle de receta</span>
      <button class="back-btn" data-edit aria-label="Editar">${uiIcon('edit', { size: 16 })}</button>
    </header>
    <div class="device-scroll detail-scroll">
      <div class="detail-hero ph ph-lg ph-tone-${shortCat(receta.tipoNutricional)}">
        ${foodIcon(receta.emoji || '🍽', { size: 96 })}
      </div>

      <h1 class="detail-title">${receta.nombre}</h1>

      <div class="detail-chips">
        <span class="chip chip-soft chip-soft-${shortCat(receta.tipoNutricional)}">${TIPO_LABEL[receta.tipoNutricional] || receta.tipoNutricional}</span>
        <span class="chip chip-soft chip-soft-${shortCui(receta.tipoCocina)}">${COCINA_LABEL[receta.tipoCocina] || receta.tipoCocina}</span>
        ${receta.dificultad ? `<span class="chip chip-soft chip-soft-${DIF_COLOR[receta.dificultad] || 'days'}">${capitalize(receta.dificultad)}</span>` : ''}
        <span class="chip chip-soft chip-soft-days">${CANTIDAD_LABEL[receta.cantidad] || receta.cantidad}</span>
        <span class="chip chip-soft chip-soft-days">${uiIcon('calendar', { size: 12 })} ${receta.diasNevera} días</span>
      </div>

      <div class="detail-meta">
        <span class="num">${uiIcon('clock', { size: 16 })}<b>${receta.tiempoPrep}</b><span>min</span></span>
        <span class="num">${uiIcon('flame', { size: 16 })}<b>${receta.calorias}</b><span>kcal</span></span>
      </div>

      <section class="detail-section">
        <h2 class="section-title">Ingredientes</h2>
        <ul class="detail-ingredientes">
          ${receta.ingredientes.map((i) => `
            <li>
              <span class="bullet"></span>
              <span class="name">${i.nombre}</span>
              <span class="qty">${i.cantidad}</span>
            </li>
          `).join('')}
        </ul>
      </section>

      <section class="detail-section">
        <h2 class="section-title">Preparación</h2>
        <div class="detail-pasos">
          ${splitInstructions(receta.instrucciones).map((step, i) => `
            <div class="paso">
              <span class="paso-num">${i + 1}</span>
              <span class="paso-text">${step}</span>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="detail-section">
        <h2 class="section-title">Asignar a un día</h2>
        <div class="detail-day-picker">
          ${DAYS.map(({ key, letter }) => {
            const t = state.tuppers.find((x) => x.dia === key);
            const hasOther = t && t.recetaId !== receta.id;
            const isSelected = key === state.selectedDay;
            const isThisRecipe = t && t.recetaId === receta.id;
            return `
              <button
                class="day-pick${isSelected ? ' selected' : ''}${isThisRecipe ? ' already' : ''}"
                data-day="${key}"
                title="${hasOther ? `Actualmente: ${t.nombre}` : ''}"
              >
                <span class="day-pick-letter">${letter}</span>
                ${isThisRecipe ? '<span class="day-pick-tick">✓</span>' : ''}
              </button>
            `;
          }).join('')}
        </div>
        <p class="detail-day-hint t-body-sm t-muted" data-hint>
          ${dayHint(state.selectedDay, receta)}
        </p>
      </section>

      <div class="detail-cta">
        <button class="btn btn-primary btn-block" data-assign>
          <span data-assign-label>Añadir al ${capitalize(state.selectedDay)}</span>
        </button>
      </div>
    </div>
  `;
  root.appendChild(frame);

  // Decorative background props (appended to scroll after innerHTML build)
  const detailScroll = frame.querySelector('.detail-scroll');
  if (detailScroll) {
    detailScroll.appendChild(Prop({
      src: 'sarten.png',
      size: 'sm',
      style: { top: '420px', right: '-22px' },
      tilt: -10,
    }));
    detailScroll.appendChild(Prop({
      src: 'utensilios_cocina.png',
      size: 'md',
      style: { top: '880px', left: '-26px' },
      tilt: 6,
    }));
  }

  // ── Interactions ─────────────────────────────────────────

  let selectedKey = state.selectedDay;

  frame.querySelector('[data-back]').addEventListener('click', () => {
    navigate('/planificacion/recetario');
  });

  frame.querySelector('[data-edit]').addEventListener('click', async () => {
    await impactMedium();
    navigate(`/receta/${receta.id}/editar`);
  });

  const dayPicker = frame.querySelector('.detail-day-picker');
  const hintEl    = frame.querySelector('[data-hint]');
  const assignLbl = frame.querySelector('[data-assign-label]');
  const assignBtn = frame.querySelector('[data-assign]');

  dayPicker.addEventListener('click', (e) => {
    const btn = e.target.closest('.day-pick');
    if (!btn) return;
    selectedKey = btn.dataset.day;
    dayPicker.querySelectorAll('.day-pick').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    hintEl.textContent = dayHint(selectedKey, receta);
    assignLbl.textContent = `Añadir al ${capitalize(selectedKey)}`;
  });

  assignBtn.addEventListener('click', async () => {
    await impactMedium();
    await addRecetaToWeek(receta.id, selectedKey);
    await notifySuccess();
    // Brief feedback then back to Home so user sees the result
    assignBtn.classList.add('btn-success');
    assignLbl.textContent = `✓ Asignada al ${capitalize(selectedKey)}`;
    setTimeout(() => navigate('/'), 600);
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────

function splitInstructions(text) {
  if (!text) return [];
  // Split on " 1. ", " 2. ", etc. or on periods + capital letter
  const parts = text
    .split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.endsWith('.') ? s : s + '.');
  return parts;
}

function dayHint(key, receta) {
  const t = state.tuppers.find((x) => x.dia === key);
  if (!t) return `El ${key} está vacío.`;
  if (t.recetaId === receta.id) return `Ya tienes esta receta asignada al ${key}.`;
  return `El ${key} tienes ${t.nombre}. Se reemplazará.`;
}

