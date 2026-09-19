import { NavLink } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useFootballData, teamCode } from '../data/footballData';

const TABS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/decision-analysis', label: 'Decisions' },
  { to: '/player-analysis', label: 'Players' },
  { to: '/heatmaps', label: 'Heatmaps' },
  { to: '/reports', label: 'Reports' },
  { to: '/matches', label: 'Matches' },
  { to: '/about', label: 'About' },
];

function Crest({ code }) {
  return (
    <span className="cond flex h-9 w-9 items-center justify-center rounded-[3px] border border-chrome-line bg-chrome-2 text-[13px] font-bold tracking-wide text-chrome-ink">
      {code}
    </span>
  );
}

function Scoreline({ data }) {
  if (!data) {
    return <span className="text-[13px] text-chrome-ink-2">Loading match…</span>;
  }

  const [home, away] = data.teams;
  const homeGoals = data.match.score[home] ?? 0;
  const awayGoals = data.match.score[away] ?? 0;

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-2.5">
        <Crest code={teamCode(home)} />
        <span className="cond hidden text-[17px] text-chrome-ink sm:block">{home}</span>
      </div>

      <div className="cond num flex items-baseline gap-2 text-[26px] leading-none text-chrome-ink sm:text-[30px]">
        <span>{homeGoals}</span>
        <span className="text-[16px] text-chrome-ink-2">–</span>
        <span>{awayGoals}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="cond hidden text-[17px] text-chrome-ink sm:block">{away}</span>
        <Crest code={teamCode(away)} />
      </div>
    </div>
  );
}

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { data } = useFootballData();

  return (
    <header className="sticky top-0 z-40 bg-chrome">
      <div className="mx-auto flex h-[60px] max-w-[1480px] items-center gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="h-[26px] w-[3px] bg-alt" aria-hidden="true" />
          <span className="cond text-[17px] leading-none tracking-wide text-chrome-ink">
            Football<span className="text-alt">IQ</span>
          </span>
        </NavLink>

        <div className="ml-auto flex items-center gap-4 sm:gap-6">
          <Scoreline data={data} />

          <div className="hidden flex-col border-l border-chrome-line pl-4 md:flex">
            <span className="cond text-[13px] leading-tight text-chrome-ink">Full time</span>
            <span className="num text-[11px] leading-tight text-chrome-ink-2">
              Match {data?.match.id ?? '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-chrome-line text-chrome-ink-2 hover:text-chrome-ink"
          >
            {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>

      <nav className="border-t border-chrome-line bg-chrome">
        <div className="rail mx-auto flex max-w-[1480px] gap-1 overflow-x-auto px-2 sm:px-4">
          {TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative whitespace-nowrap px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                  isActive
                    ? 'text-chrome-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:bg-alt after:content-[""]'
                    : 'text-chrome-ink-2 hover:text-chrome-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}
