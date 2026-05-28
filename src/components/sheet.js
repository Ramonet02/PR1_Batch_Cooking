/**
 * components/sheet.js
 *
 * Mesa Mediterránea bottom-sheet helper — reusable across screens.
 *
 * Usage:
 *   import { makeSheet, closeSheet } from '../components/sheet.js';
 *
 *   const backdrop = makeSheet({
 *     eyebrow: 'Categoría',
 *     title:   '¿Qué quieres hacer?',
 *     bodyHTML: '<p>...</p>',
 *     foot:    `<button class="btn btn-ghost" data-close>Cancelar</button>
 *               <button class="btn btn-primary" data-confirm>OK</button>`,
 *   });
 *   backdrop.querySelector('[data-confirm]').addEventListener('click', () => {
 *     // do something
 *     closeSheet(backdrop);
 *   });
 *
 * The helper wires up:
 *   - Click on the backdrop → close
 *   - Press Escape       → close
 *   - Any [data-close] inside → close
 *
 * The CSS lives in styles/components.css (`.sheet-backdrop`, `.sheet`, etc.).
 */

export function makeSheet({ eyebrow, title, bodyHTML, foot }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-label="${title}">
      <span class="sheet-handle" aria-hidden="true"></span>
      <header class="sheet-head">
        ${eyebrow ? `<span class="t-caption">${eyebrow}</span>` : ''}
        <h2 class="t-h2" style="margin-top: var(--space-1)">${title}</h2>
      </header>
      <div class="sheet-body">${bodyHTML}</div>
      ${foot ? `<footer class="sheet-foot">${foot}</footer>` : ''}
    </div>
  `;
  document.body.appendChild(backdrop);

  // Trigger the open transition on next frame so CSS picks up the diff
  requestAnimationFrame(() => backdrop.classList.add('open'));

  // Tap the backdrop (outside the .sheet) → close
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSheet(backdrop);
  });

  // Any [data-close] inside → close
  backdrop.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeSheet(backdrop));
  });

  // Escape key → close
  function onKey(e) {
    if (e.key === 'Escape') {
      closeSheet(backdrop);
      document.removeEventListener('keydown', onKey);
    }
  }
  document.addEventListener('keydown', onKey);
  backdrop._cleanupKey = () => document.removeEventListener('keydown', onKey);

  return backdrop;
}

/**
 * Programmatically close a sheet returned by makeSheet().
 * Plays the slide-down transition and removes from the DOM after 220 ms.
 */
export function closeSheet(backdrop) {
  if (!backdrop) return;
  backdrop.classList.remove('open');
  if (typeof backdrop._cleanupKey === 'function') backdrop._cleanupKey();
  setTimeout(() => backdrop.remove(), 220);
}
