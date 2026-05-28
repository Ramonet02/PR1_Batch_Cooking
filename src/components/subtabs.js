/**
 * components/subtabs.js
 *
 * Shared sub-navigation for Tab 1 (Mi Planificación):
 *   [ Recetario ] [ Nevera ] [ Compra ]
 *
 * @param {'recetario'|'nevera'|'compra'} active
 * @returns {HTMLElement}
 */

import { navigate } from '../router.js';

const TABS = [
  { id: 'recetario', label: 'Recetario', route: '/planificacion/recetario' },
  { id: 'nevera',    label: 'Nevera',    route: '/planificacion/nevera' },
  { id: 'compra',    label: 'Compra',    route: '/planificacion/compra' },
];

export function Subtabs(active = 'recetario') {
  const el = document.createElement('div');
  el.className = 'subtabs';
  el.innerHTML = TABS.map((t) => `
    <button class="subtab${t.id === active ? ' active' : ''}" data-route="${t.route}">
      ${t.label}
    </button>
  `).join('');
  el.querySelectorAll('.subtab').forEach((b) => {
    b.addEventListener('click', () => navigate(b.dataset.route));
  });
  return el;
}
