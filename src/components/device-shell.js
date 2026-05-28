/**
 * components/device-shell.js
 *
 * Common layout shell used by every screen:
 *   ┌─────────────────────────┐
 *   │ app-header (title)      │ ← optional title block (taps go Home)
 *   ├─────────────────────────┤
 *   │ device-scroll (content) │ ← screen content goes here
 *   ├─────────────────────────┤
 *   │ bottom-nav              │
 *   └─────────────────────────┘
 *
 * Use:
 *   const root = DeviceShell({ title: 'Mi Planificación', sub: 'tab 1' });
 *   root.scroll.appendChild( ...screen content... );
 *   return root.frame;
 */

import { BottomNav } from './bottom-nav.js';
import { navigate } from '../router.js';

/**
 * Build the device shell. Returns { frame, scroll, headerEl } so the caller
 * can mutate parts after rendering if needed.
 *
 * @param {object} opts
 * @param {string} [opts.title] - app-header title (optional)
 * @param {string} [opts.sub]   - mono uppercase sub-label above title
 * @param {string} [opts.currentPath] - for active bottom-nav tab
 * @returns {{ frame: HTMLElement, scroll: HTMLElement, headerEl: HTMLElement }}
 */
export function DeviceShell({ title, sub, currentPath } = {}) {
  const frame = document.createElement('div');
  frame.className = 'device';

  // App header — title block is optional
  const headerEl = document.createElement('header');
  headerEl.className = 'app-header';
  headerEl.style.padding = `0 var(--screen-padding)`;
  headerEl.innerHTML = title
    ? `<button class="app-header__title-btn" style="background:transparent;border:0;padding:0;text-align:left;cursor:pointer;">
        ${sub ? `<div class="app-header__sub">${sub}</div>` : ''}
        <div class="app-header__brand">${title}</div>
      </button>`
    : '';
  // Brand tap → Home
  headerEl.querySelector('.app-header__title-btn')?.addEventListener('click', () => navigate('/'));
  frame.appendChild(headerEl);

  // Scroll area
  const scroll = document.createElement('div');
  scroll.className = 'device-scroll';
  frame.appendChild(scroll);

  // Bottom nav
  frame.appendChild(BottomNav(currentPath));

  return { frame, scroll, headerEl };
}
