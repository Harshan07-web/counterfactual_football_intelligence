import { NavLink } from 'react-router-dom';
import { Sun, Moon, LayoutDashboard, Swords, GitCompareArrows, UserSearch, Flame, FileBarChart, Info } from 'lucide-react';
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
function Mark() { return <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M6 17.5 12 7l6 10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="7" r="2.5" fill="currentColor"/><circle cx="6" cy="17.5" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="18" cy="17.5" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>; }

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  return <>
    <aside className="hidden md:flex md:w-[238px] fixed left-0 top-0 z-40 shrink-0 flex-col bg-surface border-r border-border h-screen">
      <div className="h-[72px] px-5 flex items-center gap-3 border-b border-border-soft">
        <div className="h-9 w-9 rounded-xl bg-brand text-white flex items-center justify-center shadow-sm"><Mark /></div>
        <div><p className="text-[14px] font-bold text-ink-1">Football IQ</p><p className="text-[10px] text-ink-3 mt-0.5">Counterfactual intelligence</p></div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} className={({isActive}) => `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all ${isActive ? 'bg-brand text-white shadow-sm' : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1'}`}><Icon size={17} strokeWidth={2}/>{label}</NavLink>)}
      </nav>
      <div className="p-3 border-t border-border-soft">
        <button onClick={toggleTheme} className="w-full flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-[12px] font-semibold text-ink-2 hover:bg-surface-2"><span className="flex items-center gap-2">{theme==='dark'?<Moon size={15}/>:<Sun size={15}/>} {theme==='dark'?'Dark mode':'Light mode'}</span><span className="h-5 w-9 rounded-full bg-surface-3 relative"><span className="absolute top-1 h-3 w-3 rounded-full bg-brand transition-transform" style={{left:theme==='dark'?20:4}}/></span></button>
      </div>
    </aside>
    <header className="md:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-lg bg-brand text-white flex items-center justify-center"><Mark/></div><span className="font-bold text-[14px]">Football IQ</span></div>
      <button onClick={toggleTheme} aria-label="Toggle theme" className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-ink-2">{theme==='dark'?<Moon size={16}/>:<Sun size={16}/>}</button>
    </header>
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/96 backdrop-blur border-t border-border grid grid-cols-5 px-1 py-1.5 pb-[max(6px,env(safe-area-inset-bottom))]">
      {nav.slice(0,5).map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} className={({isActive})=>`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-semibold ${isActive?'text-brand':'text-ink-3'}`}><Icon size={17}/><span>{label==='Decision Analysis'?'Decisions':label}</span></NavLink>)}
    </nav>
  </>;
}
