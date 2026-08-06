// Dynamic API Key and configuration manager with localStorage persistence

export function getStoredApiKey(name) {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`tripnest_key_${name.toLowerCase()}`);
    if (stored && stored.trim()) return stored.trim();
  }
  return null;
}

export function setStoredApiKey(name, value) {
  if (typeof window !== 'undefined') {
    if (value && value.trim()) {
      localStorage.setItem(`tripnest_key_${name.toLowerCase()}`, value.trim());
    } else {
      localStorage.removeItem(`tripnest_key_${name.toLowerCase()}`);
    }
  }
}

export const API_KEYS = {
  get OPENWEATHERMAP() {
    return getStoredApiKey('openweathermap') || import.meta.env.VITE_OPENWEATHERMAP_KEY || '';
  },
  get LLM() {
    return getStoredApiKey('llm') || import.meta.env.VITE_LLM_KEY || '';
  },
  get CROWD() {
    return getStoredApiKey('crowd') || import.meta.env.VITE_CROWD_KEY || '';
  },
  GEOCODING: 'nominatim', // Using Nominatim (free, no key needed)
};

// API endpoints
export const ENDPOINTS = {
  OPEN_METEO: 'https://api.open-meteo.com/v1/forecast',
  WEATHER: 'https://api.openweathermap.org/data/2.5',
  WEATHER_TILES: 'https://tile.openweathermap.org/map',
  GEOCODING: 'https://nominatim.openstreetmap.org',
  OWM_TILES: (layer, z, x, y, apiKey) =>
    `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`,
};

// Globe textures (NASA public domain / high-res local assets)
export const TEXTURES = {
  EARTH_DAY: '/textures/earth_day.jpg',
  EARTH_NIGHT: '/textures/earth_night.jpg',
  EARTH_TOPO: '/textures/earth_topo.png',
  EARTH_SPECULAR: '/textures/earth_specular.jpg',
  EARTH_NORMAL: '/textures/earth_normal.jpg',
  CLOUDS: '/textures/earth_clouds.png',
};

// Map tile providers
export const MAP_TILES = {
  DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  DARK_ATTR: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  VOYAGER: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  VOYAGER_ATTR: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  SATELLITE_ATTR: 'Tiles &copy; Esri',
};
