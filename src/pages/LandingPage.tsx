import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function CommissionCalc() {
  const [stays, setStays] = useState(20);
  const [rate, setRate] = useState(15);
  const perStay = Math.round(stays * 0 + 180 * (rate / 15));
  const monthly = Math.round(stays * perStay / 5);

  // simpler: $36 avg per stay at 15%, scales linearly
  const avgPerStay = Math.round(36 * (rate / 15));
  const monthlyTotal = stays * avgPerStay;

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800">
        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Commission estimator</p>
      </div>
      <div className="bg-slate-950 p-6 space-y-6">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-xs text-slate-500 font-mono">GUEST STAYS / MONTH</label>
            <span className="text-white font-bold tabular-nums text-lg">{stays}</span>
          </div>
          <input
            type="range" min={5} max={60} step={5} value={stays}
            onChange={e => setStays(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-700 mt-1 font-mono">
            <span>5</span><span>60</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-xs text-slate-500 font-mono">AVG PARTNER COMMISSION</label>
            <span className="text-white font-bold tabular-nums text-lg">{rate}%</span>
          </div>
          <input
            type="range" min={10} max={30} step={5} value={rate}
            onChange={e => setRate(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-700 mt-1 font-mono">
            <span>10%</span><span>30%</span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-5">
          <p className="text-xs text-slate-600 font-mono uppercase tracking-widest mb-3">Estimated monthly commission</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black text-blue-400 tabular-nums">
              ${monthlyTotal.toLocaleString()}
            </span>
            <span className="text-slate-600 text-sm mb-1.5 font-mono">/ mo</span>
          </div>
          <p className="text-xs text-slate-600 mt-2 font-mono">
            {stays} stays × ~${avgPerStay} avg commission per stay
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white tracking-tight">
            <span className="bg-blue-500 text-white text-xs font-black px-2 py-0.5 rounded">H</span>
            Hostinerary
          </div>
          <button
            onClick={() => loginWithRedirect({ appState: { returnTo: '/host' } })}
            className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Host login →
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-6 pt-24 pb-20 max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <p className="text-blue-400 font-mono text-xs tracking-widest uppercase mb-6">
            For short-term rental hosts
          </p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-white mb-8">
            You recommended<br />
            that restaurant.<br />
            <span className="text-slate-500">They made $200.</span><br />
            <span className="text-blue-400">You made $0.</span>
          </h1>
          <p className="text-slate-400 text-xl leading-relaxed max-w-xl mb-10">
            Hostinerary turns your local knowledge into a commission stream.
            Your guests get a personalised itinerary. Your partners get bookings.
            You get a cut of everything.
          </p>
          <button
            onClick={() => loginWithRedirect({ appState: { returnTo: '/host' } })}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-base px-8 py-4 rounded-xl transition-colors"
          >
            Start earning commissions →
          </button>
        </div>
      </section>

      {/* ── The problem ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-6">The situation</p>
              <h2 className="text-3xl font-black text-white mb-6 leading-snug">
                Your guests are spending $300 a day on local activities you recommended for free.
              </h2>
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  Every time you answer "where should we eat?" you're doing the work of a concierge —
                  routing a guest to a local business — without the economics of one.
                </p>
                <p>
                  Hotels figured this out decades ago. Their concierge desk earns a referral fee on every booking.
                  The kayak rental, the dinner reservation, the spa appointment — all of it has a cut attached.
                </p>
                <p className="text-white font-semibold">
                  You're leaving that money on the table on every single stay.
                </p>
              </div>
            </div>

            {/* Flow diagram */}
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">Where the money goes right now</p>
              {[
                { label: 'Guest arrives at your property', amount: null, dim: false },
                { label: 'Asks for local recommendations', amount: null, dim: false },
                { label: 'You recommend The Cliffside Café', amount: null, dim: false },
                { label: 'Guest spends $180 at dinner', amount: '$180', dim: false },
                { label: 'Café earns $180', amount: '+$180', positive: true, dim: false },
                { label: 'You earn', amount: '$0', dim: true, zero: true },
              ].map(({ label, amount, positive, zero, dim }, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    zero
                      ? 'bg-red-950/30 border-red-900/50'
                      : positive
                      ? 'bg-blue-950/30 border-blue-900/50'
                      : 'bg-slate-900/50 border-slate-800/50'
                  }`}
                >
                  <span className={`text-sm ${dim ? 'text-red-400 font-bold' : 'text-slate-400'}`}>{label}</span>
                  {amount && (
                    <span className={`font-mono font-bold tabular-nums ${
                      zero ? 'text-red-400 line-through' : positive ? 'text-blue-400' : 'text-white'
                    }`}>
                      {amount}
                    </span>
                  )}
                </div>
              ))}
              <div className="pt-2 px-4 py-3 rounded-lg bg-blue-950/40 border border-blue-900/50">
                <p className="text-xs text-blue-400 font-mono">
                  With Hostinerary → you earn 15–25% of every referral
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it actually works (narrative, not steps) ── */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-12">How it works</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-800 rounded-2xl overflow-hidden">
            {[
              {
                n: '①',
                title: 'You build your network',
                body: 'Add your property and invite local partners — restaurants, tours, spas, rentals. Set a commission rate per partner. Five minutes, done once.',
                detail: 'Each partner gets their own commission rate. 10% for the café, 20% for the kayak rental, whatever you negotiate.',
              },
              {
                n: '②',
                title: 'Guests fill out a preference form',
                body: 'Share a branded link in your welcome message. Guests take 60 seconds to pick their vibe, budget, and occasion. The AI does the rest.',
                detail: 'Couple on anniversary? Family with kids? Solo adventurer? The itinerary is different every time.',
              },
              {
                n: '③',
                title: 'You earn on every activity',
                body: 'Each generated itinerary prioritises your partners. Every time a guest follows a recommendation, your commission counter goes up.',
                detail: 'Track earnings, satisfaction scores, and partner performance from your host dashboard.',
              },
            ].map(({ n, title, body, detail }) => (
              <div key={n} className="bg-slate-950 p-8 flex flex-col gap-4">
                <span className="text-3xl text-slate-700">{n}</span>
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{body}</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-auto border-t border-slate-800 pt-4">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What guests see ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-6">Guest experience</p>
              <h2 className="text-3xl font-black text-white mb-6 leading-snug">
                Their view: a thoughtful, personalised day out. Your view: a commission dashboard.
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Guests see a beautiful itinerary built around their group, budget, and vibe —
                with an AI concierge they can chat with to swap activities or find local alternatives in real time.
              </p>
              <p className="text-slate-400 leading-relaxed">
                You see the projected commission for each activity, a satisfaction score, and a breakdown by partner.
                Every time a guest rate 5 stars, you know that partner is worth keeping.
              </p>
            </div>

            {/* Itinerary card mockup — minimal, not a fake browser */}
            <div className="space-y-3">
              {[
                { time: '9:00 AM', icon: '🍽️', name: 'Breakfast at Harbour Table', cost: 55, partner: 'Harbour Table', commission: 11.00 },
                { time: '11:30 AM', icon: '🚴', name: 'Coastal E-Bike Tour', cost: 90, partner: 'Rideline Co.', commission: 18.00 },
                { time: '3:00 PM', icon: '🧘', name: 'Couples Massage at Drift Spa', cost: 160, partner: 'Drift Spa', commission: 32.00 },
                { time: '7:00 PM', icon: '🍷', name: 'Dinner at The Salt Room', cost: 180, partner: 'The Salt Room', commission: 27.00 },
              ].map((item) => (
                <div key={item.time} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-start">
                  <div className="text-2xl shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-blue-400 font-mono">{item.time}</span>
                      <span className="text-sm font-bold text-white">${item.cost}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-blue-400/70 font-mono">🤝 {item.partner}</span>
                      <span className="text-xs text-blue-400 font-mono font-bold">+${item.commission.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-blue-950/50 border border-blue-900/60 rounded-xl p-4 flex items-center justify-between">
                <span className="text-sm text-blue-300 font-semibold">Your commission on this stay</span>
                <span className="text-2xl font-black text-blue-400">$88.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Calculator ── */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-6">The math</p>
              <h2 className="text-3xl font-black text-white mb-6 leading-snug">
                Passive income that scales with your bookings, not your effort.
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                You set up your partner network once. After that, Hostinerary runs automatically.
                Every new guest stay generates an itinerary and a potential commission — no work required from you.
              </p>
              <p className="text-slate-400 leading-relaxed">
                As your partner network grows and your commission rates improve, so does your monthly income.
                It compounds in a way that nightly rental rates don't.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { label: 'Setup time', value: '< 5 min' },
                  { label: 'Per-stay effort', value: 'Zero' },
                  { label: 'Avg per itinerary', value: '$36' },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-xl font-black text-white">{value}</p>
                    <p className="text-xs text-slate-600 mt-1 font-mono">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <CommissionCalc />
          </div>
        </div>
      </section>

      {/* ── Who it's for (scenarios, not use cases) ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-12">If this sounds like you</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                match: 'You manage a beach house and your guests always ask the same questions.',
                outcome: 'Build an itinerary template once. The AI personalises it to each guest\'s vibe. Your surf school and seafood restaurant partners earn. So do you.',
              },
              {
                match: 'You run multiple Airbnb properties and can\'t manually recommend for every guest.',
                outcome: 'Each property gets its own partner network and branded link. Scale your recommendations without scaling your time.',
              },
              {
                match: 'You already have great relationships with local businesses but no way to monetise them.',
                outcome: 'Formalise the referral relationship with a commission rate. Turn word-of-mouth into a revenue line.',
              },
              {
                match: 'Your guests leave 4-star reviews because the stay was great but they didn\'t know what to do.',
                outcome: 'A personalised itinerary in their inbox before they arrive changes that. Better experience. Better reviews. More bookings.',
              },
            ].map(({ match, outcome }) => (
              <div key={match} className="border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
                <p className="text-slate-300 font-semibold leading-relaxed mb-4">"{match}"</p>
                <div className="h-px bg-slate-800 mb-4" />
                <p className="text-slate-500 text-sm leading-relaxed">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI concierge callout ── */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-6">For the guests</p>
            <h2 className="text-3xl font-black text-white mb-6 leading-snug">
              Plus an AI concierge they can actually talk to.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              Every itinerary includes a live chat interface powered by GPT-4.1 with web search.
              Guests can ask for the best-rated restaurant nearby, swap out an activity, or find
              alternatives if it rains — all without texting you.
            </p>
            <p className="text-slate-400 leading-relaxed">
              You stop being the 24/7 local guide. The AI takes that job.
              Your guests get a better experience. You get fewer messages.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-10">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                Start earning on<br />your next guest stay.
              </h2>
              <p className="text-slate-500 mt-4 max-w-md leading-relaxed">
                Set up your property, add a few partners, share the link. Takes less than five minutes.
                No credit card. No contracts.
              </p>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => loginWithRedirect({ appState: { returnTo: '/host' } })}
                className="block bg-blue-600 hover:bg-blue-500 text-white font-black text-lg px-10 py-5 rounded-xl transition-colors whitespace-nowrap"
              >
                Get started free →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-slate-700">
          <div className="flex items-center gap-2 font-bold text-slate-500">
            <span className="bg-blue-500 text-white text-xs font-black px-2 py-0.5 rounded">H</span>
            Hostinerary
          </div>
          <p className="font-mono text-xs">Commission-based guest experiences for STR hosts</p>
        </div>
      </footer>

    </div>
  );
}
