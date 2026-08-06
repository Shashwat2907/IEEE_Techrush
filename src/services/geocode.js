import { ENDPOINTS } from '../config/api';
import destinationsData from '../data/destinations.json';

/**
 * Geocode a query string to lat/lng using Nominatim (free, no API key)
 * @param {string} query - place name or address
 * @returns {Promise<{lat: number, lng: number, name: string}|null>}
 */
export async function geocode(query) {
  try {
    const url = `${ENDPOINTS.GEOCODING}/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TripNest-TravelApp/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

    const data = await res.json();
    if (data.length === 0) return geocodeFallback(query);

    const item = data[0];
    const name = formatDisplayName(item);

    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      name: name || item.display_name,
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
  const q = query.toLowerCase().trim();
  const match = destinationsData.find(d =>
    d.name.toLowerCase().includes(q) ||
    (d.country && d.country.toLowerCase().includes(q))
  );
  if (match) {
    return { lat: match.lat, lng: match.lng, name: match.name };
  }
  return null;
}

/**
 * Reverse geocode lat/lng to place name with rich address details
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{name: string, displayName: string, city: string, country: string}>}
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `${ENDPOINTS.GEOCODING}/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
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
    const city = data.address?.city || data.address?.town || data.address?.municipality || data.address?.village || data.address?.state || '';
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
  const poi = addr.tourism || addr.historic || addr.leisure || addr.amenity || addr.building || item.name;
  const road = addr.road || addr.pedestrian || addr.street;
  const suburb = addr.suburb || addr.neighbourhood || addr.quarter;
  const city = addr.city || addr.town || addr.municipality || addr.village;
  const country = addr.country;

  const parts = [];
  if (poi) parts.push(poi);
  else if (road) parts.push(road);
  
  if (suburb && !parts.includes(suburb)) parts.push(suburb);
  if (city && !parts.includes(city)) parts.push(city);
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
  // Find nearest destination from our curated database
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

  if (closest && minDist < 0.8) {
    return {
      name: `Near ${closest.name}`,
      displayName: `${closest.name} (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
      city: closest.name.split(',')[0],
      country: closest.name.split(',')[1] || '',
    };
  }

  return {
    name: `Location (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`,
    displayName: `Lat: ${lat.toFixed(4)}°, Lng: ${lng.toFixed(4)}°`,
    city: '',
    country: '',
  };
}
