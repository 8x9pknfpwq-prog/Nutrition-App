import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

// Returns a guard: call it before an account-based action. If the user is a
// guest, it nudges them to sign in (sending them to the auth screen) and returns
// false; if signed in, returns true so the action proceeds.
export function useRequireAuth() {
  const { user, exitGuest } = useAuth();
  const { showToast } = useToast();
  return (action = 'do that') => {
    if (user) return true;
    showToast({ title: 'Create a free account', body: `Sign up or log in to ${action}.` });
    exitGuest();
    return false;
  };
}
