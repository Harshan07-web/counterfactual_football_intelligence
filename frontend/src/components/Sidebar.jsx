import { NavLink } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import {
  LayoutDashboard,
  Swords,
  GitCompareArrows,
  UserSearch,
  Flame,
  FileBarChart,
  Info,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/matches', label: 'Matches', icon: Swords },
  { to: '/decision-analysis', label: 'Decision Analysis', icon: GitCompareArrows },
  { to: '/player-analysis', label: 'Player Analysis', icon: UserSearch },
  { to: '/heatmaps', label: 'Heatmaps', icon: Flame },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/about', label: 'About', icon: Info },
];

// A small decision-network mark: three linked nodes, one resolved — the
// unit of analysis this whole app is built around, rather than a stock icon.
function Mark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 17.5L12 7L18 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
      <circle cx="12" cy="7" r="2.4" fill="currentColor" />
      <circle cx="6" cy="17.5" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="17.5" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-border bg-surface h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Mark />
        </div>
        <div className="leading-tight">
          <p className="text-[13.5px] font-semibold text-ink-1">Football IQ</p>
          <p className="text-[11px] text-ink-3">Counterfactual Analysis</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                isActive
                  ? 'bg-brand-soft text-brand'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1'
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={toggleTheme}
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink-1 transition-colors"
        >
          <span className="flex items-center gap-2">
            {isDark ? <Moon size={15} strokeWidth={2} /> : <Sun size={15} strokeWidth={2} />}
            {isDark ? 'Dark mode' : 'Light mode'}
          </span>
          <span
            className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors ${
              isDark ? 'bg-brand' : 'bg-surface-3 border border-border'
            }`}
            style={{ height: 18, width: 32 }}
          >
            <span
              className="inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform"
              style={{ transform: isDark ? 'translateX(17px)' : 'translateX(3px)' }}
            />
          </span>
        </button>
      </div>
    </aside>
  );
}
