import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  const links = [
    { to: '/host', label: 'Host Config' },
    { to: '/guest', label: 'Guest Form' },
    { to: '/itineraries', label: 'Itineraries' },
  ];

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/host" className="flex items-center gap-2 font-semibold text-slate-900 tracking-tight">
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">H</span>
          Hostinerary
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === to
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
