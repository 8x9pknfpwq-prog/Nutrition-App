import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

// Admin control: pick an image from the device and upload it for a venue.
export default function PhotoUpload({ venue, onUploaded, label = 'Photo' }) {
  const ref = useRef(null);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    try {
      const { imageUrl } = await api.uploadVenuePhoto(venue.id, file);
      onUploaded?.(imageUrl);
      showToast({ title: 'Photo updated', body: venue.name });
    } catch (err) {
      showToast({ title: 'Upload failed', body: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50"
      >
        <Camera size={14} /> {busy ? 'Uploading…' : label}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onPick} />
    </>
  );
}
