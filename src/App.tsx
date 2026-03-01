import { Routes, Route } from 'react-router-dom';
import HostPage from './pages/HostPage';
import PropertyPage from './pages/PropertyPage';
import GuestPage from './pages/GuestPage';
import ItineraryPage from './pages/ItineraryPage';
import ItinerariesPage from './pages/ItinerariesPage';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/host" element={<ProtectedRoute><HostPage /></ProtectedRoute>} />
      <Route path="/host/property/:id" element={<ProtectedRoute><PropertyPage /></ProtectedRoute>} />
      <Route path="/guest/:slug" element={<GuestPage />} />
      <Route path="/itineraries" element={<ProtectedRoute><ItinerariesPage /></ProtectedRoute>} />
      <Route path="/itinerary/:id" element={<ItineraryPage />} />
    </Routes>
  );
}
