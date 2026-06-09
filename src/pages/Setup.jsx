import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Camera, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import {
  calculateBMR, calculateTDEE, calculateDailyCalories, calculateMacros,
  lbsToKg, kgToLbs, ftInToCm, cmToFtIn,
} from '../utils/calculations.js';
import { compressImage } from '../utils/imageUtils.js';

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',  label: 'Sedentary',      desc: 'Desk job, little/no exercise' },
  { value: 'light',      label: 'Lightly Active',  desc: 'Exercise 1–3 days/week' },
  { value: 'moderate',   label: 'Moderately Active',desc: 'Exercise 3–5 days/week' },
  { value: 'active',     label: 'Very Active',     desc: 'Exercise 6–7 days/week' },
  { value: 'very_active',label: 'Athlete',         desc: 'Physical job or 2x daily training' },
];

const GOAL_OPTIONS = [
  { value: 'lose',     label: 'Lose Weight',    desc: '~500 cal deficit/day', emoji: '🔥' },
  { value: 'maintain', label: 'Maintain Weight', desc: 'Eat at maintenance',   emoji: '⚖️' },
  { value: 'gain',     label: 'Build Muscle',    desc: '~300 cal surplus/day', emoji: '💪' },
];

export default function Setup() {
  const navigate = useNavigate();
  const { setProfile } = useApp();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName]         = useState('');
  const [age, setAge]           = useState('');
  const [gender, setGender]     = useState('male');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [weightVal, setWeightVal]   = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [heightCm, setHeightCm]     = useState('');
  const [heightFt, setHeightFt]     = useState('');
  const [heightIn, setHeightIn]     = useState('0');

  // Step 2 fields
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal]                   = useState('maintain');

  // Step 3 fields
  const [photo, setPhoto]         = useState(null); // { base64, dataUrl, type }
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis]   = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  // ── helpers ──────────────────────────────────────────────────────────────
  const getWeightKg = () => {
    const v = parseFloat(weightVal);
    return weightUnit === 'lbs' ? lbsToKg(v) : v;
  };

  const getHeightCm = () => {
    if (heightUnit === 'cm') return parseFloat(heightCm);
    return ftInToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0);
  };

  const step1Valid = () =>
    age && parseInt(age) > 0 && parseInt(age) < 120 &&
    weightVal && parseFloat(weightVal) > 0 &&
    (heightUnit === 'cm' ? heightCm && parseFloat(heightCm) > 0
                         : heightFt && parseInt(heightFt) > 0);

  // ── photo handling ────────────────────────────────────────────────────────
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1024, 0.85);
      setPhoto(compressed);
      setAnalysis(null);
      setAnalysisError('');
    } catch {
      setAnalysisError('Failed to process image. Please try a different photo.');
    }
  }

  async function analyzePhoto() {
    if (!photo) return;
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const res = await fetch('/api/analyze-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photo.base64,
          imageType: photo.type,
          weight: getWeightKg(),
          height: getHeightCm(),
          age: parseInt(age),
          gender,
          activityLevel,
          goal,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // ── finish setup ──────────────────────────────────────────────────────────
  function finishSetup() {
    const weightKg  = getWeightKg();
    const heightCmV = getHeightCm();
    const bmr       = calculateBMR(weightKg, heightCmV, parseInt(age), gender);
    const tdee      = calculateTDEE(bmr, activityLevel);
    const baseCalories = calculateDailyCalories(tdee, goal);

    let dailyCalories, macroTargets;

    if (analysis) {
      dailyCalories = analysis.adjustedCalories;
      macroTargets  = {
        protein: analysis.proteinTarget,
        carbs:   analysis.carbTarget,
        fat:     analysis.fatTarget,
      };
    } else {
      dailyCalories = baseCalories;
      macroTargets  = calculateMacros(baseCalories, goal);
    }

    setProfile({
      name:          name.trim() || undefined,
      age:           parseInt(age),
      gender,
      weight:        weightKg,
      height:        heightCmV,
      activityLevel,
      goal,
      dailyCalories,
      macroTargets,
      bodyAnalysis:  analysis || undefined,
      createdAt:     Date.now(),
    });

    navigate('/dashboard');
  }

  // ── render steps ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🥗</span>
          <h1 className="text-2xl font-bold text-gray-900">NutriTrack</h1>
        </div>
        <p className="text-gray-500 text-sm">Set up your personalized nutrition plan</p>

        {/* Step dots */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-primary-600 flex-1' : 'bg-gray-200 w-8'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">Step {step} of 3</p>
      </div>

      <div className="flex-1 px-6 overflow-y-auto">
        {step === 1 && <Step1 {...{
          name, setName, age, setAge,
          gender, setGender,
          weightUnit, setWeightUnit, weightVal, setWeightVal,
          heightUnit, setHeightUnit, heightCm, setHeightCm,
          heightFt, setHeightFt, heightIn, setHeightIn,
        }} />}

        {step === 2 && <Step2 {...{
          activityLevel, setActivityLevel, goal, setGoal,
        }} />}

        {step === 3 && <Step3 {...{
          photo, analyzing, analysis, analysisError,
          handlePhotoChange, analyzePhoto,
          weightKg: getWeightKg(), heightCmV: getHeightCm(),
          age: parseInt(age), gender, activityLevel, goal,
        }} />}
      </div>

      {/* Navigation buttons */}
      <div className="px-6 py-6 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
          >
            <ChevronLeft size={18} /> Back
          </button>
        )}
        <button
          onClick={() => {
            if (step < 3) setStep(s => s + 1);
            else finishSetup();
          }}
          disabled={step === 1 && !step1Valid()}
          className="flex-1 flex items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {step < 3 ? (
            <><span>Continue</span><ChevronRight size={18} /></>
          ) : (
            <><CheckCircle size={18} /><span>Get Started</span></>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 1: Personal Info ────────────────────────────────────────────────────
function Step1({ name, setName, age, setAge, gender, setGender,
  weightUnit, setWeightUnit, weightVal, setWeightVal,
  heightUnit, setHeightUnit, heightCm, setHeightCm,
  heightFt, setHeightFt, heightIn, setHeightIn }) {

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">About You</h2>
        <p className="text-sm text-gray-500 mt-0.5">This helps calculate your calorie needs</p>
      </div>

      {/* Name (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-gray-400 font-normal">(optional)</span></label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        />
      </div>

      {/* Age */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
        <input
          type="number"
          value={age}
          onChange={e => setAge(e.target.value)}
          placeholder="e.g. 28"
          min="10" max="120"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        />
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Biological Sex</label>
        <div className="grid grid-cols-2 gap-3">
          {['male', 'female'].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`py-3 rounded-xl border-2 font-medium capitalize transition-colors ${
                gender === g
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {g === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>
      </div>

      {/* Weight */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={weightVal}
            onChange={e => setWeightVal(e.target.value)}
            placeholder={weightUnit === 'kg' ? 'e.g. 75' : 'e.g. 165'}
            min="20" max="500" step="0.1"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {['kg', 'lbs'].map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setWeightUnit(u)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  weightUnit === u ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Height */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
        <div className="flex gap-2">
          {heightUnit === 'cm' ? (
            <input
              type="number"
              value={heightCm}
              onChange={e => setHeightCm(e.target.value)}
              placeholder="e.g. 175"
              min="100" max="250"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          ) : (
            <div className="flex-1 flex gap-2">
              <input
                type="number"
                value={heightFt}
                onChange={e => setHeightFt(e.target.value)}
                placeholder="ft"
                min="3" max="8"
                className="flex-1 px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
              <input
                type="number"
                value={heightIn}
                onChange={e => setHeightIn(e.target.value)}
                placeholder="in"
                min="0" max="11"
                className="flex-1 px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
          )}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {['cm', 'ft'].map(u => (
              <button
                key={u}
                type="button"
                onClick={() => setHeightUnit(u)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  heightUnit === u ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Activity & Goals ─────────────────────────────────────────────────
function Step2({ activityLevel, setActivityLevel, goal, setGoal }) {
  return (
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Activity & Goals</h2>
        <p className="text-sm text-gray-500 mt-0.5">Tailor your calorie targets</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
        <div className="space-y-2">
          {ACTIVITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setActivityLevel(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                activityLevel === opt.value
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className={`font-medium ${activityLevel === opt.value ? 'text-primary-700' : 'text-gray-800'}`}>
                {opt.label}
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Your Goal</label>
        <div className="grid grid-cols-3 gap-2">
          {GOAL_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGoal(opt.value)}
              className={`flex flex-col items-center py-4 px-2 rounded-xl border-2 transition-colors ${
                goal === opt.value
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className="text-2xl mb-1">{opt.emoji}</span>
              <span className={`text-xs font-semibold text-center ${goal === opt.value ? 'text-primary-700' : 'text-gray-700'}`}>
                {opt.label}
              </span>
              <span className="text-xs text-gray-400 text-center mt-0.5">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Body Photo ───────────────────────────────────────────────────────
function Step3({ photo, analyzing, analysis, analysisError, handlePhotoChange, analyzePhoto,
  weightKg, heightCmV, age, gender, activityLevel, goal }) {

  const bmr          = calculateBMR(weightKg, heightCmV, age, gender);
  const tdee         = calculateTDEE(bmr, activityLevel);
  const baseCalories = calculateDailyCalories(tdee, goal);
  const baseMacros   = calculateMacros(baseCalories, goal);

  const calories = analysis?.adjustedCalories ?? baseCalories;
  const macros   = analysis
    ? { protein: analysis.proteinTarget, carbs: analysis.carbTarget, fat: analysis.fatTarget }
    : baseMacros;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Body Photo</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Optional: upload a shirtless photo for AI-powered body composition analysis and refined calorie targets
        </p>
      </div>

      {/* Upload area */}
      <label className="block cursor-pointer">
        <input
          type="file"
          accept="image/*"
          capture="user"
          onChange={handlePhotoChange}
          className="sr-only"
        />
        <div className={`relative rounded-2xl border-2 border-dashed overflow-hidden transition-colors ${
          photo ? 'border-primary-400' : 'border-gray-300 hover:border-primary-400'
        }`} style={{ minHeight: 200 }}>
          {photo ? (
            <>
              <img src={photo.dataUrl} alt="Body photo" className="w-full object-cover max-h-64" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-white font-medium flex items-center gap-2">
                  <Upload size={16} /> Change photo
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Camera size={40} className="text-gray-300" />
              <div className="text-center">
                <p className="font-medium text-gray-600">Upload photo</p>
                <p className="text-xs mt-0.5">Tap to use camera or choose from gallery</p>
              </div>
            </div>
          )}
        </div>
      </label>

      {photo && !analysis && (
        <button
          onClick={analyzePhoto}
          disabled={analyzing}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {analyzing ? (
            <><Loader2 size={18} className="animate-spin" /><span>Analyzing...</span></>
          ) : (
            <><Camera size={18} /><span>Analyze Body Composition</span></>
          )}
        </button>
      )}

      {analysisError && (
        <div className="flex gap-2 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            {analysisError.includes('authentication_error') || analysisError.includes('ANTHROPIC_API_KEY') || analysisError.includes('401')
              ? 'AI analysis not available yet — your calorie targets have been calculated from your measurements instead.'
              : analysisError}
          </span>
        </div>
      )}

      {analysis && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-primary-700 font-semibold">
            <CheckCircle size={18} /> AI Analysis Complete
          </div>
          <p className="text-sm text-gray-700">{analysis.bodyCompositionNotes}</p>
          <p className="text-xs text-gray-500 italic">{analysis.recommendations}</p>
        </div>
      )}

      {/* Calorie summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-800">
          {analysis ? 'AI-Adjusted Targets' : 'Calculated Targets'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-primary-700">{calories.toLocaleString()}</div>
            <div className="text-xs text-gray-500">calories/day</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-blue-600 font-medium">Protein</span>
                <span className="font-semibold">{macros.protein}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-500 font-medium">Carbs</span>
                <span className="font-semibold">{macros.carbs}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-500 font-medium">Fat</span>
                <span className="font-semibold">{macros.fat}g</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          {analysis ? '' : 'Upload a photo for AI-refined targets ↑'}
        </p>
      </div>
    </div>
  );
}
