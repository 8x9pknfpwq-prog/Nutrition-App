import { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };

    case 'ADD_FOOD': {
      const entries = [...(state.foodLog[action.payload.date] || []), action.payload];
      return { ...state, foodLog: { ...state.foodLog, [action.payload.date]: entries } };
    }

    case 'UPDATE_FOOD': {
      const date = action.payload.date;
      const entries = (state.foodLog[date] || []).map((e) =>
        e.id === action.payload.id ? action.payload : e
      );
      return { ...state, foodLog: { ...state.foodLog, [date]: entries } };
    }

    case 'DELETE_FOOD': {
      const { date, id } = action.payload;
      const entries = (state.foodLog[date] || []).filter((e) => e.id !== id);
      return { ...state, foodLog: { ...state.foodLog, [date]: entries } };
    }

    case 'CLEAR_PROFILE':
      return { profile: null, foodLog: {} };

    default:
      return state;
  }
}

function loadState() {
  try {
    const profile = JSON.parse(localStorage.getItem('nt_profile') || 'null');
    const foodLog = JSON.parse(localStorage.getItem('nt_foodlog') || '{}');
    return { profile, foodLog };
  } catch {
    return { profile: null, foodLog: {} };
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
    localStorage.setItem('nt_profile', JSON.stringify(state.profile));
  }, [state.profile]);

  useEffect(() => {
    localStorage.setItem('nt_foodlog', JSON.stringify(state.foodLog));
  }, [state.foodLog]);

  const setProfile = (profile) => dispatch({ type: 'SET_PROFILE', payload: profile });

  const addFood = (entry) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    dispatch({ type: 'ADD_FOOD', payload: { ...entry, id } });
  };

  const updateFood = (entry) => dispatch({ type: 'UPDATE_FOOD', payload: entry });

  const deleteFood = (date, id) => dispatch({ type: 'DELETE_FOOD', payload: { date, id } });

  const clearProfile = () => {
    localStorage.removeItem('nt_profile');
    localStorage.removeItem('nt_foodlog');
    dispatch({ type: 'CLEAR_PROFILE' });
  };

  const getDayEntries = (date) => state.foodLog[date] || [];

  const getDayTotals = (date) => {
    const entries = getDayEntries(date);
    return entries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories || 0),
        protein:  acc.protein  + (e.protein  || 0),
        carbs:    acc.carbs    + (e.carbs    || 0),
        fat:      acc.fat      + (e.fat      || 0),
        fiber:    acc.fiber    + (e.fiber    || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  };

  return (
    <AppContext.Provider
      value={{
        profile: state.profile,
        foodLog: state.foodLog,
        setProfile,
        addFood,
        updateFood,
        deleteFood,
        clearProfile,
        getDayEntries,
        getDayTotals,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
