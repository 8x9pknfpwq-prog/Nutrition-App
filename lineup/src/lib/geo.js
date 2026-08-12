// One-shot geolocation that works on web and native iOS.
// Native uses the Capacitor Geolocation plugin (more reliable in a WKWebView and
// drives the iOS permission prompt via Info.plist usage strings); web falls back
// to navigator.geolocation. Returns { latitude, longitude } or throws.
import { isNative } from './native.js';

export async function getCurrentPosition({ timeout = 8000 } = {}) {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      const req = await Geolocation.requestPermissions();
      if (req.location !== 'granted') throw new Error('Location permission denied');
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location unavailable on this device'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout }
    );
  });
}
