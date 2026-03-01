import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Navbar from '../components/Navbar';

interface ItineraryItem {
  date?: string;
  day?: number;
  time: string;
  activity_name: string;
  description: string;
  estimated_cost: number;
  partner_name: string;
  category: string;
  address?: string;
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
  check_in: string | null;
  check_out: string | null;
  property_name: string | null;
  property_location: string | null;
  property_slug: string | null;
  itinerary: ItineraryItem[];
  total_estimated_cost: number;
  total_commission: number;
  guest_satisfaction_score: number;
  commission_breakdown: CommissionBreakdown[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function groupByDay(items: ItineraryItem[]): { dayNum: number; date: string | undefined; items: ItineraryItem[] }[] {
  const map = new Map<number, { date: string | undefined; items: ItineraryItem[] }>();
  for (const item of items) {
    const dayNum = item.day ?? 1;
    if (!map.has(dayNum)) map.set(dayNum, { date: item.date, items: [] });
    map.get(dayNum)!.items.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayNum, { date, items: dayItems }]) => ({ dayNum, date, items: dayItems }));
}

const SUGGESTED_PROMPTS = [
  'Find me the best-rated restaurant nearby on TripAdvisor',
  'Suggest a romantic alternative to the first activity',
  'What are the must-see local spots near the property?',
  'Search for spa options within my budget',
];

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

function ChatPanel({ itineraryId, propertyLocation }: { itineraryId: number; propertyLocation: string | null }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initialize thread on mount
  useEffect(() => {
    fetch('/api/chat/thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itinerary_id: itineraryId }),
    })
      .then(r => r.json())
      .then((d: { thread_id?: string; error?: string }) => {
        if (d.error) throw new Error(d.error);
        setThreadId(d.thread_id!);
      })
      .catch(err => setError(err.message ?? 'Could not start AI chat session.'))
      .finally(() => setInitializing(false));
  }, [itineraryId]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !threadId || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);
    setStreamingContent(null);
    setError('');

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, message: trimmed }),
      });

      if (!res.ok || !res.body) throw new Error('Stream failed to start.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let full = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          let parsed: { delta?: string; done?: boolean; error?: string };
          try {
            parsed = JSON.parse(raw);
          } catch {
            continue; // non-JSON SSE line (comment, event type, etc.) — skip
          }
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.done) break outer;
          if (parsed.delta) {
            full += parsed.delta;
            setLoading(false);
            setStreamingContent(full);
          }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full }]);
      setStreamingContent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      setStreamingContent(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (error && !threadId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <p className="text-amber-700 text-sm">{error}</p>
        <p className="text-amber-500 text-xs mt-1">Make sure BACKBOARD_API_KEY is set in your .env.local</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">✦</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI Concierge</p>
            <p className="text-xs text-slate-400">
              GPT-4.1 · Web search{propertyLocation ? ` · ${propertyLocation}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto px-5 py-4 space-y-4">
        {initializing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Starting your session…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <p className="text-sm text-slate-500 max-w-sm">
              Ask me anything about your trip — I can search TripAdvisor, find alternatives, look up hours and reviews, or customise your itinerary.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs shrink-0 mr-2 mt-0.5">✦</div>
                )}
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed bg-blue-600 text-white whitespace-pre-wrap">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed bg-slate-100 text-slate-800 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-0.5 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-slate-200 [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:mb-2 [&_pre]:overflow-x-auto [&_a]:text-blue-600 [&_a]:underline [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {streamingContent !== null && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs shrink-0 mr-2 mt-0.5">✦</div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed bg-slate-100 text-slate-800 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:space-y-0.5 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_a]:text-blue-600 [&_a]:underline [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  <span className="inline-block w-0.5 h-3.5 bg-slate-400 animate-pulse ml-0.5 align-middle" />
                </div>
              </div>
            )}
            {loading && streamingContent === null && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs shrink-0 mr-2 mt-0.5">✦</div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={initializing || loading || !threadId}
            placeholder={initializing ? 'Starting session…' : 'Ask about restaurants, activities, local tips…'}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-32"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading || initializing || !threadId}
            className="shrink-0 w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 px-1">Enter to send · Shift+Enter for new line · Web search enabled</p>
      </div>
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
              {data.property_name && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {data.property_name}{data.property_location ? ` · ${data.property_location}` : ''}
                </span>
              )}
              <span className="text-xs text-slate-400">#{data.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Your Itinerary</h1>
            <p className="text-sm text-slate-500 mt-1 capitalize">{data.guest_type} · {data.vibe} vibe · {data.weather} weather</p>
            {data.check_in && data.check_out && (
              <p className="text-sm text-slate-400 mt-0.5">
                {formatDate(data.check_in)} – {formatDate(data.check_out)}
              </p>
            )}
          </div>
          <Link
            to={data.property_slug ? `/guest/${data.property_slug}` : '/host'}
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

            <div className="space-y-8">
              {groupByDay(data.itinerary).map(({ dayNum, date, items }) => (
                <div key={dayNum}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                      {dayNum}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Day {dayNum}</p>
                      {date && (
                        <p className="text-xs text-slate-400">{formatDate(date)}</p>
                      )}
                    </div>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* Day items */}
                  <div className="relative pl-0">
                    <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-200" />
                    <div className="space-y-4">
                      {items.map((item, i) => (
                        <div key={i} className="relative flex gap-4">
                          <div className="shrink-0 w-10 h-10 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center text-base z-10 shadow-sm">
                            {CATEGORY_ICONS[item.category] ?? '📍'}
                          </div>
                          <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.time}</span>
                              <span className="text-sm font-semibold text-slate-800">${item.estimated_cost}</span>
                            </div>
                            <h3 className="font-semibold text-slate-900 text-sm mt-1">{item.activity_name}</h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              {item.address && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <span>📍</span>
                                  <span>{item.address}</span>
                                </div>
                              )}
                              {item.partner_name && (
                                <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <span>🤝</span>
                                  <span>Partner · {item.partner_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
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

        {/* Section 3: AI Concierge Chat */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
            AI Concierge
            <span className="text-xs font-normal text-slate-400 ml-1">Customise your plan · Search local spots · Web-powered</span>
          </h2>
          <ChatPanel itineraryId={data.id} propertyLocation={data.property_location} />
        </div>

        {/* Section 4: Feedback */}
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
