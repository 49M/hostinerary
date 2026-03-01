import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface Property {
  id: number;
  name: string;
  slug: string;
  location: string;
}

const FIELDS = {
  guest_type: {
    label: 'Guest Type',
    options: [
      { value: 'couple', label: 'Couple' },
      { value: 'family', label: 'Family with Kids' },
      { value: 'solo', label: 'Solo Traveler' },
      { value: 'group', label: 'Friend Group' },
      { value: 'business', label: 'Business Traveler' },
    ],
  },
  occasion: {
    label: 'Occasion',
    options: [
      { value: 'anniversary', label: 'Anniversary' },
      { value: 'date_night', label: 'Date Night' },
      { value: 'family_trip', label: 'Family Trip' },
      { value: 'birthday', label: 'Birthday Celebration' },
      { value: 'business', label: 'Business / Team' },
      { value: 'casual', label: 'Casual Getaway' },
    ],
  },
  vibe: {
    label: 'Preferred Vibe',
    options: [
      { value: 'romantic', label: 'Romantic & Intimate' },
      { value: 'adventurous', label: 'Adventurous & Active' },
      { value: 'relaxing', label: 'Relaxing & Calm' },
      { value: 'cultural', label: 'Cultural & Artistic' },
      { value: 'foodie', label: 'Foodie & Culinary' },
    ],
  },
  indoor_outdoor: {
    label: 'Indoor / Outdoor Preference',
    options: [
      { value: 'indoor', label: 'Prefer Indoor' },
      { value: 'outdoor', label: 'Prefer Outdoor' },
      { value: 'either', label: 'Either is Fine' },
    ],
  },
  weather: {
    label: 'Current Weather',
    options: [
      { value: 'sunny', label: 'Sunny & Clear' },
      { value: 'cloudy', label: 'Cloudy / Overcast' },
      { value: 'rainy', label: 'Rainy' },
      { value: 'hot', label: 'Hot & Humid' },
      { value: 'cold', label: 'Cold' },
    ],
  },
} as const;

function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function numNights(checkIn: string, checkOut: string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

type FormState = {
  guest_type: string;
  occasion: string;
  budget: number;
  vibe: string;
  indoor_outdoor: string;
  weather: string;
  check_in: string;
  check_out: string;
};

export default function GuestPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [propertyError, setPropertyError] = useState('');

  const [form, setForm] = useState<FormState>({
    guest_type: 'couple',
    occasion: 'anniversary',
    budget: 300,
    vibe: 'romantic',
    indoor_outdoor: 'either',
    weather: 'sunny',
    check_in: localDate(0),
    check_out: localDate(3),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) {
      setPropertyError('No property link provided. Please use the link shared by your host.');
      setPropertyLoading(false);
      return;
    }
    fetch(`/api/properties/slug/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Property not found');
        return r.json();
      })
      .then(d => setProperty(d as Property))
      .catch(() => setPropertyError('This property link is invalid or no longer active.'))
      .finally(() => setPropertyLoading(false));
  }, [slug]);

  const nights = numNights(form.check_in, form.check_out);
  const budgetPerDay = Math.round(form.budget / nights);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, property_id: property.id }),
      });
      if (!res.ok) {
        const body = await res.json() as { error: string };
        throw new Error(body.error ?? 'Generation failed');
      }
      const data = await res.json() as { id: number };
      navigate(`/itinerary/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading…</span>
      </div>
    );
  }

  if (propertyError || !property) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <p className="text-slate-500 text-sm">{propertyError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Property header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full mb-3">
            <span>🏡</span> {property.name}{property.location ? ` · ${property.location}` : ''}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Plan Your Visit</h1>
          <p className="text-slate-500 mt-1 text-sm">Tell us about your stay and we'll build a personalised itinerary for you.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">

          {/* Stay dates */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Stay Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">Check-in</p>
                <input
                  type="date"
                  required
                  min={localDate(0)}
                  value={form.check_in}
                  onChange={e => {
                    const newCheckIn = e.target.value;
                    setForm(f => ({
                      ...f,
                      check_in: newCheckIn,
                      // push check-out forward if it's now before or equal to check-in
                      check_out: f.check_out <= newCheckIn
                        ? localDate(new Date(newCheckIn + 'T12:00:00').getDate() + 1)
                        : f.check_out,
                    }));
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Check-out</p>
                <input
                  type="date"
                  required
                  min={form.check_in}
                  value={form.check_out}
                  onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {nights} {nights === 1 ? 'night' : 'nights'} · your itinerary will cover all {nights} {nights === 1 ? 'day' : 'days'}
            </p>
          </div>

          {/* Preference buttons */}
          {(Object.entries(FIELDS) as [keyof typeof FIELDS, typeof FIELDS[keyof typeof FIELDS]][]).map(([key, field]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{field.label}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {field.options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, [key]: opt.value }))}
                    className={`text-sm px-3 py-2 rounded-lg border text-left transition-all ${
                      form[key] === opt.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Budget */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Total Budget{' '}
              <span className="text-blue-600 font-bold text-sm normal-case">${form.budget}</span>
              {nights > 1 && (
                <span className="text-slate-400 font-normal ml-2 text-xs">≈ ${budgetPerDay}/day</span>
              )}
            </label>
            <input type="range" min={50} max={5000} step={25} value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) }))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>$50</span><span>$5,000</span>
            </div>
            <input type="number" min={50} max={5000} value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) }))}
              className="mt-3 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Or type a specific budget..." />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating {nights}-Day Itinerary…
              </>
            ) : `Generate My ${nights === 1 ? 'Itinerary' : `${nights}-Day Itinerary`}`}
          </button>
        </form>
      </div>
    </div>
  );
}
