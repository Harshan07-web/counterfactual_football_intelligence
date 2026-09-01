import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import DecisionAnalysis from './pages/DecisionAnalysis';
import PlayerAnalysis from './pages/PlayerAnalysis';
import Heatmaps from './pages/Heatmaps';
import Reports from './pages/Reports';
import About from './pages/About';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-bg">
          <Sidebar />
          <main className="flex-1 min-w-0 px-5 py-6 md:px-8 md:py-8 animate-fade-up">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/decision-analysis" element={<DecisionAnalysis />} />
              <Route path="/player-analysis" element={<PlayerAnalysis />} />
              <Route path="/heatmaps" element={<Heatmaps />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
