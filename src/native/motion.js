/**
 * native/motion.js
 *
 * Wrapper around @capacitor/motion for shake detection.
 *
 * Algorithm:
 *   On each `accel` event, compute total acceleration |a| = √(x² + y² + z²).
 *   Earth's gravity contributes ~9.8 m/s², so a person at rest gives |a| ≈ 9.8.
 *   A vigorous shake spikes |a| past 25–30 m/s² for several frames.
 *
 *   We trigger when |a| crosses the threshold AND a 1.2s cooldown has elapsed
 *   since the last trigger (avoids re-firing while the device is still oscillating).
 *
 * Browser fallback: in dev mode, listens for `devicemotion` events. On desktop
 * the listener never fires — the user can still trigger random via the
 * "Sorpréndeme" button.
 *
 * iOS 13+ note: requires user permission via DeviceMotionEvent.requestPermission.
 *               We don't currently target iOS so this is omitted.
 */

import { Motion } from '@capacitor/motion';
import { Capacitor } from '@capacitor/core';

const SHAKE_THRESHOLD = 25;   // m/s²
const COOLDOWN_MS     = 1200;

/**
 * Start watching for a shake. The callback fires once per shake (cooled down).
 * @param {() => void} onShake
 * @returns {() => void} stop watching
 */
export async function watchShake(onShake) {
  let lastTrigger = 0;

  const handler = (event) => {
    const a = event?.acceleration || event?.accelerationIncludingGravity;
    if (!a) return;
    const total = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    if (total < SHAKE_THRESHOLD) return;
    const now = Date.now();
    if (now - lastTrigger < COOLDOWN_MS) return;
    lastTrigger = now;
    onShake();
  };

  if (Capacitor.isNativePlatform()) {
    try {
      const handle = await Motion.addListener('accel', handler);
      return () => { try { handle.remove(); } catch {} };
    } catch (err) {
      console.warn('[motion] addListener failed', err);
      return () => {};
    }
  }

  // Browser fallback
  if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
    const browserHandler = (e) => handler({
      acceleration: e.acceleration,
      accelerationIncludingGravity: e.accelerationIncludingGravity,
    });
    window.addEventListener('devicemotion', browserHandler);
    return () => window.removeEventListener('devicemotion', browserHandler);
  }

  return () => {};
}
