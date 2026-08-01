import { ENDPOINTS } from '../config/api';

/**
 * Geocode a query string to lat/lng using Nominatim (free, no API key)
 * @param {string} query - place name or address
 * @returns {Promise<{lat: number, lng: number, name: string}|null>}
 */
export async function geocode(query) {
  try {
    const url = `${ENDPOINTS.GEOCODING}/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TripNest-Hackathon/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

    const data = await res.json();
    if (data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      name: data[0].display_name,
    };
  } catch (err) {
    console.warn('Geocoding error, falling back to mock:', err.message);
    return geocodeFallback(query);
  }
}

/**
 * Fallback: search destinations.json for a matching name
 */
function geocodeFallback(query) {
  // Use dynamic import for fallback
  return import('../data/destinations.json').then(mod => {
    const destinations = mod.default;
    const q = query.toLowerCase();
    const match = destinations.find(d =>
      d.name.toLowerCase().includes(q)
    );
    if (match) {
      return { lat: match.lat, lng: match.lng, name: match.name };
    }
    return null;
  }).catch(() => null);
}

/**
 * Reverse geocode lat/lng to place name
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `${ENDPOINTS.GEOCODING}/reverse?format=json&lat=${lat}&lon=${lng}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TripNest-Hackathon/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);

    const data = await res.json();
    return data.display_name || 'Unknown location';
  } catch {
    return 'Unknown location';
  }
}
