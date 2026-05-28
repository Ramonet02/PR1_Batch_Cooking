/**
 * screens/batch.js
 *
 * Modo Batch — the Sunday cooking screen. Optimized for the moment when
 * the user is actively preparing several recipes in parallel.
 *
 * Three blocks of content:
 *   1. Common ingredients — what to chop / measure once for everyone
 *   2. Timers — multiple parallel circular timers (p5.js canvases)
 *   3. Active recipes — quick navigation back to each recipe
 *
 * Native plugins used:
 *   - @capacitor/haptics → vibration when a timer hits 0
 *   - @capacitor/local-notifications → alerts user when timer ends in bg
 */

import {
  state, subscribe,
  getCommonIngredients,
  getTimerRemaining,
  addTimer, startTimer, pauseTimer, resetTimer, removeTimer, completeTimer,
} from '../state.js';
import { DeviceShell } from '../components/device-shell.js';
import { uiIcon } from '../components/icon.js';
import { Prop } from '../components/prop.js';
import { navigate } from '../router.js';
import { impactMedium, impactHeavy, notifySuccess } from '../native/haptics.js';
import { scheduleTimerEnd, cancelTimerEnd } from '../native/notifications.js';
import { startTimerCanvas } from '../canvas/batch-timers.js';

export function render(root) {
  const uniqueRecipes = [...new Set(state.tuppers.map((t) => t.recetaId))];

  const { frame, scroll } = DeviceShell({
    title: 'Modo Batch',
    sub: `semana ${state.semana} · ${uniqueRecipes.length} recetas`,
    currentPath: '/batch',
  });
  root.appendChild(frame);

  // Decorative background props
  scroll.appendChild(Prop({
    src: 'persona_cocinando_olla.png',
    size: 'md',
    style: { top: '-20px', right: '-30px' },
    tilt: 6,
  }));
  scroll.appendChild(Prop({
    src: 'temporizador.png',
    size: 'sm',
    style: { top: '340px', left: '-20px' },
    tilt: -10,
  }));
  scroll.appendChild(Prop({
    src: 'persona_contando_tiempo.png',
    size: 'md',
    style: { top: '700px', right: '-28px' },
    tilt: 4,
  }));

  // Layout container
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = 'var(--space-6)';
  wrap.style.paddingTop = 'var(--space-3)';
  wrap.style.paddingBottom = 'var(--space-4)';
  scroll.appendChild(wrap);

  // ── 1. Common ingredients ─────────────────────────────────
  const commonWrap = document.createElement('section');
  wrap.appendChild(commonWrap);
  function renderCommon() {
    const items = getCommonIngredients();
    commonWrap.innerHTML = `
      <h2 class="section-title" style="margin-bottom:12px">Ingredientes comunes</h2>
      <div class="common-card">
        ${items.length === 0
          ? `<p class="t-body t-muted" style="padding: var(--space-2) 0">No hay ingredientes compartidos entre las recetas de esta semana.</p>`
          : items.map((i) => `
              <div class="common-row">
                <span class="common-dot"></span>
                <span class="common-name">${i.nombre}</span>
                <span class="common-count">${i.recetas} recetas</span>
              </div>
            `).join('')
        }
      </div>
    `;
  }
  renderCommon();

  // ── 2. Timers section ─────────────────────────────────────
  const timersSection = document.createElement('section');
  wrap.appendChild(timersSection);

  const canvasCleanups = new Map(); // timerId → cleanup fn

  function renderTimers() {
    // Tear down old canvases first
    canvasCleanups.forEach((c) => { try { c(); } catch {} });
    canvasCleanups.clear();

    timersSection.innerHTML = `
      <div class="section-title-row">
        <h2 class="section-title">Timers</h2>
      </div>
      <div class="timer-row">
        ${state.timers.map((t) => TimerCardHTML(t)).join('')}
      </div>
      <div style="text-align:center; padding-top: var(--space-3)">
        <button class="add-link" data-action="add-timer">Añadir timer</button>
      </div>
    `;

    // Mount p5 canvases
    state.timers.forEach((t) => {
      const host = timersSection.querySelector(`[data-canvas-for="${t.id}"]`);
      if (!host) return;
      const cleanup = startTimerCanvas(host, () => state.timers.find((x) => x.id === t.id));
      canvasCleanups.set(t.id, cleanup);
    });

    // Wire up control buttons
    timersSection.querySelectorAll('[data-timer-action]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.timerId;
        const action = btn.dataset.timerAction;
        const t = state.timers.find((x) => x.id === id);
        if (!t) return;
        switch (action) {
          case 'start':
            await startTimer(id);
            scheduleTimerEnd(id, t.label, t.pausedRemaining);
            break;
          case 'pause':
            await pauseTimer(id);
            cancelTimerEnd(id);
            break;
          case 'reset':
            await resetTimer(id);
            cancelTimerEnd(id);
            break;
          case 'remove':
            await removeTimer(id);
            cancelTimerEnd(id);
            break;
        }
      });
    });

    // "+ Añadir timer"
    const addBtn = timersSection.querySelector('[data-action="add-timer"]');
    if (addBtn) addBtn.addEventListener('click', handleAddTimer);
  }

  async function handleAddTimer() {
    await impactMedium();
    openTimerSheet({
      onSubmit: async ({ label, minutes }) => {
        await addTimer({ label, emoji: '⏱', totalSec: minutes * 60 });
      },
    });
  }

  renderTimers();

  // ── 3. Active recipes list ────────────────────────────────
  const recetasSection = document.createElement('section');
  recetasSection.innerHTML = `
    <h2 class="section-title" style="margin-bottom:12px">Recetas activas</h2>
    <div class="active-recipes card" style="padding: 0 var(--space-4)">
      ${uniqueRecipes.map((rid) => {
        const r = state.recetas.find((x) => x.id === rid);
        if (!r) return '';
        return `
          <button type="button" class="active-recipe-row" data-recipe-id="${r.id}">
            <span class="dot"></span>
            <span class="name">${r.nombre}</span>
            <span class="chev">ver ›</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
  recetasSection.querySelectorAll('[data-recipe-id]').forEach((row) => {
    row.addEventListener('click', async () => {
      await impactMedium();
      navigate(`/receta/${row.dataset.recipeId}`);
    });
  });
  wrap.appendChild(recetasSection);

  // ── Completion watcher ────────────────────────────────────
  // Every 250ms, check if any running timer has hit 0. If so, fire
  // haptics + a foreground sound and mark it as completed.
  const checkInterval = setInterval(async () => {
    for (const t of state.timers) {
      if (t.running && !t.completed) {
        const rem = getTimerRemaining(t);
        if (rem <= 0) {
          await completeTimer(t.id);
          await impactHeavy();
          await notifySuccess();
        }
      }
    }
  }, 250);

  // Re-render specific sections when timers state changes (add/remove/etc.)
  let lastTimerCount = state.timers.length;
  const unsubscribe = subscribe(() => {
    // If a timer was added or removed, rebuild the timers section
    if (state.timers.length !== lastTimerCount) {
      lastTimerCount = state.timers.length;
      renderTimers();
    } else {
      // Otherwise just update the per-card button states (without
      // recreating canvases — they read state.timers live).
      state.timers.forEach(updateCardControls);
    }
  });

  function updateCardControls(t) {
    const card = timersSection.querySelector(`[data-card-id="${t.id}"]`);
    if (!card) return;
    card.classList.toggle('completed', !!t.completed);
    card.classList.toggle('running', !!t.running);
    const playPause = card.querySelector('[data-toggle-play]');
    if (playPause) {
      playPause.dataset.timerAction = t.running ? 'pause' : 'start';
      playPause.innerHTML = t.completed
        ? uiIcon('check', { size: 14 }) + ' Listo'
        : (t.running ? uiIcon('pause', { size: 14 }) + ' Pausar' : uiIcon('play', { size: 14 }) + ' Iniciar');
      playPause.classList.toggle('btn-primary', !t.completed && !t.running);
      playPause.classList.toggle('btn-secondary', t.running);
      playPause.classList.toggle('btn-disabled', t.completed);
    }
  }

  // Cleanup on screen unmount
  return () => {
    clearInterval(checkInterval);
    unsubscribe();
    canvasCleanups.forEach((c) => { try { c(); } catch {} });
  };
}

// ─── Card HTML ───────────────────────────────────────────────────────────

// ─── Add-timer sheet ─────────────────────────────────────────────────────
// Mesa Mediterránea replacement for window.prompt().
// Slides up from the bottom; tap on backdrop or "Cancelar" to dismiss.

const PRESET_MINUTES = [5, 10, 15, 20, 25, 30, 40, 45, 60];

function openTimerSheet({ onSubmit }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-label="Nuevo timer">
      <span class="sheet-handle" aria-hidden="true"></span>
      <header class="sheet-head">
        <span class="t-caption">Nuevo timer</span>
        <h2 class="t-h2" style="margin-top: var(--space-1)">¿Qué estás cocinando?</h2>
      </header>

      <form id="timer-form" class="sheet-body">
        <section class="form-field">
          <label class="form-label" for="ts-label">Nombre</label>
          <input id="ts-label" name="label" class="input" placeholder="Ej. Lentejas con verduras" autocomplete="off" required />
        </section>

        <section class="form-field">
          <label class="form-label" for="ts-min">Minutos</label>
          <input id="ts-min" name="minutes" class="input" type="number" inputmode="numeric" min="1" max="240" value="10" required />
          <div class="chip-picker" data-presets style="margin-top: var(--space-2)">
            ${PRESET_MINUTES.map((m) => `
              <button type="button" class="chip${m === 10 ? ' chip-active' : ''}" data-preset="${m}">${m} min</button>
            `).join('')}
          </div>
        </section>

        <p class="form-error" data-error style="display:none"></p>

        <footer class="sheet-foot">
          <button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>
          <button type="submit" class="btn btn-primary">Añadir timer</button>
        </footer>
      </form>
    </div>
  `;

  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));

  const minInput = backdrop.querySelector('#ts-min');
  const labelInput = backdrop.querySelector('#ts-label');
  const errorEl = backdrop.querySelector('[data-error]');
  const form = backdrop.querySelector('#timer-form');

  setTimeout(() => labelInput.focus(), 220);

  // Preset chips → sync with the number input
  backdrop.querySelectorAll('[data-preset]').forEach((chip) => {
    chip.addEventListener('click', () => {
      minInput.value = chip.dataset.preset;
      backdrop.querySelectorAll('[data-preset]').forEach((c) => c.classList.remove('chip-active'));
      chip.classList.add('chip-active');
    });
  });
  minInput.addEventListener('input', () => {
    backdrop.querySelectorAll('[data-preset]').forEach((c) => {
      c.classList.toggle('chip-active', c.dataset.preset === minInput.value);
    });
  });

  function close() {
    backdrop.classList.remove('open');
    setTimeout(() => backdrop.remove(), 220);
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-cancel]').addEventListener('click', close);

  // Escape closes
  function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  }
  document.addEventListener('keydown', onKey);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = labelInput.value.trim();
    const minutes = parseInt(minInput.value, 10);
    if (!label) {
      errorEl.textContent = 'Dale un nombre al timer.';
      errorEl.style.display = 'block';
      labelInput.focus();
      return;
    }
    if (Number.isNaN(minutes) || minutes <= 0 || minutes > 240) {
      errorEl.textContent = 'Pon un valor entre 1 y 240 minutos.';
      errorEl.style.display = 'block';
      minInput.focus();
      return;
    }
    errorEl.style.display = 'none';
    await onSubmit({ label, minutes });
    close();
    document.removeEventListener('keydown', onKey);
  });
}

function TimerCardHTML(t) {
  const isPlay = !t.running && !t.completed;
  return `
    <article
      class="timer-card${t.running ? ' running' : ''}${t.completed ? ' completed' : ''}"
      data-card-id="${t.id}"
    >
      <div class="timer-canvas" data-canvas-for="${t.id}"></div>
      <div class="timer-label">${t.label}</div>
      <div class="timer-controls">
        <button
          class="btn btn-sm ${isPlay ? 'btn-primary' : (t.running ? 'btn-secondary' : 'btn-disabled')}"
          data-toggle-play
          data-timer-action="${t.running ? 'pause' : 'start'}"
          data-timer-id="${t.id}"
        >${t.completed ? uiIcon('check', { size: 14 }) + ' Listo' : (t.running ? uiIcon('pause', { size: 14 }) + ' Pausar' : uiIcon('play', { size: 14 }) + ' Iniciar')}</button>
        <button class="timer-icon-btn" data-timer-action="reset" data-timer-id="${t.id}" title="Reset">${uiIcon('refresh', { size: 14 })}</button>
        <button class="timer-icon-btn" data-timer-action="remove" data-timer-id="${t.id}" title="Eliminar">${uiIcon('close', { size: 14 })}</button>
      </div>
    </article>
  `;
}
