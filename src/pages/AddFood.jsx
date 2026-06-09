import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, PenLine, Loader2, CheckCircle, AlertCircle, ChevronLeft, RotateCcw, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { compressImage } from '../utils/imageUtils.js';
import { todayKey } from '../utils/calculations.js';

export default function AddFood() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'photo' | 'manual'

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white px-5 pt-10 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => (mode ? setMode(null) : navigate(-1))} className="text-gray-400 hover:text-gray-700">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {mode === 'photo' ? 'Scan Food' : mode === 'manual' ? 'Log Manually' : 'Add Food'}
        </h1>
      </div>

      {mode === null  && <ModeSelect onSelect={setMode} />}
      {mode === 'photo'  && <PhotoMode onBack={() => setMode(null)} />}
      {mode === 'manual' && <ManualMode onBack={() => setMode(null)} />}
    </div>
  );
}

// ── Mode selection ────────────────────────────────────────────────────────────
function ModeSelect({ onSelect }) {
  return (
    <div className="p-5 space-y-4">
      <p className="text-sm text-gray-500">How would you like to log food?</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('photo')}
          className="flex flex-col items-center gap-3 bg-white border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-2xl p-6 transition-colors group"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center transition-colors">
            <Camera size={28} className="text-primary-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Scan Food</p>
            <p className="text-xs text-gray-400 mt-0.5">AI estimates calories & macros from photo</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('manual')}
          className="flex flex-col items-center gap-3 bg-white border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 rounded-2xl p-6 transition-colors group"
        >
          <div className="w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
            <PenLine size={28} className="text-gray-500 group-hover:text-primary-600 transition-colors" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">Log Manually</p>
            <p className="text-xs text-gray-400 mt-0.5">Enter food name, calories and macros</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Photo mode ────────────────────────────────────────────────────────────────
function PhotoMode({ onBack }) {
  const navigate = useNavigate();
  const { addFood } = useApp();
  const fileRef = useRef(null);

  const [photo, setPhoto]       = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [saved, setSaved]       = useState(false);

  // Editable result fields
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    setSaved(false);
    try {
      const compressed = await compressImage(file, 1024, 0.85);
      setPhoto(compressed);
      await runAnalysis(compressed);
    } catch (err) {
      setError('Failed to process image: ' + err.message);
    }
  }

  async function runAnalysis(img) {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: img.base64, imageType: img.type }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Analysis failed');
      const f = data.foodData;
      setResult(f);
      setForm({
        name:     f.name,
        calories: String(Math.round(f.calories)),
        protein:  String(Math.round(f.protein  * 10) / 10),
        carbs:    String(Math.round(f.carbs    * 10) / 10),
        fat:      String(Math.round(f.fat      * 10) / 10),
        fiber:    String(Math.round((f.fiber || 0) * 10) / 10),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function saveEntry() {
    addFood({
      date:     todayKey(),
      timestamp: Date.now(),
      name:     form.name || 'Unknown food',
      calories: parseFloat(form.calories) || 0,
      protein:  parseFloat(form.protein)  || 0,
      carbs:    parseFloat(form.carbs)    || 0,
      fat:      parseFloat(form.fat)      || 0,
      fiber:    parseFloat(form.fiber)    || 0,
      source:   'photo',
      photo:    photo?.dataUrl ? createThumbnail(photo.dataUrl) : undefined,
    });
    setSaved(true);
    setTimeout(() => navigate('/dashboard'), 1200);
  }

  function reset() {
    setPhoto(null);
    setResult(null);
    setError('');
    setSaved(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="p-5 space-y-4">
      {/* Upload area */}
      {!photo ? (
        <label className="block cursor-pointer">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" />
          <div className="border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-2xl p-10 flex flex-col items-center gap-3 text-gray-400 transition-colors">
            <Camera size={48} className="text-gray-300" />
            <div className="text-center">
              <p className="font-medium text-gray-600">Take a photo or upload</p>
              <p className="text-xs mt-0.5">Point camera at your food for AI analysis</p>
            </div>
            <span className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold mt-1">
              <Camera size={16} /> Open Camera
            </span>
          </div>
        </label>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden">
            <img src={photo.dataUrl} alt="Food" className="w-full max-h-56 object-cover" />
            <button
              onClick={reset}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {analyzing && (
            <div className="flex items-center justify-center gap-2 text-primary-600 py-4">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-medium">Analyzing food...</span>
            </div>
          )}

          {error && (
            <div className="flex gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p>{isApiKeyError(error) ? 'AI scanning not set up yet — fill in the nutrition details manually below.' : error}</p>
                {!isApiKeyError(error) && (
                  <button onClick={() => runAnalysis(photo)} className="text-red-700 font-medium mt-1 underline text-xs">
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}

          {error && isApiKeyError(error) && (
            <NutritionForm form={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))} nameRequired />
          )}

          {error && isApiKeyError(error) && form.name && form.calories && (
            saved ? (
              <div className="flex items-center justify-center gap-2 text-primary-600 py-3">
                <CheckCircle size={20} /> <span className="font-semibold">Saved!</span>
              </div>
            ) : (
              <button onClick={saveEntry} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl transition-colors">
                Add to Log
              </button>
            )
          )}

          {result && !analyzing && (
            <div className="space-y-4">
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 flex items-start gap-2">
                <CheckCircle size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <strong className="text-primary-700">AI identified:</strong> {result.servingSize}
                  {result.breakdown && <p className="mt-0.5 text-gray-500">{result.breakdown}</p>}
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    result.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    result.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {result.confidence} confidence
                  </span>
                </div>
              </div>

              <NutritionForm form={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))} />

              {saved ? (
                <div className="flex items-center justify-center gap-2 text-primary-600 py-3">
                  <CheckCircle size={20} /> <span className="font-semibold">Saved!</span>
                </div>
              ) : (
                <button
                  onClick={saveEntry}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
                >
                  Add to Log
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Manual mode ───────────────────────────────────────────────────────────────
function ManualMode() {
  const navigate = useNavigate();
  const { addFood } = useApp();
  const [saved, setSaved]   = useState(false);
  const [mealType, setMealType] = useState('');
  const [form, setForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '',
  });

  function handleSave() {
    if (!form.name.trim() || !form.calories) return;
    addFood({
      date:      todayKey(),
      timestamp: Date.now(),
      name:      form.name.trim(),
      calories:  parseFloat(form.calories) || 0,
      protein:   parseFloat(form.protein)  || 0,
      carbs:     parseFloat(form.carbs)    || 0,
      fat:       parseFloat(form.fat)      || 0,
      fiber:     parseFloat(form.fiber)    || 0,
      mealType:  mealType || undefined,
      source:    'manual',
    });
    setSaved(true);
    setTimeout(() => navigate('/dashboard'), 1200);
  }

  const valid = form.name.trim() && form.calories && parseFloat(form.calories) > 0;

  return (
    <div className="p-5 space-y-4">
      <NutritionForm
        form={form}
        onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))}
        nameRequired
      />

      {/* Meal type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Meal <span className="text-gray-400 font-normal">(optional)</span></label>
        <div className="flex gap-2 flex-wrap">
          {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMealType(mealType === m.toLowerCase() ? '' : m.toLowerCase())}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                mealType === m.toLowerCase()
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {saved ? (
        <div className="flex items-center justify-center gap-2 text-primary-600 py-3">
          <CheckCircle size={20} /> <span className="font-semibold">Saved!</span>
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={!valid}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          Add to Log
        </button>
      )}
    </div>
  );
}

// ── Shared nutrition form ──────────────────────────────────────────────────────
function NutritionForm({ form, onChange, nameRequired }) {
  const fields = [
    { key: 'name',     label: 'Food Name', type: 'text',   placeholder: 'e.g. Grilled chicken breast', full: true, required: nameRequired },
    { key: 'calories', label: 'Calories',  type: 'number', placeholder: '0',  unit: 'kcal' },
    { key: 'protein',  label: 'Protein',   type: 'number', placeholder: '0',  unit: 'g' },
    { key: 'carbs',    label: 'Carbs',     type: 'number', placeholder: '0',  unit: 'g' },
    { key: 'fat',      label: 'Fat',       type: 'number', placeholder: '0',  unit: 'g' },
    { key: 'fiber',    label: 'Fiber',     type: 'number', placeholder: '0',  unit: 'g', optional: true },
  ];

  return (
    <div className="space-y-3">
      {fields.map(f => (
        <div key={f.key} className={f.full ? '' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {f.label}
            {f.optional && <span className="text-gray-400 font-normal"> (optional)</span>}
          </label>
          <div className="relative">
            <input
              type={f.type}
              value={form[f.key]}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              min={f.type === 'number' ? '0' : undefined}
              step={f.type === 'number' ? '0.1' : undefined}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white pr-12"
            />
            {f.unit && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">{f.unit}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function isApiKeyError(msg) {
  return msg && (
    msg.includes('authentication_error') ||
    msg.includes('invalid x-key') ||
    msg.includes('ANTHROPIC_API_KEY') ||
    msg.includes('401')
  );
}

// Thumbnail helper
function createThumbnail(dataUrl) {
  return dataUrl;
}
