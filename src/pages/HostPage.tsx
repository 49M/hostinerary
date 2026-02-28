import { useState, useEffect } from 'react';
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

const DEFAULT_FORM = {
  name: '',
  category: 'restaurant',
  description: '',
  address: '',
  is_indoor: true,
  is_outdoor: false,
  is_romantic: false,
  is_family_friendly: true,
  price_range_min: 20,
  price_range_max: 100,
  commission_percentage: 10,
};

export default function HostPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/partners')
      .then(r => r.json())
      .then(setPartners)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const partner = await res.json() as Partner;
      setPartners(prev => [...prev, partner]);
      setForm(DEFAULT_FORM);
      setShowForm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Host Configuration</h1>
              <p className="text-slate-500 mt-1 text-sm">Manage your property's partner businesses to power AI-generated itineraries.</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Add Partner
            </button>
          </div>
        </div>

        {saved && (
          <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
            <span>✓</span> Partner added successfully.
          </div>
        )}

        {/* Add Partner Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
            <h2 className="text-base font-semibold text-slate-800 mb-5">New Partner Business</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Business Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. The Vineyard Table"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Short description of the business..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Address</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Commission %</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={form.commission_percentage}
                    onChange={e => setForm(f => ({ ...f, commission_percentage: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Price Range (min $)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price_range_min}
                    onChange={e => setForm(f => ({ ...f, price_range_min: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Price Range (max $)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price_range_max}
                    onChange={e => setForm(f => ({ ...f, price_range_max: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-4 pt-1">
                {[
                  { key: 'is_indoor', label: 'Indoor' },
                  { key: 'is_outdoor', label: 'Outdoor' },
                  { key: 'is_romantic', label: 'Romantic' },
                  { key: 'is_family_friendly', label: 'Family Friendly' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form[key as keyof typeof form] as boolean}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Partner'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Partner List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Partner Businesses <span className="ml-1 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{partners.length}</span>
            </h2>
          </div>

          {partners.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <p className="text-slate-400 text-sm">No partner businesses yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {partners.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{p.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{p.address}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.other}`}>
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{p.description}</p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">${p.price_range_min}–${p.price_range_max} per person</span>
                    <span className="font-semibold text-emerald-600">{p.commission_percentage}% commission</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {!!p.is_indoor && <span className="bg-slate-50 text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-100">Indoor</span>}
                    {!!p.is_outdoor && <span className="bg-slate-50 text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-100">Outdoor</span>}
                    {!!p.is_romantic && <span className="bg-rose-50 text-rose-500 text-xs px-2 py-0.5 rounded-full border border-rose-100">Romantic</span>}
                    {!!p.is_family_friendly && <span className="bg-blue-50 text-blue-500 text-xs px-2 py-0.5 rounded-full border border-blue-100">Family</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
