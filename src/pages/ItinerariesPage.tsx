import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface ItinerarySummary {
  id: number;
  guest_type: string;
  occasion: string;
  budget: number;
  vibe: string;
  indoor_outdoor: string;
  weather: string;
  total_estimated_cost: number;
  total_commission: number;
  guest_satisfaction_score: number;
  created_at: string;
}

const OCCASION_LABELS: Record<string, string> = {
  anniversary: 'Anniversary',
  date_night: 'Date Night',
  family_trip: 'Family Trip',
  birthday: 'Birthday',
  business: 'Business',
  casual: 'Casual',
};

const OCCASION_COLORS: Record<string, string> = {
  anniversary: 'bg-rose-50 text-rose-600 border-rose-100',
  date_night: 'bg-pink-50 text-pink-600 border-pink-100',
  family_trip: 'bg-blue-50 text-blue-600 border-blue-100',
  birthday: 'bg-amber-50 text-amber-600 border-amber-100',
  business: 'bg-slate-50 text-slate-600 border-slate-200',
  casual: 'bg-green-50 text-green-600 border-green-100',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ItinerariesPage() {
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/itinerary')
      .then(r => r.json())
      .then(d => setItineraries(d as ItinerarySummary[]))
      .finally(() => setLoading(false));
  }, []);

  const totalCommission = itineraries.reduce((sum, i) => sum + (i.total_commission ?? 0), 0);
  const totalSpend = itineraries.reduce((sum, i) => sum + (i.total_estimated_cost ?? 0), 0);
  const avgScore = itineraries.length
    ? Math.round(itineraries.reduce((sum, i) => sum + (i.guest_satisfaction_score ?? 0), 0) / itineraries.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Itineraries</h1>
            <p className="text-slate-500 mt-1 text-sm">All generated guest itineraries and their revenue.</p>
          </div>
          <Link
            to="/guest"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Itinerary
          </Link>
        </div>

        {/* Summary stats */}
        {itineraries.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs text-slate-500 font-medium">Total Itineraries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{itineraries.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs text-slate-500 font-medium">Total Guest Spend</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">${totalSpend.toFixed(0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs text-slate-500 font-medium">Total Commission</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">${totalCommission.toFixed(2)}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 text-sm py-12 text-center">Loading…</div>
        ) : itineraries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <p className="text-slate-400 text-sm mb-4">No itineraries generated yet.</p>
            <Link to="/guest" className="text-blue-600 text-sm font-medium hover:underline">
              Generate your first itinerary →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {itineraries.map(item => (
              <Link
                key={item.id}
                to={`/itinerary/${item.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:border-blue-100 transition-all group"
              >
                {/* Occasion badge */}
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${OCCASION_COLORS[item.occasion] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {OCCASION_LABELS[item.occasion] ?? item.occasion}
                </span>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {item.guest_type} · {item.vibe} vibe
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 capitalize">
                    {item.indoor_outdoor} · {item.weather} · Budget ${item.budget}
                  </p>
                </div>

                {/* Metrics */}
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800">${item.total_estimated_cost?.toFixed(0) ?? '—'}</p>
                  <p className="text-xs text-slate-400">guest spend</p>
                </div>
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-sm font-semibold text-emerald-600">+${item.total_commission?.toFixed(2) ?? '—'}</p>
                  <p className="text-xs text-slate-400">commission</p>
                </div>
                <div className="shrink-0 text-right hidden md:block">
                  <p className="text-sm font-semibold text-blue-600">{item.guest_satisfaction_score ?? avgScore}<span className="text-xs text-slate-400">/100</span></p>
                  <p className="text-xs text-slate-400">satisfaction</p>
                </div>

                {/* Time + arrow */}
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs text-slate-400">{timeAgo(item.created_at)}</span>
                  <span className="text-slate-300 group-hover:text-blue-400 transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
