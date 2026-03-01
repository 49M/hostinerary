import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

export default function Navbar() {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading, user, logout } = useAuth0();

  const links = [
    { to: '/host', label: 'Host Config', protected: true },
    // { to: '/guest', label: 'Guest Form', protected: false },
    { to: '/itineraries', label: 'Itineraries', protected: true },
  ];

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/host" className="flex items-center gap-2 font-semibold text-slate-900 tracking-tight">
          <img src="/logo2.png" alt="Hostinerary" className="h-6 w-auto" />
          Hostinerary
        </Link>
        <div className="flex items-center gap-1">
          {links.filter(l => !l.protected || isAuthenticated).map(({ to, label }) => (
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
        <div className="flex items-center gap-2">
          {!isLoading && (
            isAuthenticated ? (
              <>
                {user?.picture && (
                  <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
                )}
                <span className="text-sm text-slate-600 hidden sm:block">{user?.name}</span>
                <button
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  className="text-sm text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              // <button
              //   onClick={() => loginWithRedirect()}
              //   className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              // >
              //   Host Log In
              // </button>
              <div></div>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
