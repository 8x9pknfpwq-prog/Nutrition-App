// Native push registration (iOS). No-op on the web.
//
// Flow: ask permission → register with APNs → receive the device token →
// store it in Supabase (device_tokens) keyed to the signed-in user, so the
// send-push Edge Function can target the user's devices for wait alerts and
// friend check-ins. Sending happens server-side (see supabase/functions).
import { isNative, platform } from './native.js';
import { api } from './api.js';

let registered = false;

export async function registerPush() {
  if (!isNative() || registered) return;
  registered = true;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') {
    registered = false;
    return;
  }

  PushNotifications.addListener('registration', (token) => {
    api.saveDeviceToken?.(token.value, platform()).catch(() => {});
  });
  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error', err);
  });

  await PushNotifications.register();
}

export async function unregisterPush() {
  registered = false;
  if (!isNative()) return;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  await PushNotifications.removeAllListeners();
}
