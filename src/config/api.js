export const API_KEYS = {
  OPENWEATHERMAP: import.meta.env.VITE_OPENWEATHERMAP_KEY || 'MOCK_OWM_KEY_replace_me',
  GEOCODING: 'nominatim', // Using Nominatim (free, no key needed)
  LLM: import.meta.env.VITE_LLM_KEY || 'MOCK_LLM_KEY_replace_me',
};

// API endpoints
export const ENDPOINTS = {
  WEATHER: 'https://api.openweathermap.org/data/2.5',
  WEATHER_TILES: 'https://tile.openweathermap.org/map',
  GEOCODING: 'https://nominatim.openstreetmap.org',
  OWM_TILES: (layer, z, x, y, apiKey) =>
    `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`,
};

// Globe textures (NASA public domain / verified CDN)
export const TEXTURES = {
  EARTH_DAY: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  EARTH_NIGHT: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
  EARTH_TOPO: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  CLOUDS: 'https://unpkg.com/three-globe/example/img/earth-clouds.png',
};

// Map tile providers
export const MAP_TILES = {
  DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  DARK_ATTR: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  SATELLITE_ATTR: 'Tiles &copy; Esri',
};
