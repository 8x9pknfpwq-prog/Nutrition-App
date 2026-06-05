import { useNavigate } from 'react-router-dom';
import { Plus, Flame, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import MacroBar from '../components/MacroBar.jsx';
import { todayKey, formatDate } from '../utils/calculations.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, getDayEntries, getDayTotals } = useApp();
  const today = todayKey();
  const totals  = getDayTotals(today);
  const entries = getDayEntries(today);

  const { dailyCalories, macroTargets, name, goal } = profile;
  const remaining = dailyCalories - totals.calories;

  const GoalIcon = goal === 'lose' ? TrendingDown : goal === 'gain' ? TrendingUp : Minus;
  const goalColor = goal === 'lose' ? 'text-blue-500' : goal === 'gain' ? 'text-orange-500' : 'text-gray-400';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-10 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{greeting()}{name ? `, ${name}` : ''} 👋</p>
            <h1 className="text-xl font-bold text-gray-900">{formatDate(today)}</h1>
          </div>
          <div className={`flex items-center gap-1 ${goalColor} bg-gray-50 rounded-full px-3 py-1`}>
            <GoalIcon size={14} />
            <span className="text-xs font-medium capitalize">{goal === 'lose' ? 'Cut' : goal === 'gain' ? 'Bulk' : 'Maintain'}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Calorie Ring Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Calories</h2>
          <div className="flex items-center gap-6">
            <ProgressRing value={totals.calories} max={dailyCalories} size={140} strokeWidth={12}>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 leading-none">
                  {Math.round(totals.calories)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">consumed</div>
              </div>
            </ProgressRing>

            <div className="flex-1 space-y-3">
              <StatRow label="Goal"      value={dailyCalories} unit="cal" color="text-gray-600" />
              <StatRow label="Consumed"  value={Math.round(totals.calories)} unit="cal" color="text-primary-600" />
              <StatRow
                label={remaining >= 0 ? 'Remaining' : 'Over goal'}
                value={Math.abs(Math.round(remaining))}
                unit="cal"
                color={remaining >= 0 ? 'text-primary-700' : 'text-red-500'}
                bold
              />
            </div>
          </div>
        </div>

        {/* Macro Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Macros</h2>
          <div className="space-y-3">
            <MacroBar label="Protein" value={totals.protein} max={macroTargets.protein} color="#3b82f6" />
            <MacroBar label="Carbs"   value={totals.carbs}   max={macroTargets.carbs}   color="#f59e0b" />
            <MacroBar label="Fat"     value={totals.fat}     max={macroTargets.fat}     color="#f97316" />
            {totals.fiber > 0 && (
              <MacroBar label="Fiber" value={totals.fiber} max={25} color="#22c55e" />
            )}
          </div>
        </div>

        {/* Quick macro chips */}
        <div className="grid grid-cols-3 gap-2">
          <MacroChip label="Protein" value={totals.protein} target={macroTargets.protein} color="#3b82f6" bg="bg-blue-50" />
          <MacroChip label="Carbs"   value={totals.carbs}   target={macroTargets.carbs}   color="#f59e0b" bg="bg-amber-50" />
          <MacroChip label="Fat"     value={totals.fat}     target={macroTargets.fat}     color="#f97316" bg="bg-orange-50" />
        </div>

        {/* Today's food log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today's Food</h2>
            {entries.length > 0 && (
              <button onClick={() => navigate('/log')} className="text-xs text-primary-600 font-medium">
                View all
              </button>
            )}
          </div>

          {entries.length === 0 ? (
            <div className="px-5 pb-5 text-center">
              <Flame size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No food logged yet today</p>
              <button
                onClick={() => navigate('/add')}
                className="mt-3 text-sm text-primary-600 font-medium"
              >
                Log your first meal
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {entries.slice(0, 4).map(entry => (
                <FoodRow key={entry.id} entry={entry} />
              ))}
              {entries.length > 4 && (
                <button
                  onClick={() => navigate('/log')}
                  className="w-full text-center text-sm text-gray-400 py-3 hover:text-primary-600"
                >
                  +{entries.length - 4} more items
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/add')}
        className="fixed bottom-20 right-5 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-40"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

function StatRow({ label, value, unit, color, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm ${color} ${bold ? 'font-bold' : 'font-medium'}`}>
        {value.toLocaleString()} <span className="font-normal text-gray-400">{unit}</span>
      </span>
    </div>
  );
}

function MacroChip({ label, value, target, color, bg }) {
  const pct = target > 0 ? Math.min(Math.round((value / target) * 100), 100) : 0;
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className="text-base font-bold" style={{ color }}>{Math.round(value)}g</div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xs text-gray-400">{pct}%</div>
    </div>
  );
}

function FoodRow({ entry }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {entry.photo ? (
        <img src={entry.photo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
          🍽️
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{entry.name}</p>
        <p className="text-xs text-gray-400">P:{Math.round(entry.protein)}g · C:{Math.round(entry.carbs)}g · F:{Math.round(entry.fat)}g</p>
      </div>
      <span className="text-sm font-semibold text-gray-700 flex-shrink-0">{Math.round(entry.calories)} cal</span>
    </div>
  );
}
