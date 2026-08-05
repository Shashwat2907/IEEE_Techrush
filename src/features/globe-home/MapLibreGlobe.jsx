import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, VIEW_STATES } from '../../context/AppContext';
import { useFilters } from '../../context/FilterContext';
import { useItinerary } from '../../context/ItineraryContext';
import { getDestinations, getTrendingDestinations } from '../../services/destinations';
import { getWeather } from '../../services/weather';
import { getCrowdLevel, getCrowdColor } from '../../services/crowd';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import DetailPanel from '../destination-map/DetailPanel';
import GlobeFilters from './GlobeFilters';

// ── Tile Providers ──
const SATELLITE_SOURCE = {
  type: 'raster',
  tiles: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
  tileSize: 256,
  attribution: '&copy; Esri &copy; OpenStreetMap',
  maxzoom: 19,
};

const DARK_SOURCE = {
  type: 'raster',
  tiles: [
    'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
  ],
  tileSize: 256,
  attribution: '&copy; CartoDB &copy; OpenStreetMap',
  maxzoom: 19,
};

const VOYAGER_SOURCE = {
  type: 'raster',
  tiles: [
    'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
  ],
  tileSize: 256,
  attribution: '&copy; CartoDB &copy; OpenStreetMap',
  maxzoom: 19,
};

export default function MapLibreGlobe({
  onOpenItinerary,
  onOpenPacking,
  onOpenCompare,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const animFrameRef = useRef(null);
  const isInteractingRef = useRef(false);

  const {
    viewState,
    selectedDestination,
    flightTarget,
    isTransitioning,
    arriveAtDestination,
    navigateToGlobe,
    flyToDestination,
  } = useApp();

  const { filters } = useFilters();
  const { days, setDestination } = useItinerary();

  const [currentZoom, setCurrentZoom] = useState(1.6);
  const [activeTileStyle, setActiveTileStyle] = useState('satellite');
  const [weatherData, setWeatherData] = useState(null);
  const [crowdData, setCrowdData] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [showCrowd, setShowCrowd] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const isDestinationView = selectedDestination !== null || (currentZoom >= 6.5 && !isTransitioning);

  // Active destination details
  const activeDest = useMemo(() => {
    if (selectedDestination) return selectedDestination;
    if (flightTarget) return flightTarget;
    return null;
  }, [selectedDestination, flightTarget]);

  // Sync itinerary destination
  useEffect(() => {
    if (selectedDestination) {
      setDestination(selectedDestination);
    }
  }, [selectedDestination, setDestination]);

  // Fetch weather and crowd data
  useEffect(() => {
    if (!activeDest) {
      setWeatherData(null);
      setCrowdData(null);
      return;
    }
    let isMounted = true;
    getWeather(activeDest.lat, activeDest.lng)
      .then((data) => { if (isMounted) setWeatherData(data); })
      .catch((err) => console.warn('Weather fetch error:', err));

    getCrowdLevel(activeDest.id)
      .then((data) => { if (isMounted) setCrowdData(data); })
      .catch((err) => console.warn('Crowd level error:', err));

    return () => { isMounted = false; };
  }, [activeDest]);

  // ─── Initialize MapLibre Globe ───
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        projection: {
          type: 'globe',
        },
        sources: {
          'esri-satellite': SATELLITE_SOURCE,
          'carto-dark': DARK_SOURCE,
          'carto-voyager': VOYAGER_SOURCE,
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: 'visible' },
          },
          {
            id: 'dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: 'none' },
          },
          {
            id: 'voyager-layer',
            type: 'raster',
            source: 'carto-voyager',
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: 'none' },
          },
        ],
        sky: {
          'sky-color': '#080C14',
          'sky-horizon-blend': 0.4,
          'horizon-color': '#0B1120',
          'horizon-fog-blend': 0.6,
          'fog-color': '#080C14',
          'fog-ground-blend': 0.4,
        },
      },
      center: [15, 20],
      zoom: 1.6,
      minZoom: 1.0,
      maxZoom: 18,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.on('load', () => {
      map.setProjection({ type: 'globe' });
      setMapLoaded(true);

      // Add itinerary route source & layer
      map.addSource('itinerary-route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      map.addLayer({
        id: 'itinerary-line',
        type: 'line',
        source: 'itinerary-route',
        paint: {
          'line-color': '#38BDF8',
          'line-width': 2.5,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
      });
    });

    map.on('zoom', () => {
      setCurrentZoom(map.getZoom());
    });

    // Auto-spin idle logic
    const handleStartInteract = () => { isInteractingRef.current = true; };
    const handleEndInteract = () => {
      setTimeout(() => { isInteractingRef.current = false; }, 2000);
    };

    map.on('mousedown', handleStartInteract);
    map.on('touchstart', handleStartInteract);
    map.on('dragstart', handleStartInteract);
    map.on('mouseup', handleEndInteract);
    map.on('touchend', handleEndInteract);
    map.on('dragend', handleEndInteract);

    mapRef.current = map;

    // Subtle idle orbit rotation
    let lastSpinTime = performance.now();
    const spinGlobe = (time) => {
      if (
        mapRef.current &&
        !isInteractingRef.current &&
        !isTransitioning &&
        !selectedDestination &&
        !flightTarget &&
        mapRef.current.getZoom() <= 2.2
      ) {
        if (time - lastSpinTime > 50) {
          const center = mapRef.current.getCenter();
          center.lng -= 0.08;
          mapRef.current.setCenter(center);
          lastSpinTime = time;
        }
      }
      animFrameRef.current = requestAnimationFrame(spinGlobe);
    };
    animFrameRef.current = requestAnimationFrame(spinGlobe);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Handle Tile Style Switching ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    map.setLayoutProperty('satellite-layer', 'visibility', activeTileStyle === 'satellite' ? 'visible' : 'none');
    map.setLayoutProperty('dark-layer', 'visibility', activeTileStyle === 'dark' ? 'visible' : 'none');
    map.setLayoutProperty('voyager-layer', 'visibility', activeTileStyle === 'voyager' ? 'visible' : 'none');
  }, [activeTileStyle, mapLoaded]);

  // ─── Handle Flight Animations ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (flightTarget && isTransitioning) {
      isInteractingRef.current = true;
      map.flyTo({
        center: [flightTarget.lng, flightTarget.lat],
        zoom: 12.5,
        pitch: 40,
        bearing: 0,
        speed: 1.2,
        curve: 1.4,
        essential: true,
      });

      const timer = setTimeout(() => {
        arriveAtDestination(flightTarget);
        isInteractingRef.current = false;
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [flightTarget, isTransitioning, mapLoaded, arriveAtDestination]);

  // ─── Render Destination Markers ───
  const allDestinations = useMemo(() => getDestinations(), []);
  const trendingIds = useMemo(() => new Set(getTrendingDestinations().map(d => d.id)), []);

  const filteredDestinations = useMemo(() => {
    if (!filters.types.length && !filters.seasons.length && !filters.budgetTier && !filters.crowdLevel) {
      return allDestinations;
    }
    return getDestinations({
      type: filters.types.length ? filters.types : undefined,
      season: filters.seasons.length ? filters.seasons : undefined,
      budgetTier: filters.budgetTier,
      crowdLevel: filters.crowdLevel,
    });
  }, [allDestinations, filters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // In destination view, show activity markers instead of global pins
    if (isDestinationView && activeDest?.activities) {
      const baseLat = activeDest.lat;
      const baseLng = activeDest.lng;

      activeDest.activities.forEach((act, idx) => {
        // Offset activities slightly around destination center
        const offsetLat = baseLat + (Math.sin(idx * 1.3) * 0.035);
        const offsetLng = baseLng + (Math.cos(idx * 1.3) * 0.045);

        const el = document.createElement('div');
        el.className = 'group cursor-pointer select-none';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 rounded-full bg-surface border border-white/20 shadow-xl flex items-center justify-center text-sm transition-transform duration-200 group-hover:scale-125">
              📍
            </div>
            <div class="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div class="bg-surface/95 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl">
                <span class="text-white">${act.name}</span>
                <span class="text-accent-sky ml-1 font-mono">${act.cost > 0 ? `$${act.cost}` : 'Free'}</span>
              </div>
            </div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([offsetLng, offsetLat])
          .addTo(map);

        markersRef.current.push(marker);
      });
      return;
    }

    // On Globe View: Add clean destination dot pins
    filteredDestinations.forEach(dest => {
      const isTrending = trendingIds.has(dest.id);
      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';

      el.innerHTML = `
        <div class="relative flex items-center justify-center p-2">
          <div class="w-3.5 h-3.5 rounded-full ${
            isTrending ? 'bg-accent-amber border-2 border-white' : 'bg-accent-sky border-2 border-white'
          } shadow-md transition-transform duration-200 group-hover:scale-150"></div>
          <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
            <div class="bg-surface border border-white/10 text-white px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl">
              ${dest.name}
              ${isTrending ? ' 🔥' : ''}
            </div>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        flyToDestination(dest);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([dest.lng, dest.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [filteredDestinations, isDestinationView, activeDest, trendingIds, flyToDestination, mapLoaded]);

  // ─── Update Itinerary Polyline ───
  const allActivities = useMemo(() => {
    if (!days) return [];
    return days.flatMap((d) => d.activities || []);
  }, [days]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource('itinerary-route');
    if (!source) return;

    if (allActivities.length > 1 && activeDest) {
      const baseLat = activeDest.lat;
      const baseLng = activeDest.lng;
      const coords = allActivities.map((_, idx) => [
        baseLng + (Math.cos(idx * 1.3) * 0.045),
        baseLat + (Math.sin(idx * 1.3) * 0.035),
      ]);

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          },
        ],
      });
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [allActivities, activeDest, mapLoaded]);

  // ─── Return to Globe Handler ───
  const handleReturnToGlobe = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      isInteractingRef.current = true;
      map.flyTo({
        center: [15, 20],
        zoom: 1.6,
        pitch: 0,
        bearing: 0,
        speed: 0.9,
        curve: 1.2,
        essential: true,
      });
      setTimeout(() => {
        navigateToGlobe(false);
        isInteractingRef.current = false;
      }, 1800);
    } else {
      navigateToGlobe(false);
    }
  }, [navigateToGlobe]);

  const crowdColor = crowdData ? getCrowdColor(crowdData.level) : '#F59E0B';

  return (
    <ErrorBoundary name="MapLibre Globe">
      <div className="relative w-full h-full bg-[#080C14] overflow-hidden select-none">
        {/* MapLibre Canvas Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* ─── Destination View Overlays (Only visible when zoomed in to destination) ─── */}
        <AnimatePresence>
          {isDestinationView && activeDest && (
            <>
              {/* Top Floating Navigation Island */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute top-0 inset-x-0 z-30 pointer-events-none p-4 sm:p-5"
              >
                <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
                  {/* Left: Back to Globe */}
                  <button
                    onClick={handleReturnToGlobe}
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface/90 border border-white/10 text-white text-sm font-medium hover:border-accent-sky/40 hover:bg-surface-raised transition-all shadow-lg group"
                    title="Return to 3D Globe"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">🌍</span>
                    <span className="font-body">Globe</span>
                  </button>

                  {/* Center: Destination Header Pill */}
                  <div className="pointer-events-auto px-5 py-2.5 rounded-xl bg-surface/90 border border-white/10 shadow-lg flex items-center gap-3">
                    <span className="font-display font-bold text-white text-base sm:text-lg">
                      {activeDest.name}
                    </span>
                    {activeDest.bestTimeToVisit && (
                      <span className="hidden sm:inline-flex text-xs font-mono text-accent-sky bg-accent-sky/10 border border-accent-sky/20 px-2 py-0.5 rounded-full">
                        🗓 {activeDest.bestTimeToVisit}
                      </span>
                    )}
                  </div>

                  {/* Right: Map Layers & Quick Badges */}
                  <div className="pointer-events-auto flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {/* Tile Style Switcher */}
                      <div className="flex items-center bg-surface/90 border border-white/10 rounded-xl p-1 shadow-lg">
                        {[
                          { key: 'satellite', label: '🛰️', title: 'Satellite' },
                          { key: 'dark', label: '🌑', title: 'Dark Matter' },
                          { key: 'voyager', label: '🗺️', title: 'Voyager Atlas' },
                        ].map(s => (
                          <button
                            key={s.key}
                            onClick={() => setActiveTileStyle(s.key)}
                            title={s.title}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                              activeTileStyle === s.key
                                ? 'bg-accent-sky/20 text-accent-sky font-bold border border-accent-sky/30'
                                : 'text-text-secondary hover:text-white'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>

                      {/* Weather Pill */}
                      {weatherData && (
                        <button
                          onClick={() => setShowWeather(!showWeather)}
                          className="px-3.5 py-2 rounded-xl bg-surface/90 border border-white/10 shadow-lg flex items-center gap-2 text-xs font-mono text-white hover:border-white/20 transition-all"
                        >
                          <span>{weatherData.icon || '☀️'}</span>
                          <span>{weatherData.temp}°C</span>
                        </button>
                      )}

                      {/* Crowd Level Badge */}
                      {crowdData && (
                        <button
                          onClick={() => setShowCrowd(!showCrowd)}
                          className="px-3.5 py-2 rounded-xl bg-surface/90 border border-white/10 shadow-lg flex items-center gap-2 text-xs font-mono text-white hover:border-white/20 transition-all"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: crowdColor }}
                          />
                          <span className="capitalize">{crowdData.level} Crowd</span>
                        </button>
                      )}

                      {/* Filter Toggle */}
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-mono transition-all shadow-lg ${
                          showFilters
                            ? 'bg-accent-sky/20 border-accent-sky text-accent-sky font-bold'
                            : 'bg-surface/90 border-white/10 text-text-secondary hover:text-white'
                        }`}
                      >
                        🔍 Filters
                      </button>
                    </div>

                    {/* Expandable Filter Bar */}
                    {showFilters && (
                      <div className="w-full max-w-md bg-surface/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
                        <GlobeFilters />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Bottom Floating Action Dock */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute bottom-5 inset-x-0 z-30 pointer-events-none flex justify-center px-4"
              >
                <div className="pointer-events-auto bg-surface/90 border border-white/10 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1">
                  <button
                    onClick={() => setSelectedPanel(selectedPanel === 'detail' ? null : 'detail')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-body transition-all ${
                      selectedPanel === 'detail'
                        ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>📋</span>
                    <span>Overview</span>
                  </button>

                  <button
                    onClick={onOpenItinerary}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-body text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                  >
                    <span>📅</span>
                    <span>Itinerary ({allActivities.length})</span>
                  </button>

                  <button
                    onClick={onOpenPacking}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-body text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                  >
                    <span>🎒</span>
                    <span>Packing</span>
                  </button>

                  <button
                    onClick={onOpenCompare}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-body text-text-secondary hover:text-white hover:bg-white/5 transition-all"
                  >
                    <span>⚖️</span>
                    <span>Compare</span>
                  </button>
                </div>
              </motion.div>

              {/* Side Detail Panel */}
              <AnimatePresence>
                {selectedPanel === 'detail' && (
                  <DetailPanel
                    destination={activeDest}
                    onClose={() => setSelectedPanel(null)}
                    onOpenItinerary={onOpenItinerary}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Coordinates Indicator */}
        <div className="absolute bottom-3 left-4 z-10 pointer-events-none">
          <div className="bg-surface/80 border border-white/5 rounded-lg px-2.5 py-1 text-[11px] font-mono text-text-secondary/70">
            {activeDest ? `${activeDest.lat.toFixed(4)}°, ${activeDest.lng.toFixed(4)}°` : 'Globe Orbit Mode'}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
