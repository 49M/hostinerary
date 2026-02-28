import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface Partner {
  id: number;
  name: string;
  category: string;
  description: string;
  address: string;
  is_indoor: number;
  is_outdoor: number;
  is_romantic: number;
  is_family_friendly: number;
  price_range_min: number;
  price_range_max: number;
  commission_percentage: number;
}

interface ItinerarySummary {
  id: number;
  guest_type: string;
  occasion: string;
  budget: number;
  total_estimated_cost: number;
  total_commission: number;
  guest_satisfaction_score: number;
  created_at: string;
}

interface Property {
  id: number;
  name: string;
  slug: string;
  description: string;
  location: string;
  partners: Partner[];
  itineraries: ItinerarySummary[];
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  outdoor_activity: 'Outdoor Activity',
  wellness: 'Wellness & Spa',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  cultural: 'Cultural',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: 'bg-amber-100 text-amber-700',
  outdoor_activity: 'bg-green-100 text-green-700',
  wellness: 'bg-purple-100 text-purple-700',
  entertainment: 'bg-blue-100 text-blue-700',
  shopping: 'bg-pink-100 text-pink-700',
  cultural: 'bg-orange-100 text-orange-700',
  other: 'bg-slate-100 text-slate-600',
};

const OCCASION_LABELS: Record<string, string> = {
  anniversary: 'Anniversary', date_night: 'Date Night', family_trip: 'Family Trip',
  birthday: 'Birthday', business: 'Business', casual: 'Casual',
};

const DEFAULT_FORM = {
  name: '', category: 'restaurant', description: '', address: '',
  is_indoor: true, is_outdoor: false, is_romantic: false, is_family_friendly: true,
  price_range_min: 20, price_range_max: 100, commission_percentage: 10,
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

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then(r => r.json())
      .then(d => setProperty(d as Property))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setSaving(true);
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, property_id: property.id }),
      });
      const partner = await res.json() as Partner;
      setProperty(p => p ? { ...p, partners: [...p.partners, partner] } : p);
      setForm(DEFAULT_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!property) return;
    navigator.clipboard.writeText(`${window.location.origin}/guest/${property.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <span className="text-slate-400 text-sm">Loading…</span>
    </div>
  );

  if (!property) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <span className="text-red-500 text-sm">Property not found.</span>
    </div>
  );

  const shareUrl = `${window.location.origin}/guest/${property.slug}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Back + Header */}
        <div className="mb-8">
          <Link to="/host" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← All Properties</Link>
          <div className="flex items-start justify-between mt-3 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
              {property.location && <p className="text-sm text-slate-400 mt-0.5">📍 {property.location}</p>}
              {property.description && <p className="text-sm text-slate-500 mt-2 max-w-xl">{property.description}</p>}
            </div>

            {/* Share Link Panel */}
            <div className="shrink-0 bg-white rounded-xl border border-slate-100 shadow-sm p-4 min-w-72">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Guest Share Link</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500 font-mono truncate flex-1">{shareUrl}</span>
                <button
                  onClick={copyLink}
                  className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Share this link with your guests to get personalised itineraries.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Partners */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">
                Partner Businesses
                <span className="ml-2 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{property.partners.length}</span>
              </h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition-all"
              >
                + Add Partner
              </button>
            </div>

            {/* Add Partner Form */}
            {showForm && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
                <form onSubmit={handleAddPartner} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Business Name *</label>
                      <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. The Vineyard Table"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Category *</label>
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                      <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={2} placeholder="Short description..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Address</label>
                      <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="123 Main St"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Commission %</label>
                      <input type="number" min={0} max={50} step={0.5} value={form.commission_percentage}
                        onChange={e => setForm(f => ({ ...f, commission_percentage: Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Price Range min $</label>
                      <input type="number" min={0} value={form.price_range_min}
                        onChange={e => setForm(f => ({ ...f, price_range_min: Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Price Range max $</label>
                      <input type="number" min={0} value={form.price_range_max}
                        onChange={e => setForm(f => ({ ...f, price_range_max: Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {([['is_indoor','Indoor'],['is_outdoor','Outdoor'],['is_romantic','Romantic'],['is_family_friendly','Family Friendly']] as [keyof typeof form, string][]).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input type="checkbox" checked={form[key] as boolean}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                      {saving ? 'Saving…' : 'Save Partner'}
                    </button>
                    <button type="button" onClick={() => setShowForm(false)}
                      className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {property.partners.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <p className="text-slate-400 text-sm">No partners yet. Add your first partner business.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {property.partners.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.address}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.other}`}>
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-3">{p.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">${p.price_range_min}–${p.price_range_max}</span>
                      <span className="font-semibold text-emerald-600">{p.commission_percentage}% commission</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {!!p.is_indoor && <span className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">Indoor</span>}
                      {!!p.is_outdoor && <span className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">Outdoor</span>}
                      {!!p.is_romantic && <span className="text-xs bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full border border-rose-100">Romantic</span>}
                      {!!p.is_family_friendly && <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full border border-blue-100">Family</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Itineraries */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              Recent Itineraries
              <span className="ml-2 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{property.itineraries.length}</span>
            </h2>

            {property.itineraries.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 p-6 text-center">
                <p className="text-slate-400 text-xs">No itineraries yet.</p>
                <p className="text-slate-400 text-xs mt-1">Share the guest link to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {property.itineraries.map(i => (
                  <Link
                    key={i.id}
                    to={`/itinerary/${i.id}`}
                    className="block bg-white rounded-xl border border-slate-100 shadow-sm p-3 hover:shadow-md hover:border-blue-100 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 capitalize">{OCCASION_LABELS[i.occasion] ?? i.occasion}</span>
                      <span className="text-xs text-slate-400">{timeAgo(i.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-500 capitalize">{i.guest_type} · Budget ${i.budget}</p>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-slate-600">${i.total_estimated_cost?.toFixed(0)} spend</span>
                      <span className="text-emerald-600 font-medium">+${i.total_commission?.toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
