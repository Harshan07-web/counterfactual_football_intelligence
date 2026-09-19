import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import TopBar from './components/TopBar';
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
        <div className="min-h-screen bg-canvas">
          <TopBar />
          <main className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6">
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
