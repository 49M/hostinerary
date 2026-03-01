export const BACKBOARD_BASE = 'https://app.backboard.io/api';

export function bbHeaders(): Record<string, string> {
  return { 'X-API-Key': process.env.BACKBOARD_API_KEY! };
}

let _assistantId: string | null = null;

export async function getAssistantId(): Promise<string> {
  if (_assistantId) return _assistantId;

  if (process.env.BACKBOARD_ASSISTANT_ID) {
    _assistantId = process.env.BACKBOARD_ASSISTANT_ID;
    return _assistantId;
  }

  const res = await fetch(`${BACKBOARD_BASE}/assistants`, {
    method: 'POST',
    headers: { ...bbHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hostinerary Concierge',
      system_prompt: `You are an expert travel concierge for Hostinerary, a short-term rental platform. Your role is to help guests plan and customize their stay.

You have access to real-time web search to look up restaurants, attractions, reviews (TripAdvisor, Google Maps, Yelp), operating hours, prices, and local tips for the guest's specific destination.

When helping guests:
- Be warm, specific, and location-aware — always tailor suggestions to where the property is
- Search for current TripAdvisor ratings, Google reviews, and local recommendations
- Help guests swap activities, add stops, adjust timing, or find alternatives within their budget
- Proactively mention must-see spots, hidden gems, and local favourites near the property
- Keep the guest's stated preferences (budget, vibe, occasion, party type) central to all suggestions
- When asked about a specific venue, search for it and provide current info (hours, ratings, address)`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Backboard assistant: ${err}`);
  }

  const data = await res.json() as { assistant_id: string };
  _assistantId = data.assistant_id;
  return _assistantId;
}
