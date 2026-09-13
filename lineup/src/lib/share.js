// Loop #1 — the one-tap "share this wait" card.
//
// A wait report is only useful to the person deciding where to go *right now*,
// which makes it the perfect thing to drop into a group chat. This turns any
// bar's current wait into a share: a branded image card where the platform
// supports it, otherwise rich text, always carrying a deep link back to the
// bar's live page (see pages/SharedBar.jsx). Non-users who tap the link land on
// that page and can jump straight into the map.
import { renderWaitCardBlob } from './shareCard.js';

// The public, shareable deep link to a bar. Uses the app's base URL + hash
// route so it resolves on static hosts (GitHub Pages) and in the native shell.
export function shareUrlForBar(bar) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`;
  return `${base}#/bar/${bar.id}`;
}

function waitEmoji(waitMin, closed) {
  if (closed) return '⚫';
  if (waitMin == null) return '⚪';
  if (waitMin <= 10) return '🟢';
  if (waitMin <= 30) return '🟡';
  return '🔴';
}

// The human one-liner that leads the share text.
function shareLine(bar, { waitMin, closed, isLive }) {
  const emoji = waitEmoji(waitMin, closed);
  if (closed) return `${emoji} ${bar.name} — closed right now`;
  if (waitMin == null) return `${emoji} ${bar.name} — no line reports yet`;
  const label = waitMin === 0 ? 'no line' : `${waitMin} min line`;
  return `${emoji} ${bar.name} — ${label} ${isLive ? 'right now' : 'expected'}`;
}

// Share a bar's current wait. Tries, in order:
//   1. native/web share with a generated image card + link,
//   2. native/web share with text + link,
//   3. copy the link to the clipboard.
// Returns 'shared' | 'copied' | 'cancelled' | 'unsupported'.
export async function shareWait(bar, wait) {
  const url = shareUrlForBar(bar);
  const line = shareLine(bar, wait);
  const title = `${bar.name} · NYC Lines`;

  // 1) Image card (best-effort — needs Web Share Level 2 with files).
  try {
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      const blob = await renderWaitCardBlob(bar, wait);
      if (blob) {
        const file = new File([blob], 'nyc-lines.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title,
            text: `${line}\n\nSee it live: ${url}`,
          });
          return 'shared';
        }
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    // fall through to a text share
  }

  // 2) Text + link share.
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text: `${line}\n\nLive on NYC Lines 👇`, url });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
    // fall through to clipboard
  }

  // 3) Clipboard fallback (desktop browsers without the Share API).
  try {
    await navigator.clipboard.writeText(`${line}\n${url}`);
    return 'copied';
  } catch {
    return 'unsupported';
  }
}
