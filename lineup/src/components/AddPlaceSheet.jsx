import { useState } from 'react';
import { X, MapPin, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

// Submit a new place. The server verifies it against Google Maps before saving,
// so only real spots get added.
export default function AddPlaceSheet({ onClose, onAdded }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { bar } = await api.createBar({ name, address });
      showToast({ title: 'Place added', body: `${bar.name} is now on the map` });
      onAdded?.(bar);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not add this place');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-t-3xl bg-canvas p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Add a place</h2>
            <p className="text-sm text-gray-500">Submit a bar — we verify it on Google Maps.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-black/5 p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Place name (e.g. Bleecker Street Bar)"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-ink"
          />
          <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
            <MapPin size={16} className="shrink-0 text-gray-400" />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address (e.g. 58 Bleecker St, New York)"
              className="flex-1 bg-transparent py-3 text-sm outline-none"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-wait-red">{error}</p>}

        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck size={14} /> Verified against Google Maps before it's added.
        </p>

        <button
          type="submit"
          disabled={submitting || !name.trim() || !address.trim()}
          className="mt-4 w-full rounded-2xl bg-ink py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Verifying…' : 'Add place'}
        </button>
      </form>
    </div>
  );
}
