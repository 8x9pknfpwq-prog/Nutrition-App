import { NavLink } from 'react-router-dom';
import { Users, Bookmark, User } from 'lucide-react';
import NYCLinesLogo from './NYCLinesLogo.jsx';

const TABS = [
  { to: '/', label: 'Map', Icon: null, end: true }, // home glyph = NYC Lines dot stack
  { to: '/friends', label: 'Friends', Icon: Users },
  { to: '/saved', label: 'Saved', Icon: Bookmark },
  { to: '/profile', label: 'Profile', Icon: User },
];

// Fixed bottom navigation. Sits above the bottom sheet via z-index.
export default function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-ink' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {Icon ? (
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                ) : (
                  <span className={isActive ? '' : 'opacity-40 grayscale'}>
                    <NYCLinesLogo variant="nav" height={24} />
                  </span>
                )}
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
