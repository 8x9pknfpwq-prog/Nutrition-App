import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider, useSocket } from './context/SocketContext.jsx';
import { ToastProvider, useToast } from './context/ToastContext.jsx';
import TabBar from './components/TabBar.jsx';
import Auth from './pages/Auth.jsx';
import MapDashboard from './pages/MapDashboard.jsx';
import Friends from './pages/Friends.jsx';
import Saved from './pages/Saved.jsx';
import Profile from './pages/Profile.jsx';

// Listens app-wide for friend_checkin events and surfaces them as toasts.
function FriendCheckinListener() {
  const socket = useSocket();
  const { showToast } = useToast();
  useEffect(() => {
    if (!socket) return;
    const onCheckin = (p) => {
      showToast({
        avatarInitial: p.avatarInitial,
        username: p.username,
        title: `${p.username} checked in`,
        body: `at ${p.barName}`,
      });
    };
    socket.on('friend_checkin', onCheckin);
    return () => socket.off('friend_checkin', onCheckin);
  }, [socket, showToast]);
  return null;
}

function AuthedApp() {
  return (
    <SocketProvider>
      <FriendCheckinListener />
      <div className="min-h-screen bg-canvas">
        <Routes>
          <Route path="/" element={<MapDashboard />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </SocketProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="text-3xl">🍸</div>
      </div>
    );
  }
  return user ? <AuthedApp /> : <Auth />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Gate />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
