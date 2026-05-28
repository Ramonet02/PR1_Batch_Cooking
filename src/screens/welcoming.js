/**
 * screens/welcoming.js
 *
 * First-launch onboarding. Renders the slides in `public/welcoming/` one at
 * a time with dot indicators centred at the bottom and a "next" arrow in the
 * bottom-left corner. On the last slide the arrow becomes "Empezar" and tap
 * dismisses the screen, marking the welcoming as seen so it doesn't show up
 * on subsequent launches.
 *
 * Usage:
 *   await showWelcoming(appEl); // resolves when the user finishes/dismisses
 *
 * Persistence: a single boolean flag in @capacitor/preferences (with a
 * localStorage fallback) — independent from the main app state so wiping the
 * state object doesn't bring the welcoming back.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { impactMedium, notifySuccess } from '../native/haptics.js';

const WELCOMING_KEY = 'batchcook.welcoming.seen.v1';

const SLIDES = [
  { src: '/welcoming/primera_diapo.png', alt: 'Bienvenido a Batch Cook' },
  { src: '/welcoming/segunda_diapo.png', alt: 'Planifica tu semana' },
  { src: '/welcoming/tercera_diapo.png', alt: 'Cocina en bloque' },
  { src: '/welcoming/cuarta_diapo.png',  alt: 'Empieza' },
];

function isNative() {
  return Capacitor.isNativePlatform();
}

export async function hasSeenWelcoming() {
  try {
    if (isNative()) {
      const { value } = await Preferences.get({ key: WELCOMING_KEY });
      return value === '1';
    }
    return localStorage.getItem(WELCOMING_KEY) === '1';
  } catch {
    return false;
  }
}

async function markWelcomingSeen() {
  try {
    if (isNative()) {
      await Preferences.set({ key: WELCOMING_KEY, value: '1' });
    } else {
      localStorage.setItem(WELCOMING_KEY, '1');
    }
  } catch (err) {
    console.warn('[welcoming] could not persist seen flag', err);
  }
}

export function showWelcoming(rootEl) {
  return new Promise((resolve) => {
    let current = 0;
    const last = SLIDES.length - 1;

    const wrap = document.createElement('div');
    wrap.className = 'welcoming';
    wrap.innerHTML = `
      <div class="welcoming-stage">
        ${SLIDES.map((s, i) => `
          <img
            class="welcoming-slide ${i === 0 ? 'is-active' : ''}"
            src="${s.src}"
            alt="${s.alt}"
            data-index="${i}"
            draggable="false"
          />
        `).join('')}
      </div>
      <div class="welcoming-foot">
        <button class="welcoming-next" type="button" aria-label="Siguiente diapositiva">
          <span class="welcoming-next-arrow" aria-hidden="true">→</span>
          <span class="welcoming-next-label">Empezar</span>
        </button>
        <div class="welcoming-dots" role="tablist" aria-label="Progreso">
          ${SLIDES.map((_, i) => `
            <span class="welcoming-dot ${i === 0 ? 'is-active' : ''}" data-dot="${i}" role="tab" aria-selected="${i === 0}"></span>
          `).join('')}
        </div>
      </div>
    `;

    rootEl.appendChild(wrap);

    const slides = wrap.querySelectorAll('.welcoming-slide');
    const dots   = wrap.querySelectorAll('.welcoming-dot');
    const nextBtn = wrap.querySelector('.welcoming-next');

    function updateSlide(idx) {
      slides.forEach((el, i) => el.classList.toggle('is-active', i === idx));
      dots.forEach((el, i) => {
        const isActive = i === idx;
        el.classList.toggle('is-active', isActive);
        el.setAttribute('aria-selected', String(isActive));
      });
      // Switch arrow → label on the last slide
      nextBtn.classList.toggle('is-final', idx === last);
      nextBtn.setAttribute(
        'aria-label',
        idx === last ? 'Empezar a usar la app' : 'Siguiente diapositiva',
      );
    }

    async function advance() {
      if (current < last) {
        await impactMedium();
        current += 1;
        updateSlide(current);
      } else {
        await notifySuccess();
        await markWelcomingSeen();
        wrap.classList.add('is-leaving');
        // Wait for fade-out before resolving
        setTimeout(() => {
          wrap.remove();
          resolve();
        }, 280);
      }
    }

    nextBtn.addEventListener('click', advance);

    // Dot taps jump to a specific slide
    dots.forEach((dot) => {
      dot.addEventListener('click', async () => {
        const idx = Number(dot.dataset.dot);
        if (idx === current) return;
        await impactMedium();
        current = idx;
        updateSlide(current);
      });
    });
  });
}
