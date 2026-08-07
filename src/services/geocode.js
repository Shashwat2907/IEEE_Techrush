import { ENDPOINTS } from '../config/api';
import destinationsData from '../data/destinations.json';

/**
 * Normalize longitude to [-180, 180] and latitude to [-85, 85]
 */
export function normalizeCoordinates(lat, lng) {
  const normalizedLng = ((((lng + 180) % 360) + 360) % 360) - 180;
  const clampedLat = Math.max(-85, Math.min(85, lat));
  return { lat: clampedLat, lng: normalizedLng };
}

/**
 * Geocode a query string to a list of matching places
 * @param {string} query - place name, city, landmark, or address
 * @returns {Promise<Array<{lat: number, lng: number, name: string, country: string, displayName: string}>>}
 */
export async function geocode(query) {
  if (!query || !query.trim()) return [];

  try {
    const url = `${ENDPOINTS.GEOCODING}/search?format=json&q=${encodeURIComponent(query.trim())}&limit=6&addressdetails=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TripNest-TravelApp/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

    const data = await res.json();
    if (!data || data.length === 0) return geocodeFallback(query);

    return data.map((item) => {
      const coords = normalizeCoordinates(parseFloat(item.lat), parseFloat(item.lon));
      const formattedName = formatDisplayName(item);
      const country = item.address?.country || '';

      return {
        lat: coords.lat,
        lng: coords.lng,
        name: formattedName || item.display_name.split(',')[0].trim(),
        country,
        displayName: item.display_name || formattedName,
      };
    });
  } catch (err) {
    console.warn('Geocoding error, falling back to local database:', err.message);
    return geocodeFallback(query);
  }
}

/**
 * Fallback: search destinations.json for matching names
 */
function geocodeFallback(query) {
  const q = query.toLowerCase().trim();
  const matches = destinationsData.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      (d.country && d.country.toLowerCase().includes(q))
  );

  return matches.slice(0, 5).map((d) => ({
    lat: d.lat,
    lng: d.lng,
    name: d.name,
    country: d.country || '',
    displayName: `${d.name}, ${d.country || ''}`,
  }));
}

/**
 * Reverse geocode lat/lng to place name with rich address details
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{name: string, displayName: string, city: string, country: string}>}
 */
export async function reverseGeocode(rawLat, rawLng) {
  const { lat, lng } = normalizeCoordinates(rawLat, rawLng);

  try {
    const url = `${ENDPOINTS.GEOCODING}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TripNest-TravelApp/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);

    const data = await res.json();
    if (!data || data.error) return reverseGeocodeFallback(lat, lng);

    const name = formatDisplayName(data);
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.municipality ||
      data.address?.village ||
      data.address?.state ||
      '';
    const country = data.address?.country || '';

    return {
      name: name || `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
      displayName: data.display_name || `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
      city,
      country,
    };
  } catch (err) {
    console.warn('Reverse geocode error, using fallback:', err.message);
    return reverseGeocodeFallback(lat, lng);
  }
}

/**
 * Clean and format a short, user-friendly place name
 */
function formatDisplayName(item) {
  if (!item) return '';
  const addr = item.address || {};

  // If specific POI or attraction exists
  const poi =
    addr.tourism ||
    addr.historic ||
    addr.leisure ||
    addr.amenity ||
    addr.building ||
    addr.natural ||
    item.name;
  const road = addr.road || addr.pedestrian || addr.street;
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter;
  const city = addr.city || addr.town || addr.municipality || addr.village;
  const state = addr.state;
  const country = addr.country;

  const parts = [];
  if (poi && poi !== city && poi !== country) parts.push(poi);
  else if (road) parts.push(road);

  if (suburb && !parts.includes(suburb) && suburb !== city) parts.push(suburb);
  if (city && !parts.includes(city)) parts.push(city);
  else if (state && !parts.includes(state)) parts.push(state);

  if (parts.length === 0 && country) parts.push(country);

  if (parts.length > 0) {
    return parts.slice(0, 2).join(', ');
  }

  // Fallback to first two segments of display_name
  if (item.display_name) {
    return item.display_name.split(',').slice(0, 2).join(',').trim();
  }

  return '';
}

/**
 * Fallback when reverse geocoding is unavailable
 */
function reverseGeocodeFallback(lat, lng) {
  let closest = null;
  let minDist = Infinity;

  for (const dest of destinationsData) {
    const dLat = dest.lat - lat;
    const dLng = dest.lng - lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDist) {
      minDist = dist;
      closest = dest;
    }
  }

  if (closest && minDist < 1.2) {
    return {
      name: closest.name,
      displayName: `${closest.name}, ${closest.country || ''}`,
      city: closest.name.split(',')[0],
      country: closest.country || '',
    };
  }

  return {
    name: `Waypoint (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
    displayName: `Lat: ${lat.toFixed(4)}°, Lng: ${lng.toFixed(4)}°`,
    city: '',
    country: '',
  };
}
