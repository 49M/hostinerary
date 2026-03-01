import { Router } from 'express';
import type { Request, Response } from 'express';
import db from '../db.js';
import { BACKBOARD_BASE, bbHeaders, getAssistantId } from '../backboard.js';

const router = Router();

// Maps thread_id → context string, consumed on first message
const pendingContext = new Map<string, string>();

interface ItineraryRow {
  id: number;
  guest_type: string;
  occasion: string;
  budget: number;
  vibe: string;
  indoor_outdoor: string;
  weather: string;
  itinerary_json: string;
  property_name: string | null;
  property_location: string | null;
}

interface ItineraryItem {
  time: string;
  activity_name: string;
  description: string;
  estimated_cost: number;
  partner_name: string;
}

// POST /api/chat/thread  — create a Backboard thread for an itinerary
router.post('/thread', async (req: Request, res: Response) => {
  const { itinerary_id } = req.body as { itinerary_id: number };

  if (!process.env.BACKBOARD_API_KEY) {
    return res.status(503).json({ error: 'AI concierge is not configured (missing BACKBOARD_API_KEY).' });
  }

  try {
    const row = db.prepare(`
      SELECT gi.id, gi.guest_type, gi.occasion, gi.budget, gi.vibe,
             gi.indoor_outdoor, gi.weather, gi.itinerary_json,
             p.name AS property_name, p.location AS property_location
      FROM generated_itineraries gi
      LEFT JOIN properties p ON p.id = gi.property_id
      WHERE gi.id = ?
    `).get(itinerary_id) as ItineraryRow | undefined;

    if (!row) return res.status(404).json({ error: 'Itinerary not found' });

    const assistantId = await getAssistantId();

    const threadRes = await fetch(`${BACKBOARD_BASE}/assistants/${assistantId}/threads`, {
      method: 'POST',
      headers: { ...bbHeaders(), 'Content-Type': 'application/json' },
    });

    if (!threadRes.ok) {
      throw new Error(`Backboard thread creation failed: ${await threadRes.text()}`);
    }

    const { thread_id } = await threadRes.json() as { thread_id: string };

    // Build context to prepend to the guest's first message
    const parsed = JSON.parse(row.itinerary_json) as { itinerary: ItineraryItem[] };
    const location = row.property_location ?? 'the local area';

    const context = `[ITINERARY CONTEXT — use this to inform all your answers, do not repeat it back verbatim]
Property: ${row.property_name ?? 'Unnamed Property'}${row.property_location ? ` · ${row.property_location}` : ''}
Guest type: ${row.guest_type} | Occasion: ${row.occasion} | Vibe: ${row.vibe} | Budget: $${row.budget} | Weather: ${row.weather} | Preference: ${row.indoor_outdoor}

Current itinerary for today:
${parsed.itinerary.map((item, i) =>
  `${i + 1}. ${item.time} – ${item.activity_name} ($${item.estimated_cost})
   ${item.description}${item.partner_name ? `\n   Venue: ${item.partner_name}` : ''}`
).join('\n\n')}

The guest is staying near ${location}. Use this as the base location for all web searches, restaurant lookups, and attraction recommendations. When searching for venues, look up TripAdvisor, Google ratings, and current hours.

---

Guest message: `;

    pendingContext.set(thread_id, context);
    res.json({ thread_id });
  } catch (err) {
    console.error('Backboard /thread error:', err);
    res.status(500).json({ error: 'Failed to create AI chat session.' });
  }
});

// POST /api/chat/stream  — send a message, stream the reply as SSE
router.post('/stream', async (req: Request, res: Response) => {
  const { thread_id, message } = req.body as { thread_id: string; message: string };

  if (!thread_id || !message) {
    return res.status(400).json({ error: 'thread_id and message are required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.socket?.setNoDelay(true);
  res.flushHeaders();

  const send = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    let content = message;
    if (pendingContext.has(thread_id)) {
      content = pendingContext.get(thread_id)! + message;
      pendingContext.delete(thread_id);
    }

    const formData = new URLSearchParams();
    formData.append('content', content);
    formData.append('stream', 'true');
    formData.append('llm_provider', 'openai');
    formData.append('model_name', 'gpt-4.1');
    formData.append('memory', 'Auto');
    formData.append('web_search', 'Auto');

    const msgRes = await fetch(`${BACKBOARD_BASE}/threads/${thread_id}/messages`, {
      method: 'POST',
      headers: bbHeaders(),
      body: formData,
    });

    if (!msgRes.ok || !msgRes.body) {
      const errText = await msgRes.text();
      console.error('Backboard stream HTTP error:', msgRes.status, errText);
      send({ error: `Backboard error: ${errText}` });
      res.end();
      return;
    }

    const reader = msgRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let done = false;

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;

        let parsed: { type?: string; delta?: string; content?: string; text?: string; error?: string };
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }

        const isDelta = parsed.type?.includes('delta') || parsed.type?.includes('token') || parsed.type?.includes('chunk') || parsed.type?.includes('streaming');
        const isDone = parsed.type?.includes('end') || parsed.type?.includes('done') || parsed.type?.includes('complete');

        if (isDelta) {
          const delta = parsed.delta ?? parsed.content ?? (parsed as Record<string, unknown>).text as string ?? null;
          if (delta) send({ delta });
        } else if (isDone) {
          send({ done: true });
          res.end();
          done = true;
          break;
        } else if (parsed.type === 'error' || parsed.error) {
          send({ error: parsed.error ?? 'Unknown error' });
          res.end();
          done = true;
          break;
        }
        // user_message / run_started / message_start / tool_* events — ignore
      }
    }

    if (!done) {
      send({ done: true });
      res.end();
    }
  } catch (err) {
    console.error('Backboard /stream error:', err);
    send({ error: 'Stream failed. Please try again.' });
    res.end();
  }
});

export default router;
