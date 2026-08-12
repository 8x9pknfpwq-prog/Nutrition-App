// Device contacts access (native only, via @capacitor-community/contacts).
// On the web this is a no-op so the UI can fall back to manual add-by-username.
import { Capacitor } from '@capacitor/core';

// Loaded lazily so the web bundle never pulls in the native plugin eagerly.
async function getPlugin() {
  const mod = await import('@capacitor-community/contacts');
  return mod.Contacts;
}

// True only inside the native iOS/Android shell, where reading contacts works.
export function contactsAvailable() {
  return Capacitor.isNativePlatform();
}

// Ask for permission and read the address book. Returns a de-duplicated list of
// phone numbers (raw strings — normalization happens server-side). Throws a
// friendly error if the user denies permission or we're not on device.
export async function readContactPhones() {
  if (!contactsAvailable()) {
    throw new Error('Contacts are only available in the app.');
  }
  const Contacts = await getPlugin();

  const perm = await Contacts.requestPermissions();
  if (perm?.contacts !== 'granted') {
    throw new Error('Contacts permission was denied. You can enable it in Settings.');
  }

  const { contacts } = await Contacts.getContacts({ projection: { phones: true } });
  const seen = new Set();
  const phones = [];
  for (const c of contacts || []) {
    for (const p of c.phones || []) {
      const num = (p?.number || '').trim();
      if (!num) continue;
      const key = num.replace(/\D/g, '');
      if (key.length < 10 || seen.has(key)) continue;
      seen.add(key);
      phones.push(num);
    }
  }
  return phones;
}
