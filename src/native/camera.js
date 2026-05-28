/**
 * native/camera.js
 *
 * Thin wrapper around @capacitor/camera. On device, opens the system camera
 * and returns a base64 data URL ready to drop into <img src="…">. In the
 * browser, falls back to a hidden <input type="file" capture="environment">
 * so the development flow keeps working without Android Studio.
 *
 * Both paths resolve to the same shape: a data URL string, or `null` if the
 * user cancelled.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const nativeAvailable = Capacitor.isPluginAvailable('Camera');

export async function takeTupperPhoto() {
  if (nativeAvailable) {
    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // user picks Camera or Gallery
        promptLabelHeader: 'Foto del tupper',
        promptLabelPhoto: 'Elegir de galería',
        promptLabelPicture: 'Hacer foto',
      });
      return photo.dataUrl ?? null;
    } catch {
      // User cancelled or no permission — treat as no-op
      return null;
    }
  }

  // Browser fallback: hidden file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        input.remove();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        input.remove();
        resolve(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.onerror = () => {
        input.remove();
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
    // Some browsers fire `cancel` when the picker is dismissed
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}
