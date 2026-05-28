/**
 * native/haptics.js
 *
 * Thin wrapper around @capacitor/haptics. Silently no-ops in environments
 * where haptics aren't available (browser dev, devices without vibrator),
 * so callers can always `await impact()` without try/catch boilerplate.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const available = Capacitor.isPluginAvailable('Haptics');

export async function impactLight() {
  if (!available) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}
export async function impactMedium() {
  if (!available) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
}
export async function impactHeavy() {
  if (!available) return;
  try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
}
export async function notifySuccess() {
  if (!available) return;
  try { await Haptics.notification({ type: NotificationType.Success }); } catch {}
}
