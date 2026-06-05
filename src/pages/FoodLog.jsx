import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trash2, Edit3, X, Check, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { todayKey, formatDate } from '../utils/calculations.js';

export default function FoodLog() {
  const navigate = useNavigate();
  const { profile, getDayEntries, getDayTotals, deleteFood, updateFood } = useApp();
  const [date, setDate] = useState(todayKey());
  const [editingId, setEditingId] = useState(null);

  const entries = getDayEntries(date);
  const totals  = getDayTotals(date);

  function prevDay() {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
    setEditingId(null);
  }

  function nextDay() {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d <= tomorrow) {
      setDate(d.toISOString().slice(0, 10));
      setEditingId(null);
    }
  }

  const isToday = date === todayKey();

  const grouped = entries.reduce((acc, e) => {
    const meal = e.mealType || 'other';
    if (!acc[meal]) acc[meal] = [];
    acc[meal].push(e);
    return acc;
  }, {});

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  const mealLabels = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' };
  const mealEmoji  = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎', other: '🍽️' };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-10 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Food Log</h1>
        {/* Date nav */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-2 py-2">
          <button onClick={prevDay} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <span className="font-semibold text-gray-800">{formatDate(date)}</span>
          <button
            onClick={nextDay}
            disabled={isToday}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Summary bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            <SummaryCell label="Calories" value={Math.round(totals.calories)} target={profile.dailyCalories} unit="cal" />
            <SummaryCell label="Protein"  value={Math.round(totals.protein)}  target={profile.macroTargets.protein} unit="g" />
            <SummaryCell label="Carbs"    value={Math.round(totals.carbs)}    target={profile.macroTargets.carbs}   unit="g" />
            <SummaryCell label="Fat"      value={Math.round(totals.fat)}      target={profile.macroTargets.fat}     unit="g" />
          </div>
        </div>

        {/* Food entries grouped by meal */}
        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">No food logged for {formatDate(date).toLowerCase()}</p>
            {isToday && (
              <button
                onClick={() => navigate('/add')}
                className="mt-3 flex items-center gap-1 mx-auto text-sm text-primary-600 font-medium"
              >
                <Plus size={16} /> Add food
              </button>
            )}
          </div>
        ) : (
          mealOrder.map(meal => {
            const items = grouped[meal];
            if (!items) return null;
            const mealCals = items.reduce((s, e) => s + (e.calories || 0), 0);
            return (
              <div key={meal} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <span>{mealEmoji[meal]}</span>{mealLabels[meal]}
                  </span>
                  <span className="text-sm text-gray-400">{Math.round(mealCals)} cal</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {items.map(entry => (
                    editingId === entry.id
                      ? <EditRow key={entry.id} entry={entry} onSave={updated => { updateFood(updated); setEditingId(null); }} onCancel={() => setEditingId(null)} />
                      : <EntryRow key={entry.id} entry={entry} onEdit={() => setEditingId(entry.id)} onDelete={() => deleteFood(date, entry.id)} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isToday && (
        <button
          onClick={() => navigate('/add')}
          className="fixed bottom-20 right-5 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

function SummaryCell({ label, value, target, unit }) {
  const over = value > target;
  return (
    <div className="text-center px-2">
      <div className={`text-base font-bold ${over ? 'text-red-500' : 'text-gray-800'}`}>{value}</div>
      <div className="text-xs text-gray-400">{unit}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function EntryRow({ entry, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {entry.photo ? (
        <img src={entry.photo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{entry.name}</p>
        <p className="text-xs text-gray-400">
          P:{Math.round(entry.protein)}g · C:{Math.round(entry.carbs)}g · F:{Math.round(entry.fat)}g
          {entry.fiber > 0 ? ` · Fiber:${Math.round(entry.fiber)}g` : ''}
        </p>
      </div>
      <span className="text-sm font-semibold text-gray-700 mr-2">{Math.round(entry.calories)}</span>
      <div className="flex gap-1">
        <button onClick={onEdit}   className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"><Edit3 size={15} /></button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500   rounded-lg hover:bg-red-50   transition-colors"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function EditRow({ entry, onSave, onCancel }) {
  const [vals, setVals] = useState({
    name:     entry.name,
    calories: String(Math.round(entry.calories)),
    protein:  String(Math.round(entry.protein)),
    carbs:    String(Math.round(entry.carbs)),
    fat:      String(Math.round(entry.fat)),
    fiber:    String(Math.round(entry.fiber || 0)),
  });

  const set = (k) => (e) => setVals(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="px-4 py-3 bg-primary-50 space-y-2">
      <input
        value={vals.name}
        onChange={set('name')}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
        placeholder="Food name"
      />
      <div className="grid grid-cols-3 gap-2">
        {[['calories','kcal'],['protein','g'],['carbs','g'],['fat','g'],['fiber','g']].map(([k,u]) => (
          <div key={k} className="relative">
            <input
              type="number"
              value={vals[k]}
              onChange={set(k)}
              min="0" step="0.1"
              className="w-full text-sm px-2 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 pr-6"
              placeholder={k}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{u}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ ...entry, ...Object.fromEntries(
            Object.entries(vals).map(([k,v]) => [k, k === 'name' ? v : parseFloat(v) || 0])
          )})}
          className="flex-1 flex items-center justify-center gap-1 bg-primary-600 text-white text-sm py-2 rounded-lg font-medium"
        >
          <Check size={14} /> Save
        </button>
        <button onClick={onCancel} className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-200 text-gray-600 text-sm py-2 rounded-lg font-medium">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );
}
