/**
 * components/bottom-nav.js
 *
 * Shared bottom navigation bar used by every primary screen.
 * Three tabs:
 *   [ Batch ]   [ Home ]   [ Recetas ]
 *      ⚡          🏠          📋
 *
 * Home sits in the middle (most-used landing screen).
 * Batch on the left (cooking mode).
 * Recetas on the right (planificación: recetario/nevera/compra).
 *
 * The active tab is computed from the current hash route.
 */

import { navigate } from '../router.js';

const TABS = [
  {
    id: 'batch',
    label: 'Batch',
    route: '/batch',
    matches: (path) => path.startsWith('/batch'),
    icon: `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" stroke-linejoin="round"/></svg>`,
  },
  {
    id: 'home',
    label: 'Inicio',
    route: '/',
    matches: (path) => path === '/' || path === '',
    icon: `<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22v-6h6v6"/></svg>`,
  },
  {
    id: 'recetas',
    label: 'Recetas',
    route: '/planificacion/recetario',
    matches: (path) => path.startsWith('/planificacion'),
    icon: `<svg viewBox="0 0 24 24"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>`,
  },
];

/**
 * Renders the bottom navigation as a DOM container ready to be appended.
 * @param {string} currentPath - hash route used to compute active state
 * @returns {HTMLElement}
 */
export function BottomNav(currentPath = window.location.hash.slice(1) || '/') {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <nav class="bnav">
      ${TABS.map((t) => {
        const isActive = t.matches(currentPath);
        return `
          <button class="bnav-tab${isActive ? ' active' : ''}" data-route="${t.route}">
            ${isActive
              ? `<span class="bnav-bubble">${t.icon}</span>`
              : t.icon
            }
            <span>${t.label}</span>
          </button>
        `;
      }).join('')}
    </nav>
    <div class="gesture-bar"></div>
  `;

  wrapper.querySelectorAll('.bnav-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = btn.dataset.route;
      if (r) navigate(r);
    });
  });

  const container = document.createElement('div');
  while (wrapper.firstChild) container.appendChild(wrapper.firstChild);
  return container;
}
