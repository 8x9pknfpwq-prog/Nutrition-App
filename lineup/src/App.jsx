import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { IS_STATIC } from './lib/mode.js';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SocketProvider, useSocket } from './context/SocketContext.jsx';
import { ToastProvider, useToast } from './context/ToastContext.jsx';
import TabBar from './components/TabBar.jsx';
import NYCLinesLogo from './components/NYCLinesLogo.jsx';
import Auth from './pages/Auth.jsx';
import MapDashboard from './pages/MapDashboard.jsx';
import Friends from './pages/Friends.jsx';
import Saved from './pages/Saved.jsx';
import Profile from './pages/Profile.jsx';
import Admin from './pages/Admin.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Legal from './pages/Legal.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

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
      <div className="h-full bg-canvas">
        <Routes>
          <Route path="/" element={<MapDashboard />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <TabBar />
      </div>
    </SocketProvider>
  );
}

function Gate() {
  const { user, guest, loading, recovering } = useAuth();
  // A password-recovery link takes priority over everything else.
  if (recovering) return <ResetPassword />;
  if (loading) {
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <NYCLinesLogo variant="light" height={44} className="animate-pulse" />
      </div>
    );
  }
  // Signed-in users and guests both get the app; guests hit sign-in walls on
  // account-based actions. Everyone else sees the auth screen.
  return user || guest ? <AuthedApp /> : <Auth />;
}

export default function App() {
  // HashRouter on static hosts (GitHub Pages) avoids 404s on refresh/deep links.
  const Router = IS_STATIC ? HashRouter : BrowserRouter;
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public, reachable while logged out (linked from the auth screen) */}
            <Route path="/privacy" element={<Legal doc="privacy" />} />
            <Route path="/terms" element={<Legal doc="terms" />} />
            {/* Everything else flows through the auth gate */}
            <Route path="/*" element={<Gate />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
