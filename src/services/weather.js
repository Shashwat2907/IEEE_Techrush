import { API_KEYS, ENDPOINTS } from '../config/api';

// WMO Weather interpretation codes (Open-Meteo standard)
const WMO_CODE_MAP = {
  0: { description: 'Clear sky', icon: '01d' },
  1: { description: 'Mainly clear', icon: '02d' },
  2: { description: 'Partly cloudy', icon: '03d' },
  3: { description: 'Overcast', icon: '04d' },
  45: { description: 'Foggy', icon: '50d' },
  48: { description: 'Depositing rime fog', icon: '50d' },
  51: { description: 'Light drizzle', icon: '09d' },
  53: { description: 'Moderate drizzle', icon: '09d' },
  55: { description: 'Dense drizzle', icon: '09d' },
  61: { description: 'Slight rain', icon: '10d' },
  63: { description: 'Moderate rain', icon: '10d' },
  65: { description: 'Heavy rain', icon: '10d' },
  71: { description: 'Slight snow', icon: '13d' },
  73: { description: 'Moderate snow', icon: '13d' },
  75: { description: 'Heavy snow', icon: '13d' },
  77: { description: 'Snow grains', icon: '13d' },
  80: { description: 'Slight rain showers', icon: '09d' },
  81: { description: 'Moderate rain showers', icon: '09d' },
  82: { description: 'Violent rain showers', icon: '09d' },
  85: { description: 'Slight snow showers', icon: '13d' },
  86: { description: 'Heavy snow showers', icon: '13d' },
  95: { description: 'Thunderstorm', icon: '11d' },
  96: { description: 'Thunderstorm with hail', icon: '11d' },
  99: { description: 'Severe thunderstorm with hail', icon: '11d' },
};

// Fallback mock weather patterns
const MOCK_WEATHER = {
  default: { temp: 24, humidity: 55, description: 'Partly cloudy', icon: '02d', wind: 12 },
  tropical: { temp: 31, humidity: 82, description: 'Warm and humid', icon: '01d', wind: 8 },
  cold: { temp: 4, humidity: 48, description: 'Crisp and clear', icon: '01d', wind: 16 },
  temperate: { temp: 19, humidity: 58, description: 'Mild and pleasant', icon: '03d', wind: 14 },
};

/**
 * Get real-time live weather for a coordinate
 * Prioritizes Open-Meteo (live, no key required) and OpenWeatherMap (if key provided)
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object>}
 */
export async function getWeather(lat, lng) {
  if (lat === undefined || lng === undefined) return getMockWeather(0);

  // 1. Try Open-Meteo live API (free, reliable, global real-time)
  try {
    const url = `${ENDPOINTS.OPEN_METEO}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      const wmo = WMO_CODE_MAP[current.weather_code] || {
        description: 'Clear sky',
        icon: current.is_day === 0 ? '01n' : '01d',
      };

      const icon = current.is_day === 0 ? wmo.icon.replace('d', 'n') : wmo.icon;

      return {
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: Math.round(current.relative_humidity_2m),
        description: wmo.description,
        icon,
        wind: Math.round(current.wind_speed_10m),
        isLive: true,
        source: 'Open-Meteo Live',
        forecast: data.daily?.time?.slice(0, 5).map((date, idx) => ({
          date,
          maxTemp: Math.round(data.daily.temperature_2m_max[idx]),
          minTemp: Math.round(data.daily.temperature_2m_min[idx]),
          wmoCode: data.daily.weather_code[idx],
        })),
      };
    }
  } catch (err) {
    console.info('Open-Meteo live query skipped or timed out:', err.message);
  }

  // 2. Try OpenWeatherMap if custom API key is present
  const owmKey = API_KEYS.OPENWEATHERMAP;
  if (owmKey && owmKey !== 'MOCK_OWM_KEY_replace_me') {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${owmKey}&units=metric`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          wind: Math.round(data.wind.speed),
          isLive: true,
          source: 'OpenWeatherMap',
        };
      }
    } catch (err) {
      console.warn('OpenWeatherMap API fallback:', err.message);
    }
  }

  // 3. Fallback to realistic coordinate-modeled weather
  return { ...getMockWeather(lat), isLive: false, source: 'Calculated Simulation' };
}

/**
 * Generate plausible coordinate-derived weather
 */
function getMockWeather(lat) {
  const absLat = Math.abs(lat);
  let base;
  if (absLat < 18) base = MOCK_WEATHER.tropical;
  else if (absLat > 48) base = MOCK_WEATHER.cold;
  else if (absLat > 25) base = MOCK_WEATHER.temperate;
  else base = MOCK_WEATHER.default;

  return {
    ...base,
    temp: base.temp + (Math.floor(Math.random() * 4) - 2),
    humidity: Math.min(95, Math.max(30, base.humidity + (Math.floor(Math.random() * 8) - 4))),
    wind: Math.max(4, base.wind + (Math.floor(Math.random() * 6) - 3)),
  };
}

/**
 * Get weather icon URL (OpenWeatherMap compatible)
 */
export function getWeatherIconUrl(iconCode) {
  if (!iconCode) return 'https://openweathermap.org/img/wn/02d@2x.png';
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}
