// Shared wait-time verification (same algorithm as the server / demo):
// last 90 min, reports < 30 min old weighted 2x, weighted median + confidence.
// Input: array of { waitMin, createdAt }.
const WINDOW_MIN = 90;
const RECENT_MIN = 30;

export function computeWait(reports, now = Date.now()) {
  const weighted = [];
  for (const r of reports) {
    const ageMin = (now - new Date(r.createdAt).getTime()) / 60000;
    if (ageMin < 0 || ageMin > WINDOW_MIN) continue;
    weighted.push({ waitMin: r.waitMin, weight: ageMin < RECENT_MIN ? 2 : 1 });
  }
  const reportCount = weighted.length;
  if (!reportCount) return { waitMin: null, reportCount: 0, confidence: 'low' };

  weighted.sort((a, b) => a.waitMin - b.waitMin);
  const total = weighted.reduce((s, x) => s + x.weight, 0);
  const half = total / 2;
  let cum = 0;
  let waitMin = weighted[weighted.length - 1].waitMin;
  for (let i = 0; i < weighted.length; i++) {
    cum += weighted[i].weight;
    if (cum > half) { waitMin = weighted[i].waitMin; break; }
    if (cum === half) {
      const next = weighted[i + 1] ?? weighted[i];
      waitMin = Math.round((weighted[i].waitMin + next.waitMin) / 2);
      break;
    }
  }
  const confidence = reportCount >= 4 ? 'high' : reportCount >= 2 ? 'medium' : 'low';
  return { waitMin, reportCount, confidence };
}
