// Wait-time verification algorithm.
//
// - Only consider reports from the last 90 minutes.
// - Weight recent reports higher: < 30 min old → 2x, 30–90 min → 1x.
// - Compute the weighted median.
// - Fewer than 2 reports → return the single value (caller shows "1 report").
// - confidence: low | medium | high based on how many reports back it.

const WINDOW_MIN = 90;
const RECENT_MIN = 30;

export function computeWaitTime(reports, now = new Date()) {
  const nowMs = now.getTime();

  // Keep only reports inside the 90-minute window, with their weights.
  const weighted = [];
  for (const r of reports) {
    const ageMin = (nowMs - new Date(r.createdAt).getTime()) / 60000;
    if (ageMin < 0 || ageMin > WINDOW_MIN) continue;
    const weight = ageMin < RECENT_MIN ? 2 : 1;
    weighted.push({ waitMin: r.waitMin, weight });
  }

  const reportCount = weighted.length;
  if (reportCount === 0) {
    return { waitMin: null, reportCount: 0, confidence: 'low' };
  }

  const waitMin = weightedMedian(weighted);
  const confidence = reportCount >= 4 ? 'high' : reportCount >= 2 ? 'medium' : 'low';

  return { waitMin, reportCount, confidence };
}

// Weighted median: the value where cumulative weight crosses half the total.
function weightedMedian(items) {
  const sorted = [...items].sort((a, b) => a.waitMin - b.waitMin);
  const total = sorted.reduce((s, i) => s + i.weight, 0);
  const half = total / 2;

  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].weight;
    if (cumulative > half) {
      return sorted[i].waitMin;
    }
    // Exact midpoint between two weighted groups → average the two.
    if (cumulative === half) {
      const next = sorted[i + 1] ?? sorted[i];
      return Math.round((sorted[i].waitMin + next.waitMin) / 2);
    }
  }
  return sorted[sorted.length - 1].waitMin;
}
