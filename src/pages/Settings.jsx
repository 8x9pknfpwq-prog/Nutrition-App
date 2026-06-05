import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight, RefreshCw, AlertTriangle, Target, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { kgToLbs, cmToFtIn } from '../utils/calculations.js';

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary', light: 'Lightly Active', moderate: 'Moderately Active',
  active: 'Very Active', very_active: 'Athlete',
};
const GOAL_LABELS = { lose: 'Lose Weight', maintain: 'Maintain', gain: 'Build Muscle' };

export default function Settings() {
  const navigate = useNavigate();
  const { profile, clearProfile } = useApp();
  const [confirmReset, setConfirmReset] = useState(false);

  const { ft, inches } = cmToFtIn(profile.height);
  const heightStr = `${ft}'${inches}" (${Math.round(profile.height)} cm)`;
  const weightStr = `${profile.weight} kg (${kgToLbs(profile.weight)} lbs)`;

  function handleReset() {
    if (confirmReset) {
      clearProfile();
      navigate('/setup', { replace: true });
    } else {
      setConfirmReset(true);
    }
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white px-5 pt-10 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Avatar + name */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <User size={28} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{profile.name || 'You'}</h2>
            <p className="text-sm text-gray-500">{profile.age} years · {profile.gender === 'male' ? 'Male' : 'Female'}</p>
          </div>
        </div>

        {/* Body metrics */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Body Metrics</h3>
          </div>
          <InfoRow label="Weight" value={weightStr} />
          <InfoRow label="Height" value={heightStr} />
          {profile.bodyAnalysis && (
            <InfoRow label="Est. Body Fat" value={`~${profile.bodyAnalysis.estimatedBodyFat}%`} />
          )}
        </div>

        {/* Targets */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <Target size={14} /> Daily Targets
            </h3>
          </div>
          <InfoRow label="Calories"      value={`${profile.dailyCalories.toLocaleString()} kcal`} highlight />
          <InfoRow label="Protein"       value={`${profile.macroTargets.protein}g`} />
          <InfoRow label="Carbohydrates" value={`${profile.macroTargets.carbs}g`} />
          <InfoRow label="Fat"           value={`${profile.macroTargets.fat}g`} />
        </div>

        {/* Activity & Goal */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <Activity size={14} /> Lifestyle
            </h3>
          </div>
          <InfoRow label="Activity Level" value={ACTIVITY_LABELS[profile.activityLevel] || profile.activityLevel} />
          <InfoRow label="Goal"           value={GOAL_LABELS[profile.goal] || profile.goal} />
        </div>

        {/* AI notes */}
        {profile.bodyAnalysis?.recommendations && (
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-primary-700 mb-1">AI Recommendations</h3>
            <p className="text-sm text-gray-600">{profile.bodyAnalysis.recommendations}</p>
          </div>
        )}

        {/* Reset */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <button
            onClick={handleReset}
            className={`w-full flex items-center gap-3 px-5 py-4 transition-colors ${
              confirmReset ? 'text-red-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {confirmReset ? (
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            ) : (
              <RefreshCw size={20} className="flex-shrink-0" />
            )}
            <div className="text-left">
              <p className="font-medium">
                {confirmReset ? 'Confirm — this will erase all data' : 'Reset Profile & Data'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {confirmReset ? 'Tap again to confirm. This cannot be undone.' : 'Start over with a new profile'}
              </p>
            </div>
            <ChevronRight size={18} className="ml-auto text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center px-5 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-primary-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}
