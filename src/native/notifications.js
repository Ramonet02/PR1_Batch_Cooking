/**
 * native/notifications.js
 *
 * Wrapper around @capacitor/local-notifications. Used by Modo Batch so the
 * user gets alerted when a timer hits zero even if the app is in background
 * (Android kills WebView JS execution when minimized — only a scheduled
 * native notification can reach the user then).
 *
 * Permission is requested lazily the first time we try to schedule.
 *
 * Each timer notification uses the timer's ID hashed to an integer (Capacitor
 * requires integer IDs for local notifications).
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

let permissionChecked = false;
let permissionGranted = false;

async function ensurePermission() {
  if (!Capacitor.isNativePlatform()) return false;
  if (permissionChecked) return permissionGranted;

  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      permissionGranted = true;
    } else {
      const req = await LocalNotifications.requestPermissions();
      permissionGranted = req.display === 'granted';
    }
  } catch (err) {
    console.warn('[notifications] permission error', err);
    permissionGranted = false;
  }
  permissionChecked = true;
  return permissionGranted;
}

/**
 * Hash a string ID to a stable small positive integer.
 */
function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 2147483647;
}

/**
 * Schedule a local notification to fire when a timer finishes.
 * @param {string} timerId
 * @param {string} label — what the user sees in the notification body
 * @param {number} firesInSec — seconds from now
 */
export async function scheduleTimerEnd(timerId, label, firesInSec) {
  if (!Capacitor.isNativePlatform()) return;
  if (firesInSec <= 0) return;
  const ok = await ensurePermission();
  if (!ok) return;

  const id = hashId(timerId);
  const at = new Date(Date.now() + firesInSec * 1000);

  try {
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: '⚡ Timer terminado',
        body: `${label} está listo`,
        schedule: { at },
        sound: undefined,
        smallIcon: 'ic_stat_icon_config_sample',
        actionTypeId: '',
      }],
    });
  } catch (err) {
    console.warn('[notifications] schedule error', err);
  }
}

/**
 * Cancel a previously scheduled timer notification. Called when the user
 * pauses or resets a timer that had a notification queued.
 */
export async function cancelTimerEnd(timerId) {
  if (!Capacitor.isNativePlatform()) return;
  const id = hashId(timerId);
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (err) {
    console.warn('[notifications] cancel error', err);
  }
}
