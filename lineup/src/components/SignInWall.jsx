import { useAuth } from '../context/AuthContext.jsx';

// Full-screen prompt shown to guests on account-only tabs (Friends, Saved,
// Profile). Tapping through returns to the auth screen.
export default function SignInWall({ title, body }) {
  const { exitGuest } = useAuth();
  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center bg-canvas px-8 text-center">
      <h2 className="text-xl font-extrabold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{body}</p>
      <button
        onClick={exitGuest}
        className="mt-6 w-full max-w-xs rounded-xl bg-ink py-3.5 text-sm font-semibold text-white"
      >
        Sign up or log in
      </button>
    </div>
  );
}
