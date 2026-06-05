export function calculateBMR(weight, height, age, gender) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr, activityLevel) {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

export function calculateDailyCalories(tdee, goal) {
  const adjustments = { lose: -500, maintain: 0, gain: 300 };
  return Math.max(1200, tdee + (adjustments[goal] || 0));
}

export function calculateMacros(calories, goal) {
  const splits = {
    lose:     { protein: 0.35, carbs: 0.40, fat: 0.25 },
    maintain: { protein: 0.30, carbs: 0.45, fat: 0.25 },
    gain:     { protein: 0.30, carbs: 0.50, fat: 0.20 },
  };
  const s = splits[goal] || splits.maintain;
  return {
    protein: Math.round((calories * s.protein) / 4),
    carbs:   Math.round((calories * s.carbs)   / 4),
    fat:     Math.round((calories * s.fat)     / 9),
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === todayKey()) return 'Today';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function lbsToKg(lbs) { return Math.round(lbs * 0.453592 * 10) / 10; }
export function kgToLbs(kg)   { return Math.round(kg  * 2.20462  * 10) / 10; }
export function cmToFtIn(cm)  {
  const totalIn = cm / 2.54;
  return { ft: Math.floor(totalIn / 12), inches: Math.round(totalIn % 12) };
}
export function ftInToCm(ft, inches) { return Math.round((ft * 12 + inches) * 2.54); }
