// API configuration — reads keys from environment variables (.env.local)
// To configure: copy .env.example to .env.local and fill in your API keys

export const API_KEYS = {
  get OPENWEATHERMAP() {
    return import.meta.env.VITE_OPENWEATHERMAP_KEY || '';
  },
  get OPENAI() {
    return import.meta.env.VITE_OPENAI_KEY || '';
  },
  get GEMINI() {
    return import.meta.env.VITE_GEMINI_KEY || '';
  },
  GEOCODING: 'nominatim',
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
