import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import HostPage from './pages/HostPage';
import GuestPage from './pages/GuestPage';
import ItineraryPage from './pages/ItineraryPage';
import ItinerariesPage from './pages/ItinerariesPage';
import ProtectedRoute from './components/ProtectedRoute';

// Waits for Auth0 to finish processing any ?code=&state= callback before
// redirecting, so the params aren't stripped by history.replaceState too early.
function RootRedirect() {
  const { isLoading } = useAuth0();
  if (isLoading) return null;
  return <Navigate to="/host" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/host" element={<ProtectedRoute><HostPage /></ProtectedRoute>} />
      <Route path="/guest" element={<GuestPage />} />
      <Route path="/itineraries" element={<ProtectedRoute><ItinerariesPage /></ProtectedRoute>} />
      <Route path="/itinerary/:id" element={<ItineraryPage />} />
    </Routes>
  );
}
