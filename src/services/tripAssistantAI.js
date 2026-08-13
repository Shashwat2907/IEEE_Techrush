import { API_KEYS } from '../config/api';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are TripNest AI, an expert travel planner. When the user describes their trip preferences, respond with a structured JSON trip plan.

Your response MUST be valid JSON with this exact structure:
{
  "summary": "Brief trip summary",
  "days": [
    {
      "dayNumber": 1,
      "label": "Day 1",
      "theme": "Arrival & Exploration",
      "activities": [
        {
          "name": "Specific place name (e.g., The Louvre Museum, Ristorante da Enzo)",
          "type": "activity|food|stay|transport|rest",
          "durationHrs": 2,
          "cost": 50,
          "startHour": 9,
          "notes": "Brief tip or booking info",
          "location": "Specific address or area",
          "lat": 48.8606,
          "lng": 2.3376
        }
      ]
    }
  ]
}

Rules:
- Give highly specific, real places for restaurants, hotels, and attractions (NOT "Local Cafe" or "City Center Hotel").
- NEVER give generic answers. You must name the EXACT restaurant, the EXACT hotel, and the EXACT tour or attraction name.
- Include stay (hotel/accommodation) entries for each day.
- Include at least 2 food entries per day (breakfast/lunch/dinner).
- Include 2-4 specific activities per day.
- Include transport between locations when needed.
- IMPORTANT: You MUST provide realistic 'lat' (latitude) and 'lng' (longitude) coordinates for EVERY activity, food, and stay so they can be plotted on a map.
- Group activities geographically so the user doesn't travel back and forth across the city in one day. Ensure the distance between consecutive activities is reasonable.
- Costs should be realistic for the destination.
- startHour should be in 24-hour format (9 = 9 AM, 13 = 1 PM).
- Activities should flow logically through the day accounting for travel time.
- type must be one of: activity, food, stay, transport, rest
- Maximum 6 days, each day should have 4-8 activities.
- ONLY return JSON, no markdown, no explanation`;

function parseAIResponse(text) {
  try {
    // Try direct JSON parse
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.days)) return parsed;
  } catch {}

  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && Array.isArray(parsed.days)) return parsed;
    } catch {}
  }

  // Try to find JSON object in text
  const braceMatch = text.match(/\{[\s\S]*"days"[\s\S]*\}/);
  if (braceMatch) {
    try {
      const parsed = JSON.parse(braceMatch[0]);
      if (parsed && Array.isArray(parsed.days)) return parsed;
    } catch {}
  }

  return null;
}

function buildUserMessage(input, destination) {
  const destName = destination?.name || 'the destination';
  let msg = `Plan a trip to ${destName}.`;
  if (input.days) msg += ` Duration: ${input.days} days.`;
  if (input.budget) msg += ` Total budget: $${input.budget} USD.`;
  if (input.interests) msg += ` Interests: ${input.interests}.`;
  if (input.travelStyle) msg += ` Travel style: ${input.travelStyle}.`;
  if (input.dietary) msg += ` Dietary preferences: ${input.dietary}.`;
  if (input.freeText) msg += ` Additional details: ${input.freeText}`;
  return msg;
}

export async function generateTripPlan(input, destination) {
  const apiKey = API_KEYS.OPENAI;
  const isGroqKey = apiKey && apiKey.startsWith('gsk_');
  const isUsableKey = apiKey && !/^(YOUR_|DUMMY_|MOCK_)/.test(apiKey.trim());

  const userMessage = buildUserMessage(input, destination);

  if (!isUsableKey) {
    return { success: false, error: 'No API key configured. Please add your API key to .env.local.' };
  }

  const endpoint = isGroqKey ? GROQ_ENDPOINT : 'https://api.openai.com/v1/chat/completions';
  const model = isGroqKey ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: isGroqKey ? undefined : { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error?.message || `API returned ${response.status}` };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { success: false, error: 'Empty response from AI.' };

    const plan = parseAIResponse(content);
    if (!plan) return { success: false, error: 'Could not parse AI response into a trip plan.' };

    // Normalize the plan
    const normalizedDays = (plan.days || []).slice(0, 8).map((day, idx) => ({
      dayNumber: day.dayNumber || idx + 1,
      label: day.label || `Day ${idx + 1}`,
      theme: day.theme || '',
      activities: (day.activities || []).slice(0, 10).map((act) => ({
        name: String(act.name || 'Planned activity'),
        type: ['activity', 'food', 'stay', 'transport', 'rest'].includes(act.type) ? act.type : 'activity',
        durationHrs: Math.min(12, Math.max(0.5, Number(act.durationHrs || act.duration || 2))),
        cost: Math.max(0, Number(act.cost || 0)),
        startHour: Math.min(23, Math.max(0, Number(act.startHour || 9))),
        notes: act.notes || '',
        location: act.location || '',
        lat: Number(act.lat) || null,
        lng: Number(act.lng) || null,
      })),
    }));

    return {
      success: true,
      plan: {
        summary: plan.summary || 'Your personalized trip plan',
        days: normalizedDays,
      },
      source: isGroqKey ? 'Groq AI' : 'OpenAI',
    };
  } catch (error) {
    console.warn('AI trip planning error:', error);
    return { success: false, error: error.message || 'Failed to connect to AI service.' };
  }
}

export async function chatWithAssistant(messages, destination) {
  const apiKey = API_KEYS.OPENAI;
  const isGroqKey = apiKey && apiKey.startsWith('gsk_');
  const isUsableKey = apiKey && !/^(YOUR_|DUMMY_|MOCK_)/.test(apiKey.trim());

  if (!isUsableKey) {
    return { success: false, error: 'No API key configured.' };
  }

  const endpoint = isGroqKey ? GROQ_ENDPOINT : 'https://api.openai.com/v1/chat/completions';
  const model = isGroqKey ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

  const destContext = destination ? `The user is planning a trip to ${destination.name || 'a destination'}.` : '';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are TripNest AI, a friendly and knowledgeable travel assistant. ${destContext} Help the user plan their trip by suggesting places to visit, food to try, where to stay, and how to get around. Be specific with names of places, estimated costs in USD, and practical tips. When the user is ready for a full plan, tell them to click "Generate Full Plan" button. Keep responses concise and helpful.`,
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData?.error?.message || `API error ${response.status}` };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return { success: true, content: content || 'I apologize, I could not generate a response.' };
  } catch (error) {
    return { success: false, error: error.message || 'Connection failed.' };
  }
}

export async function generateMatchmakerDestinations(preferences) {
  try {
    const { vibe, tempo, budget } = preferences;
    const apiKey = API_KEYS.OPENAI;
    if (!apiKey) throw new Error('No valid API key found.');
    
    const prompt = `You are an expert travel matchmaker. Based on the user's preferences:
- Vibe: ${vibe}
- Tempo: ${tempo}
- Budget: ${budget}

Recommend 3 highly specific destinations globally that perfectly match this profile.
Include real latitude and longitude coordinates.

Return ONLY a JSON array with exactly this structure for each destination:
[
  {
    "id": "city-country-code",
    "name": "City, Country",
    "lat": 12.34,
    "lng": -56.78,
    "type": ["${vibe}"],
    "crowdLevel": "${tempo}",
    "budgetTier": "${budget}",
    "reason": "A 1-sentence reason why this matches their vibe."
  }
]`;

    if (apiKey.startsWith('gsk_')) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });
      if (!response.ok) throw new Error(`Groq API error: ${response.statusText}`);
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const parsed = parseAIResponse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { success: true, destinations: parsed };
      }
      throw new Error('Failed to parse AI response into destinations array.');
    } else {
      throw new Error('Unsupported API key.');
    }
  } catch (error) {
    console.warn('Matchmaker error:', error);
    return { success: false, error: error.message };
  }
}

export async function generateDestinationOverview(locationName) {
  try {
    const apiKey = API_KEYS.OPENAI;
    if (!apiKey) return null;
    
    const prompt = `Write a short, engaging 2-sentence travel overview of ${locationName}. Focus on vibe, history, and what it's known for.`;
    
    if (apiKey.startsWith('gsk_')) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || null;
    }
  } catch (err) {
    console.warn('Overview error:', err);
    return null;
  }
}
