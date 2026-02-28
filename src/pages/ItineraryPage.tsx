import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface ItineraryItem {
  time: string;
  activity_name: string;
  description: string;
  estimated_cost: number;
  partner_name: string;
  category: string;
}

interface CommissionBreakdown {
  partner_name: string;
  activity: string;
  estimated_cost: number;
  commission_rate: number;
  commission_amount: number;
}

interface ItineraryData {
  id: number;
  guest_type: string;
  occasion: string;
  budget: number;
  vibe: string;
  weather: string;
  itinerary: ItineraryItem[];
  total_estimated_cost: number;
  total_commission: number;
  guest_satisfaction_score: number;
  commission_breakdown: CommissionBreakdown[];
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  outdoor_activity: '🚴',
  wellness: '🧘',
  entertainment: '🎵',
  shopping: '🛍️',
  cultural: '🎨',
  other: '📍',
};

const OCCASION_LABELS: Record<string, string> = {
  anniversary: 'Anniversary',
  date_night: 'Date Night',
  family_trip: 'Family Trip',
  birthday: 'Birthday',
  business: 'Business',
  casual: 'Casual',
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl transition-transform hover:scale-110"
        >
          {star <= (hover || value) ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

export default function ItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ItineraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [satisfaction, setSatisfaction] = useState(0);
  const [budgetAccuracy, setBudgetAccuracy] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/itinerary/${id}`)
      .then(r => r.json())
      .then(d => setData(d as ItineraryData))
      .catch(() => setError('Could not load itinerary.'))
      .finally(() => setLoading(false));
  }, [id]);

  const submitFeedback = async () => {
    if (!satisfaction || !budgetAccuracy) return;
    setFeedbackLoading(true);
    await fetch(`/api/itinerary/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ satisfaction_rating: satisfaction, budget_accuracy_rating: budgetAccuracy }),
    });
    setFeedbackSent(true);
    setFeedbackLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading itinerary…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-500 text-sm">{error || 'Not found'}</div>
      </div>
    );
  }

  const budgetUtilization = Math.round((data.total_estimated_cost / data.budget) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full border border-blue-100">
                {OCCASION_LABELS[data.occasion] ?? data.occasion}
              </span>
              <span className="text-xs text-slate-400">#{data.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Your Itinerary</h1>
            <p className="text-sm text-slate-500 mt-1 capitalize">{data.guest_type} · {data.vibe} vibe · {data.weather} weather</p>
          </div>
          <Link
            to="/guest"
            className="shrink-0 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg transition-colors"
          >
            New Itinerary
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Section 1: Timeline */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
              Timeline
            </h2>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-200" />

              <div className="space-y-4">
                {data.itinerary.map((item, i) => (
                  <div key={i} className="relative flex gap-4">
                    {/* Dot */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center text-base z-10 shadow-sm">
                      {CATEGORY_ICONS[item.category] ?? '📍'}
                    </div>

                    {/* Card */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.time}</span>
                        <span className="text-sm font-semibold text-slate-800">${item.estimated_cost}</span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm mt-1">{item.activity_name}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                      {item.partner_name && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                          <span>🤝</span>
                          <span>{item.partner_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Revenue Dashboard */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">2</span>
              Revenue Dashboard
            </h2>

            {/* Uplift callout */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 text-white">
              <p className="text-xs text-emerald-100 font-medium uppercase tracking-wide">Revenue Uplift</p>
              <p className="text-3xl font-bold mt-1">+12%</p>
              <p className="text-xs text-emerald-100 mt-1">vs. generic recommendations</p>
            </div>

            {/* Metric cards */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-medium">Guest Spend</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">${data.total_estimated_cost.toFixed(0)}</p>
                <p className="text-xs text-slate-400 mt-0.5">Budget: ${data.budget} · {budgetUtilization}% used</p>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-500 font-medium">Projected Commission</p>
                <p className="text-2xl font-bold text-emerald-600 mt-0.5">${data.total_commission.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {data.total_estimated_cost > 0
                    ? `${((data.total_commission / data.total_estimated_cost) * 100).toFixed(1)}% effective rate`
                    : '—'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-500 font-medium">Satisfaction Score</p>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">{data.guest_satisfaction_score}<span className="text-sm text-slate-400">/100</span></p>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${data.guest_satisfaction_score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Commission breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Commission Breakdown</p>
              <div className="space-y-2.5">
                {data.commission_breakdown.map((row, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{row.partner_name || '—'}</p>
                      <p className="text-xs text-slate-400">{row.commission_rate}% of ${row.estimated_cost}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-emerald-600">
                      +${row.commission_amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Total</span>
                <span className="text-sm font-bold text-emerald-600">${data.total_commission.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Feedback */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Rate This Itinerary</h2>
          <p className="text-sm text-slate-500 mb-5">Your feedback helps improve future recommendations.</p>

          {feedbackSent ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <span>✓</span> Thank you for your feedback!
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Overall Satisfaction</p>
                <div className="flex items-center gap-3">
                  <StarRating value={satisfaction} onChange={setSatisfaction} />
                  <span className="text-slate-400 text-sm">{satisfaction ? `${satisfaction}/5` : 'Tap to rate'}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Budget Accuracy</p>
                <div className="flex items-center gap-3">
                  <StarRating value={budgetAccuracy} onChange={setBudgetAccuracy} />
                  <span className="text-slate-400 text-sm">{budgetAccuracy ? `${budgetAccuracy}/5` : 'Tap to rate'}</span>
                </div>
              </div>
              <button
                onClick={submitFeedback}
                disabled={!satisfaction || !budgetAccuracy || feedbackLoading}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {feedbackLoading ? 'Submitting…' : 'Submit Feedback'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
