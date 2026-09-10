// Renders a branded, screenshot-worthy square card for a bar's current wait to a
// PNG Blob, via an offscreen canvas. This is the visual that lands in a group
// chat: venue name, a big color-coded wait number, and the NYC Lines wordmark.
// Best-effort — returns null on any failure so callers fall back to a text share.
import { waitColor } from './wait.js';

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Draw up to `maxLines` of wrapped text; last line gets an ellipsis if clipped.
function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  let out = lines.slice(0, maxLines);
  if (out.length === maxLines) {
    while (out[maxLines - 1] && ctx.measureText(`${out[maxLines - 1]}…`).width > maxW) {
      out[maxLines - 1] = out[maxLines - 1].replace(/\s?\S+$/, '');
    }
    // Add ellipsis only if we actually dropped words.
    const joined = out.join(' ');
    if (joined.length < String(text).length) out[maxLines - 1] += '…';
  }
  out.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineH));
  return out.length;
}

export async function renderWaitCardBlob(bar, wait) {
  try {
    // Make sure the web fonts are loaded so the canvas uses them, not a fallback.
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch { /* ignore */ }
    }
    const S = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const waitMin = wait?.waitMin;
    const closed = !!wait?.closed;
    const color = closed || waitMin == null ? '#9A968D' : waitColor(waitMin);
    const pad = 96;

    // Ground — brand ink, with a soft glow in the wait color up top.
    ctx.fillStyle = '#1A1A18';
    ctx.fillRect(0, 0, S, S);
    const glow = ctx.createRadialGradient(S / 2, 260, 40, S / 2, 260, 680);
    glow.addColorStop(0, hexA(color, 0.18));
    glow.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, S);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // Wordmark: three signal dots + "NYC LINES".
    const dotY = 150;
    const dotR = 15;
    const step = 42;
    ['#E53935', '#F5A623', '#4CAF50'].forEach((dc, i) => {
      ctx.beginPath();
      ctx.fillStyle = dc;
      ctx.arc(pad + dotR + i * step, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#F5F2EC';
    ctx.font = '600 34px "IBM Plex Mono", monospace';
    ctx.fillText('NYC LINES', pad + 3 * step + 24, dotY + 12);

    // The big number.
    if (closed) {
      ctx.fillStyle = '#C9C3B6';
      ctx.font = '700 168px "IBM Plex Sans", sans-serif';
      ctx.fillText('Closed', pad, 520);
    } else if (waitMin == null) {
      ctx.fillStyle = '#C9C3B6';
      ctx.font = '700 132px "IBM Plex Sans", sans-serif';
      ctx.fillText('No line reports', pad, 500);
    } else {
      const num = waitMin >= 90 ? '90+' : String(waitMin);
      ctx.fillStyle = color;
      ctx.font = '700 300px "IBM Plex Mono", monospace';
      ctx.fillText(num, pad, 540);
      const numW = ctx.measureText(num).width;
      ctx.fillStyle = '#8A8070';
      ctx.font = '600 48px "IBM Plex Mono", monospace';
      ctx.fillText('MIN', pad + numW + 34, 440);
      ctx.fillText('LINE', pad + numW + 34, 500);
    }

    // Venue name.
    ctx.fillStyle = '#F5F2EC';
    ctx.font = '700 74px "IBM Plex Sans", sans-serif';
    const nameLines = wrapText(ctx, bar?.name || 'A bar', pad, 690, S - pad * 2, 86, 2);

    // Sub line.
    ctx.fillStyle = '#B8B0A0';
    ctx.font = '400 40px "IBM Plex Sans", sans-serif';
    const subY = 690 + nameLines * 86 + 26;
    const sub = closed
      ? 'See when it opens on NYC Lines'
      : waitMin == null
        ? 'Be the first to report the line'
        : wait?.isLive
          ? 'Live · reported by the crowd right now'
          : 'Typical wait around now';
    ctx.fillText(sub, pad, subY);

    // Footer CTA.
    ctx.fillStyle = color;
    ctx.font = '600 38px "IBM Plex Mono", monospace';
    ctx.fillText('Check the line before you go →', pad, S - 90);

    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.92));
  } catch {
    return null;
  }
}
