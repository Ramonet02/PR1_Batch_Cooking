/**
 * storage.js
 *
 * Thin wrapper around @capacitor/preferences with a localStorage fallback
 * so the app also works in `npm run dev` (browser) without native plugins.
 *
 * Single key strategy: serialize the whole `state` object as one JSON string.
 * For a dataset this small (5–7 tuppers per week, dozens of recipes) this is
 * simpler and faster than splitting into multiple keys.
 *
 * Photos are NOT stored here — they go to @capacitor/filesystem and we keep
 * only the URI in state.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'batchcook.state.v1';

/**
 * Detects whether we're running inside the Capacitor WebView (real device or
 * `npx cap run`) or in plain browser dev mode.
 */
function isNative() {
  return Capacitor.isNativePlatform();
}

/**
 * Loads the persisted state. Returns null if nothing has been saved yet
 * (first launch).
 */
export async function loadState() {
  try {
    if (isNative()) {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      return value ? JSON.parse(value) : null;
    }
    // Browser fallback
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('[storage] loadState error', err);
    return null;
  }
}

/**
 * Persists the whole state object. Debounced lightly to avoid hammering
 * Preferences on rapid mutations.
 */
let saveTimer = null;
export function saveState(state) {
  return new Promise((resolve) => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const json = JSON.stringify(state);
        if (isNative()) {
          await Preferences.set({ key: STORAGE_KEY, value: json });
        } else {
          localStorage.setItem(STORAGE_KEY, json);
        }
        resolve();
      } catch (err) {
        console.error('[storage] saveState error', err);
        resolve();
      }
    }, 120);
  });
}

/**
 * Wipes all stored data. Used for debug and "Cerrar sesión".
 */
export async function clearState() {
  if (isNative()) {
    await Preferences.remove({ key: STORAGE_KEY });
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
