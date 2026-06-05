import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, PlusCircle, User } from 'lucide-react';

const tabs = [
  { path: '/dashboard', icon: Home,       label: 'Home'    },
  { path: '/log',       icon: BookOpen,   label: 'Log'     },
  { path: '/add',       icon: PlusCircle, label: 'Add'     },
  { path: '/settings',  icon: User,       label: 'Profile' },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="flex">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                active ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-xs ${active ? 'font-semibold' : ''}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
