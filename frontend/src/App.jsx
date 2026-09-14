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
        <div className="min-h-screen bg-bg">
          <Sidebar />
          <main className="min-w-0 md:ml-[238px] px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 md:pb-8">
            <div className="mx-auto w-full max-w-[1440px]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/decision-analysis" element={<DecisionAnalysis />} />
                <Route path="/player-analysis" element={<PlayerAnalysis />} />
                <Route path="/heatmaps" element={<Heatmaps />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
