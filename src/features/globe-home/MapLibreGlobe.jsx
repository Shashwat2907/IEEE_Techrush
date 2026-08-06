import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useFilters } from '../../context/FilterContext';
import { useItinerary } from '../../context/ItineraryContext';
import { getDestinations, getTrendingDestinations } from '../../services/destinations';
import { getWeather } from '../../services/weather';
import { getCrowdLevel, getCrowdColor } from '../../services/crowd';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import DetailPanel from '../destination-map/DetailPanel';
import {
  GlobeIcon,
  SatelliteIcon,
  MoonIcon,
  MapIcon,
  SunIcon,
  UsersIcon,
  CalendarIcon,
  OverviewIcon,
  BackpackIcon,
  ScaleIcon,
  PinIcon,
  PlusIcon,
  CloseIcon,
} from '../../components/ui/Icons';

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

// 2D/3D icon components
function FlatMapIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 5v14M16 5v14" />
    </svg>
  );
}

function Globe3DIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3.5 9h17M3.5 15h17" />
    </svg>
  );
}

export default function MapLibreGlobe({ activeDrawer, onToggleDrawer }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const customMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const isInteractingRef = useRef(false);

  const {
    selectedDestination,
    flightTarget,
    isTransitioning,
    arriveAtDestination,
    navigateToGlobe,
    flyToDestination,
    customMarker,
    placeMarker,
    clearMarker,
  } = useApp();

  const { filters } = useFilters();
  const { days, setDestination, addActivity } = useItinerary();

  const [currentZoom, setCurrentZoom] = useState(1.6);
  const [activeTileStyle, setActiveTileStyle] = useState('satellite');
  const [weatherData, setWeatherData] = useState(null);
  const [crowdData, setCrowdData] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null); // 'detail' only — drawers managed by App
  const [mapLoaded, setMapLoaded] = useState(false);
  const [projectionMode, setProjectionMode] = useState('globe'); // 'globe' | 'mercator'
  const [isMobile, setIsMobile] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  const isDestinationView = selectedDestination !== null || (currentZoom >= 6.5 && !isTransitioning);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
      .then((data) => {
        if (isMounted) setWeatherData(data);
      })
      .catch((err) => console.warn('Weather fetch error:', err));

    getCrowdLevel(activeDest.id)
      .then((data) => {
        if (isMounted) setCrowdData(data);
      })
      .catch((err) => console.warn('Crowd level error:', err));

    return () => {
      isMounted = false;
    };
  }, [activeDest]);

  // ─── Initialize MapLibre Globe ───
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        projection: { type: 'globe' },
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
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
    });

    map.on('load', () => {
      map.setProjection({ type: 'globe' });
      setMapLoaded(true);

      // Add itinerary route source & layer
      map.addSource('itinerary-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
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
      const zoom = map.getZoom();
      setCurrentZoom(zoom);

      // Auto projection switching
      if (zoom >= 10 && projectionMode !== 'mercator') {
        try { map.setProjection({ type: 'mercator' }); } catch {}
        setProjectionMode('mercator');
      } else if (zoom < 3 && projectionMode !== 'globe') {
        try { map.setProjection({ type: 'globe' }); } catch {}
        setProjectionMode('globe');
      }
    });

    // Map click → place marker in destination view
    map.on('click', (e) => {
      // Only allow in destination view (when we have an active destination)
      if (!isInteractingRef.current) {
        // We'll handle this with a ref-based check in the click handler effect
      }
    });

    // Auto-spin idle logic
    const handleStartInteract = () => {
      isInteractingRef.current = true;
    };
    const handleEndInteract = () => {
      setTimeout(() => {
        isInteractingRef.current = false;
      }, 1500);
    };

    map.on('mousedown', handleStartInteract);
    map.on('touchstart', handleStartInteract);
    map.on('dragstart', handleStartInteract);
    map.on('mouseup', handleEndInteract);
    map.on('touchend', handleEndInteract);
    map.on('dragend', handleEndInteract);

    mapRef.current = map;

    // Continuous, buttery-smooth idle globe spin
    let lastSpinTime = performance.now();
    const spinGlobe = (now) => {
      const delta = (now - lastSpinTime) / 1000;
      lastSpinTime = now;

      if (
        mapRef.current &&
        !isInteractingRef.current &&
        !isTransitioning &&
        !selectedDestination &&
        !flightTarget &&
        mapRef.current.getZoom() <= 2.8
      ) {
        const center = mapRef.current.getCenter();
        center.lng -= 1.8 * delta;
        mapRef.current.setCenter(center);
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

  // ─── Map click handler for placing custom markers ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = (e) => {
      // Only allow marker placement when in destination view
      if (selectedDestination && !isTransitioning) {
        const { lng, lat } = e.lngLat;
        placeMarker({
          lat,
          lng,
          name: `Pin at ${lat.toFixed(3)}°, ${lng.toFixed(3)}°`,
        });
      }
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [selectedDestination, isTransitioning, mapLoaded, placeMarker]);

  // ─── Render custom marker on map ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Remove previous custom marker
    if (customMarkerRef.current) {
      customMarkerRef.current.remove();
      customMarkerRef.current = null;
    }

    if (customMarker) {
      const el = document.createElement('div');
      el.className = 'custom-map-marker';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-accent-sky/30 animate-ping absolute"></div>
          <div class="w-5 h-5 rounded-full bg-accent-sky border-2 border-white shadow-lg relative z-10"></div>
        </div>
      `;

      customMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([customMarker.lng, customMarker.lat])
        .addTo(map);
    }
  }, [customMarker, mapLoaded]);

  // ─── Handle Tile Style Switching ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const styles = ['satellite', 'dark', 'voyager'];
    styles.forEach((style) => {
      const layerId = `${style}-layer`;
      try {
        map.setLayoutProperty(layerId, 'visibility', activeTileStyle === style ? 'visible' : 'none');
      } catch (err) {
        // Layer might not exist yet
      }
    });
  }, [activeTileStyle, mapLoaded]);

  // ─── Manual Projection Toggle ───
  const toggleProjection = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const newMode = projectionMode === 'globe' ? 'mercator' : 'globe';
    try { map.setProjection({ type: newMode }); } catch {}
    setProjectionMode(newMode);
  }, [projectionMode]);

  // ─── Seamless Slow-to-Fast Camera Flight Easing ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (flightTarget && isTransitioning) {
      isInteractingRef.current = true;

      // Switch to mercator for the destination zoom level
      try { map.setProjection({ type: 'mercator' }); } catch {}
      setProjectionMode('mercator');

      map.flyTo({
        center: [flightTarget.lng, flightTarget.lat],
        zoom: 12.5,
        pitch: 42,
        bearing: 0,
        speed: 0.85,
        curve: 1.4,
        easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
        essential: true,
      });

      const timer = setTimeout(() => {
        arriveAtDestination(flightTarget);
        isInteractingRef.current = false;
      }, 2600);

      return () => clearTimeout(timer);
    }
  }, [flightTarget, isTransitioning, mapLoaded, arriveAtDestination]);

  // ─── Render Destination Markers ───
  const allDestinations = useMemo(() => getDestinations(), []);
  const trendingIds = useMemo(() => new Set(getTrendingDestinations().map((d) => d.id)), []);

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
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // In destination view, show activity markers instead of global pins
    if (isDestinationView && activeDest?.activities) {
      const baseLat = activeDest.lat;
      const baseLng = activeDest.lng;

      activeDest.activities.forEach((act, idx) => {
        const offsetLat = baseLat + Math.sin(idx * 1.3) * 0.035;
        const offsetLng = baseLng + Math.cos(idx * 1.3) * 0.045;

        const el = document.createElement('div');
        el.className = 'group cursor-pointer select-none';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-7 h-7 rounded-full bg-surface border border-accent-sky/40 shadow-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
              <span class="w-2.5 h-2.5 rounded-full bg-accent-sky"></span>
            </div>
            <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div class="bg-surface/95 border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shadow-2xl">
                <span class="text-white">${act.name}</span>
                <span class="text-accent-sky ml-1.5 font-mono">${act.cost > 0 ? `$${act.cost}` : 'Free'}</span>
              </div>
            </div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([offsetLng, offsetLat])
          .addTo(map);

        markersRef.current.push(marker);
      });
      return;
    }

    // On Globe View: Add minimalist destination dot pins
    filteredDestinations.forEach((dest) => {
      const isTrending = trendingIds.has(dest.id);
      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';

      el.innerHTML = `
        <div class="relative flex items-center justify-center p-2">
          <div class="w-3 h-3 rounded-full ${
            isTrending ? 'bg-accent-amber border-2 border-white' : 'bg-accent-sky border-2 border-white'
          } shadow-md transition-transform duration-200 group-hover:scale-150"></div>
          <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
            <div class="bg-surface/95 border border-white/10 text-white px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap shadow-xl flex items-center gap-1.5">
              <span>${dest.name}</span>
              ${isTrending ? '<span class="text-[10px] text-accent-amber font-mono">TRENDING</span>' : ''}
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
        baseLng + Math.cos(idx * 1.3) * 0.045,
        baseLat + Math.sin(idx * 1.3) * 0.035,
      ]);

      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
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
      try { map.setProjection({ type: 'globe' }); } catch {}
      setProjectionMode('globe');
      map.flyTo({
        center: [15, 20],
        zoom: 1.6,
        pitch: 0,
        bearing: 0,
        speed: 0.9,
        curve: 1.2,
        easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
        essential: true,
      });
      setTimeout(() => {
        navigateToGlobe(false);
        isInteractingRef.current = false;
        setSelectedPanel(null);
      }, 1900);
    } else {
      navigateToGlobe(false);
    }
  }, [navigateToGlobe]);

  // Add custom marker location to itinerary
  const handleAddMarkerToItinerary = useCallback(() => {
    if (!customMarker) return;
    const targetDay = days?.[0];
    if (targetDay) {
      addActivity(targetDay.id, {
        name: customMarker.name,
        durationHrs: 1,
        cost: 0,
      });
    }
    onToggleDrawer('itinerary');
    clearMarker();
  }, [customMarker, days, addActivity, onToggleDrawer, clearMarker]);

  const crowdColor = crowdData ? getCrowdColor(crowdData.level) : '#F59E0B';

  return (
    <ErrorBoundary name="MapLibre Globe">
      <div className="relative w-full h-full bg-[#080C14] overflow-hidden select-none">
        {/* MapLibre Canvas Container — fullscreen */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* ─── Custom Marker Floating Action ─── */}
        <AnimatePresence>
          {customMarker && isDestinationView && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25 }}
              className="absolute top-4 inset-x-0 z-40 pointer-events-none flex justify-center px-4"
            >
              <div className="pointer-events-auto bg-surface/95 backdrop-blur-xl border border-accent-sky/30 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center gap-3 max-w-sm">
                <PinIcon className="w-5 h-5 text-accent-sky flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-body font-medium truncate">{customMarker.name}</p>
                  <p className="text-text-secondary text-[10px] font-mono mt-0.5">Tap to add to itinerary</p>
                </div>
                <button
                  onClick={handleAddMarkerToItinerary}
                  className="px-3 py-1.5 rounded-lg bg-accent-sky/20 text-accent-sky text-xs font-mono font-semibold hover:bg-accent-sky/30 transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add
                </button>
                <button
                  onClick={clearMarker}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Destination View Overlays ─── */}
        <AnimatePresence>
          {isDestinationView && activeDest && (
            <>
              {/* Top Floating Navigation Island */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute top-0 inset-x-0 z-30 pointer-events-none p-3 sm:p-4"
              >
                <div className="max-w-7xl mx-auto flex items-start justify-between gap-2 sm:gap-3">
                  {/* Left: Back to Globe */}
                  <button
                    onClick={handleReturnToGlobe}
                    className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-surface/90 border border-white/10 text-white text-xs sm:text-sm font-medium hover:border-accent-sky/40 hover:bg-surface-raised transition-all shadow-lg group flex-shrink-0"
                    title="Return to 3D Globe"
                  >
                    <GlobeIcon className="w-4 h-4 text-accent-sky group-hover:scale-110 transition-transform" />
                    <span className="font-body hidden sm:inline">Globe</span>
                  </button>

                  {/* Center: Destination Name (no day/month) */}
                  <div className="pointer-events-auto px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-surface/90 border border-white/10 shadow-lg flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="font-display font-bold text-white text-sm sm:text-base lg:text-lg truncate">
                      {activeDest.name}
                    </span>
                  </div>

                  {/* Right: Controls */}
                  <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {/* 2D/3D Toggle */}
                    <button
                      onClick={toggleProjection}
                      title={projectionMode === 'globe' ? 'Switch to 2D Map' : 'Switch to 3D Globe'}
                      className="p-2 rounded-xl bg-surface/90 border border-white/10 text-text-secondary hover:text-white shadow-lg transition-all"
                    >
                      {projectionMode === 'globe' ? (
                        <FlatMapIcon className="w-4 h-4" />
                      ) : (
                        <Globe3DIcon className="w-4 h-4" />
                      )}
                    </button>

                    {/* Tile Style Switcher */}
                    <div className="hidden sm:flex items-center bg-surface/90 border border-white/10 rounded-xl p-1 shadow-lg">
                      {[
                        { key: 'satellite', icon: <SatelliteIcon className="w-4 h-4" />, title: 'Satellite' },
                        { key: 'dark', icon: <MoonIcon className="w-4 h-4" />, title: 'Dark' },
                        { key: 'voyager', icon: <MapIcon className="w-4 h-4" />, title: 'Street' },
                      ].map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setActiveTileStyle(s.key)}
                          title={s.title}
                          className={`p-1.5 sm:p-2 rounded-lg text-xs font-mono transition-all ${
                            activeTileStyle === s.key
                              ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                              : 'text-text-secondary hover:text-white'
                          }`}
                        >
                          {s.icon}
                        </button>
                      ))}
                    </div>

                    {/* Mobile: Combined settings toggle */}
                    <button
                      onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
                      className="sm:hidden p-2 rounded-xl bg-surface/90 border border-white/10 text-text-secondary hover:text-white shadow-lg transition-all"
                    >
                      <MapIcon className="w-4 h-4" />
                    </button>

                    {/* Weather & Crowd — desktop only */}
                    {weatherData && (
                      <div className="hidden md:flex px-3 py-2 rounded-xl bg-surface/90 border border-white/10 shadow-lg items-center gap-2 text-xs font-mono text-white">
                        <SunIcon className="w-4 h-4 text-accent-amber" />
                        <span>{weatherData.temp}°C</span>
                      </div>
                    )}

                    {crowdData && (
                      <div className="hidden md:flex px-3 py-2 rounded-xl bg-surface/90 border border-white/10 shadow-lg items-center gap-2 text-xs font-mono text-white">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: crowdColor }} />
                        <span className="capitalize">{crowdData.level}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile expanded controls */}
                <AnimatePresence>
                  {mobileControlsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="sm:hidden pointer-events-auto mt-2 bg-surface/95 border border-white/10 rounded-xl p-3 shadow-xl mx-auto max-w-xs"
                    >
                      {/* Tile switcher */}
                      <div className="flex items-center gap-1.5 mb-2">
                        {[
                          { key: 'satellite', icon: <SatelliteIcon className="w-4 h-4" />, label: 'Satellite' },
                          { key: 'dark', icon: <MoonIcon className="w-4 h-4" />, label: 'Dark' },
                          { key: 'voyager', icon: <MapIcon className="w-4 h-4" />, label: 'Street' },
                        ].map((s) => (
                          <button
                            key={s.key}
                            onClick={() => setActiveTileStyle(s.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
                              activeTileStyle === s.key
                                ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                                : 'text-text-secondary bg-white/5'
                            }`}
                          >
                            {s.icon}
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                      {/* Weather & crowd on mobile */}
                      <div className="flex items-center gap-2">
                        {weatherData && (
                          <div className="flex-1 flex items-center gap-1.5 text-xs font-mono text-white bg-white/5 rounded-lg px-2 py-1.5">
                            <SunIcon className="w-3.5 h-3.5 text-accent-amber" />
                            <span>{weatherData.temp}°C</span>
                          </div>
                        )}
                        {crowdData && (
                          <div className="flex-1 flex items-center gap-1.5 text-xs font-mono text-white bg-white/5 rounded-lg px-2 py-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: crowdColor }} />
                            <span className="capitalize">{crowdData.level}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Bottom Floating Action Dock */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute bottom-3 sm:bottom-5 inset-x-0 z-30 pointer-events-none flex justify-center px-3 sm:px-4"
              >
                <div className="pointer-events-auto bg-surface/90 border border-white/10 rounded-2xl p-1 sm:p-1.5 shadow-2xl flex items-center gap-0.5 sm:gap-1">
                  {[
                    {
                      key: 'detail',
                      icon: <OverviewIcon className="w-4 h-4" />,
                      label: 'Overview',
                      isLocal: true,
                    },
                    {
                      key: 'itinerary',
                      icon: <CalendarIcon className="w-4 h-4" />,
                      label: `Itinerary`,
                      count: allActivities.length,
                    },
                    {
                      key: 'packing',
                      icon: <BackpackIcon className="w-4 h-4" />,
                      label: 'Packing',
                    },
                    {
                      key: 'compare',
                      icon: <ScaleIcon className="w-4 h-4" />,
                      label: 'Compare',
                    },
                  ].map((item) => {
                    const isActive = item.isLocal
                      ? selectedPanel === item.key
                      : activeDrawer === item.key;

                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          if (item.isLocal) {
                            // Overview panel is managed locally
                            setSelectedPanel((prev) => (prev === item.key ? null : item.key));
                            // Close any drawer when opening overview
                            if (activeDrawer) onToggleDrawer(activeDrawer);
                          } else {
                            // Drawers are managed by App.jsx
                            onToggleDrawer(item.key);
                            // Close local overview panel when opening a drawer
                            setSelectedPanel(null);
                          }
                        }}
                        className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold font-body transition-all ${
                          isActive
                            ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                            : 'text-text-secondary hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {item.icon}
                        <span className="hidden sm:inline">{item.label}</span>
                        {item.count > 0 && (
                          <span className="text-[9px] font-mono bg-accent-sky/20 text-accent-sky px-1.5 py-0.5 rounded-full">
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Side Detail Panel (local, not a drawer) */}
              <AnimatePresence>
                {selectedPanel === 'detail' && (
                  <DetailPanel
                    destination={activeDest}
                    weatherData={weatherData}
                    crowdData={crowdData}
                    onClose={() => setSelectedPanel(null)}
                    onPlanTrip={() => {
                      setSelectedPanel(null);
                      onToggleDrawer('itinerary');
                    }}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Coordinates Indicator */}
        {!isMobile && (
          <div className="absolute bottom-3 left-4 z-10 pointer-events-none">
            <div className="bg-surface/80 border border-white/5 rounded-lg px-2.5 py-1 text-[11px] font-mono text-text-secondary/70">
              {activeDest ? `${activeDest.lat.toFixed(4)}°, ${activeDest.lng.toFixed(4)}°` : 'Globe Orbit Mode'}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
