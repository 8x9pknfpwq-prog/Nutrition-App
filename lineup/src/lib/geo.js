// One-shot geolocation that works on web and native iOS.
// Native uses the Capacitor Geolocation plugin (more reliable in a WKWebView and
// drives the iOS permission prompt via Info.plist usage strings); web falls back
// to navigator.geolocation. Returns { latitude, longitude } or throws.
import { isNative } from './native.js';

// You must be within this many meters of a venue to report its line. Generous
// enough for GPS drift in dense NYC (bounce off buildings) and for standing in
// a line down the block, tight enough to stop couch reports.
export const CHECKIN_RADIUS_M = 250;

// Great-circle distance in meters between two { latitude, longitude } points.
export function metersBetween(a, b) {
  if (!a || !b || a.latitude == null || b.latitude == null) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000; // Earth radius, meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

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
