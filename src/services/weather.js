import { API_KEYS } from '../config/api';

// Mock weather data for when the API is unavailable
const MOCK_WEATHER = {
  'default': { temp: 25, humidity: 60, description: 'Partly cloudy', icon: '02d', wind: 12 },
  'tropical': { temp: 30, humidity: 80, description: 'Warm and humid', icon: '01d', wind: 8 },
  'cold': { temp: 5, humidity: 45, description: 'Cold and clear', icon: '01d', wind: 18 },
  'temperate': { temp: 18, humidity: 55, description: 'Mild and pleasant', icon: '03d', wind: 15 },
};

/**
 * Get current weather for a location
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object>}
 */
export async function getWeather(lat, lng) {
  // If using mock key, skip the API call
  if (API_KEYS.OPENWEATHERMAP === 'MOCK_OWM_KEY_replace_me') {
    return getMockWeather(lat);
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEYS.OPENWEATHERMAP}&units=metric`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Weather API: ${res.status}`);

    const data = await res.json();
    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      wind: Math.round(data.wind.speed),
      isMock: false,
    };
  } catch (err) {
    console.warn('Weather API error, using mock data:', err.message);
    return { ...getMockWeather(lat), isMock: true };
  }
}

/**
 * Generate plausible mock weather based on latitude
 */
function getMockWeather(lat) {
  const absLat = Math.abs(lat);
  let base;
  if (absLat < 15) base = MOCK_WEATHER.tropical;
  else if (absLat > 50) base = MOCK_WEATHER.cold;
  else if (absLat > 30) base = MOCK_WEATHER.temperate;
  else base = MOCK_WEATHER.default;

  // Add small random variation
  return {
    ...base,
    temp: base.temp + Math.floor(Math.random() * 6) - 3,
    humidity: base.humidity + Math.floor(Math.random() * 10) - 5,
    isMock: true,
  };
}

/**
 * Get weather icon URL
 */
export function getWeatherIconUrl(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}
