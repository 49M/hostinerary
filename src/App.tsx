import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HostPage from './pages/HostPage';
import GuestPage from './pages/GuestPage';
import ItineraryPage from './pages/ItineraryPage';
import ItinerariesPage from './pages/ItinerariesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/host" replace />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/guest" element={<GuestPage />} />
        <Route path="/itineraries" element={<ItinerariesPage />} />
        <Route path="/itinerary/:id" element={<ItineraryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
