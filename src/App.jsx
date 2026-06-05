import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext.jsx';
import NavBar from './components/NavBar.jsx';
import Setup from './pages/Setup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AddFood from './pages/AddFood.jsx';
import FoodLog from './pages/FoodLog.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { profile } = useApp();

  if (!profile) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log" element={<FoodLog />} />
          <Route path="/add" element={<AddFood />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      <NavBar />
    </div>
  );
}
