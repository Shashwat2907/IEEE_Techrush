import { API_KEYS } from '../config/api';

function fallbackPlan(prompt, destinationName = 'your destination') {
  const lower = prompt.toLowerCase();
  const food = /food|eat|culinary|restaurant/.test(lower);
  const outdoors = /hike|nature|beach|outdoor|trek/.test(lower);
  const culture = /museum|history|culture|heritage/.test(lower);
  const pick = (name, durationHrs, cost, type = 'activity') => ({ name, durationHrs, cost, type });
  return [
    pick(`Arrival walk through ${destinationName}`, 1.5, 0),
    food ? pick('Local food trail', 2, 24, 'food') : pick('Signature local experience', 2.5, 20),
    outdoors ? pick('Scenic outdoor exploration', 3, 12) : culture ? pick('Culture and heritage visit', 2.5, 18) : pick('Sunset viewpoint', 1.5, 0),
  ];
}

function normalizeActivities(value) {
  const items = Array.isArray(value) ? value : value?.activities;
  if (!Array.isArray(items)) return null;
  return items.slice(0, 8).map((item) => ({
    name: String(item.name || item.title || 'Planned activity'),
    durationHrs: Math.min(8, Math.max(0.5, Number(item.durationHrs || item.duration || 2))),
    cost: Math.max(0, Number(item.cost || 0)),
    type: ['activity', 'food', 'stay', 'transport', 'rest'].includes(item.type) ? item.type : 'activity',
    notes: item.notes || '',
  }));
}

export async function generateActivities(prompt, destinationName) {
  const destination = typeof destinationName === 'object' ? destinationName : { name: destinationName };
  const name = destination?.name || 'your destination';
  const fallback = fallbackPlan(prompt, name);
  const usableKey = (key) => key && !/^(YOUR_|DUMMY_|MOCK_)/.test(key.trim());
  if (!usableKey(API_KEYS.OPENAI) && !usableKey(API_KEYS.GEMINI)) return { activities: fallback, source: 'Smart local planner' };

  const instruction = `Turn this travel request into JSON only: an array of up to 6 activities. Each item must have name, durationHrs, cost, type (activity|food|stay|transport|rest), and optional notes. Destination: ${name}. Request: ${prompt}`;
  try {
    if (usableKey(API_KEYS.GEMINI)) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEYS.GEMINI}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { responseMimeType: 'application/json' } }),
      });
      const data = await response.json();
      const normalized = normalizeActivities(JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || 'null'));
      if (normalized) return { activities: normalized, source: 'Gemini' };
    }
    if (usableKey(API_KEYS.OPENAI)) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEYS.OPENAI}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: instruction }], response_format: { type: 'json_object' } }),
      });
      const data = await response.json();
      const normalized = normalizeActivities(JSON.parse(data?.choices?.[0]?.message?.content || 'null'));
      if (normalized) return { activities: normalized, source: 'OpenAI' };
    }
  } catch (error) {
    console.warn('AI itinerary generation fell back to local planner:', error);
  }
  return { activities: fallback, source: 'Smart local planner' };
}
