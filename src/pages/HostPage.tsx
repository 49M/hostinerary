import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

interface Property {
  id: number;
  name: string;
  slug: string;
  description: string;
  location: string;
  partner_count: number;
  itinerary_count: number;
  created_at: string;
}

const DEFAULT_FORM = { name: '', description: '', location: '' };

export default function HostPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/properties')
      .then(r => r.json())
      .then(d => setProperties(d as Property[]))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const property = await res.json() as Property;
      setProperties(prev => [{ ...property, partner_count: 0, itinerary_count: 0 }, ...prev]);
      setForm(DEFAULT_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const copyShareLink = (property: Property) => {
    const url = `${window.location.origin}/guest/${property.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(property.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
            <p className="text-slate-500 mt-1 text-sm">Each property has its own partner network and shareable guest link.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> Add Property
          </button>
        </div>

        {/* Add Property Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
            <h2 className="text-base font-semibold text-slate-800 mb-5">New Property</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Property Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Lakeside Retreat"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Location</label>
                  <input
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Lake Tahoe, CA"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Brief description of your property..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {saving ? 'Creating…' : 'Create Property'}
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

        {/* Property Grid */}
        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <p className="text-slate-400 text-sm mb-3">No properties yet.</p>
            <button onClick={() => setShowForm(true)} className="text-blue-600 text-sm font-medium hover:underline">
              Create your first property →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {properties.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div>
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  {p.location && (
                    <p className="text-xs text-slate-400 mt-0.5">📍 {p.location}</p>
                  )}
                  {p.description && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">{p.description}</p>
                  )}
                </div>

                <div className="flex gap-4 text-xs text-slate-600">
                  <span><span className="font-semibold text-slate-800">{p.partner_count}</span> partners</span>
                  <span><span className="font-semibold text-slate-800">{p.itinerary_count}</span> itineraries</span>
                </div>

                {/* Share link */}
                <div className="bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2 border border-slate-100">
                  <span className="text-xs text-slate-400 truncate flex-1 font-mono">/guest/{p.slug}</span>
                  <button
                    onClick={() => copyShareLink(p)}
                    className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {copiedId === p.id ? '✓ Copied' : 'Copy link'}
                  </button>
                </div>

                <Link
                  to={`/host/property/${p.id}`}
                  className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-100 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-all"
                >
                  Manage property →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
