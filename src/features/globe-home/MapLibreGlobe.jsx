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
import { reverseGeocode } from '../../services/geocode';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import DetailPanel from '../destination-map/DetailPanel';
import {
  GlobeIcon,
  SatelliteIcon,
  MoonIcon,
  MapIcon,
  SunIcon,
  CalendarIcon,
  OverviewIcon,
  BackpackIcon,
  ScaleIcon,
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
  const activePopupRef = useRef(null);
  const animFrameRef = useRef(null);
  const isInteractingRef = useRef(false);

  const {
    selectedDestination,
    flightTarget,
    isTransitioning,
    arriveAtDestination,
    navigateToGlobe,
    flyToDestination,
    placeMarker,
    clearMarker,
  } = useApp();

  const { filters } = useFilters();
  const { days, tripDays, setDestination, addActivity } = useItinerary();

  const [currentZoom, setCurrentZoom] = useState(1.6);
  const [activeTileStyle, setActiveTileStyle] = useState('satellite');
  const [weatherData, setWeatherData] = useState(null);
  const [crowdData, setCrowdData] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null); // 'detail' only
  const [mapLoaded, setMapLoaded] = useState(false);
  const [projectionMode, setProjectionMode] = useState('globe'); // 'globe' | 'mercator'
  const [isMobile, setIsMobile] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  // Destination view is strictly active when selectedDestination is set and flight has arrived
  const isDestinationView = selectedDestination !== null && !isTransitioning;

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

  // Fetch weather and crowd data for destination
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

  // ─── Initialize MapLibre Map / Globe ───
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

      // Auto projection switching on extreme manual zoom
      if (zoom >= 10 && projectionMode !== 'mercator') {
        try { map.setProjection({ type: 'mercator' }); } catch {}
        setProjectionMode('mercator');
      } else if (zoom < 3 && projectionMode !== 'globe') {
        try { map.setProjection({ type: 'globe' }); } catch {}
        setProjectionMode('globe');
      }
    });

    // Auto-spin idle logic
    const handleStartInteract = () => {
      isInteractingRef.current = true;
    };
    const handleEndInteract = () => {
      setTimeout(() => {
        isInteractingRef.current = false;
      }, 2000);
    };

    map.on('mousedown', handleStartInteract);
    map.on('touchstart', handleStartInteract);
    map.on('dragstart', handleStartInteract);
    map.on('mouseup', handleEndInteract);
    map.on('touchend', handleEndInteract);
    map.on('dragend', handleEndInteract);

    mapRef.current = map;

    // Smooth idle globe spin (only active when zoomed out on globe)
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
      if (activePopupRef.current) activePopupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

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

  // ─── Manual Projection Toggle (2D / 3D) ───
  const toggleProjection = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const newMode = projectionMode === 'globe' ? 'mercator' : 'globe';
    try { map.setProjection({ type: newMode }); } catch {}
    setProjectionMode(newMode);
  }, [projectionMode]);

  // ─── Seamless Camera Flight: Full Zoom to Destination ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (flightTarget && isTransitioning) {
      isInteractingRef.current = true;

      // Close open popups & markers
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
      if (customMarkerRef.current) {
        customMarkerRef.current.remove();
        customMarkerRef.current = null;
      }

      // Switch to mercator for detailed city street/satellite level
      try { map.setProjection({ type: 'mercator' }); } catch {}
      setProjectionMode('mercator');

      let completed = false;
      const onFlightComplete = () => {
        if (completed) return;
        completed = true;
        arriveAtDestination(flightTarget);
        isInteractingRef.current = false;
      };

      // Fly camera directly into the destination with smooth cinematic curve
      map.flyTo({
        center: [flightTarget.lng, flightTarget.lat],
        zoom: 13.2,
        pitch: 42,
        bearing: 0,
        speed: 1.15,
        curve: 1.4,
        essential: true,
      });

      // ONLY transition UI after camera has completely arrived and finished zooming
      map.once('moveend', onFlightComplete);

      // Safety timeout fallback
      const timer = setTimeout(onFlightComplete, 4500);

      return () => {
        clearTimeout(timer);
        map.off('moveend', onFlightComplete);
      };
    }
  }, [flightTarget, isTransitioning, mapLoaded, arriveAtDestination]);

  // ─── Custom Pin Placement & Real Interactive Popup ───
  const createPinPopupContent = useCallback(
    (pinData, onAdd, onRemove) => {
      const container = document.createElement('div');
      container.className = 'custom-pin-card flex flex-col gap-2.5 text-left';

      const availableDays = days && days.length > 0 ? days : [{ id: 1, name: 'Day 1' }];
      let selectedDayId = availableDays[0].id;
      let durationHrs = 1.5;
      let cost = 0;

      container.innerHTML = `
        <div class="flex items-start gap-2 border-b border-white/10 pb-2">
          <div class="w-7 h-7 rounded-lg bg-accent-sky/20 border border-accent-sky/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg class="w-4 h-4 text-accent-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0 pr-4">
            <h4 class="text-white text-sm font-semibold truncate pin-title">${pinData.name || 'Custom Pin'}</h4>
            <p class="text-text-secondary text-[11px] font-mono truncate pin-address">${pinData.address || `${pinData.lat.toFixed(4)}°, ${pinData.lng.toFixed(4)}°`}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-mono uppercase text-text-secondary">Add to Day</label>
          <div class="flex flex-wrap gap-1 day-selector-container">
            ${availableDays
              .map(
                (d, i) => `
                <button type="button" data-day="${d.id}" class="day-chip px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                  i === 0
                    ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/40 font-semibold'
                    : 'bg-white/5 text-text-secondary hover:text-white border border-white/5'
                }">
                  Day ${d.id.toString().replace('day-', '')}
                </button>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label class="text-[10px] font-mono uppercase text-text-secondary">Duration</label>
            <select class="duration-select w-full mt-0.5 bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-accent-sky">
              <option value="1">1 hour</option>
              <option value="1.5" selected>1.5 hours</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
              <option value="4">Half Day</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] font-mono uppercase text-text-secondary">Est. Cost</label>
            <input type="number" min="0" value="0" placeholder="$0" class="cost-input w-full mt-0.5 bg-surface-raised border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-accent-sky" />
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-white/10">
          <button type="button" class="add-itinerary-btn flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent-sky text-slate-950 text-xs font-semibold font-body hover:bg-sky-400 active:scale-95 transition-all shadow-md shadow-accent-sky/20">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add to Itinerary
          </button>
          <button type="button" class="remove-pin-btn p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-text-secondary hover:text-red-400 border border-white/5 transition-colors" title="Remove Pin">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      `;

      // Day chip selection
      const dayChips = container.querySelectorAll('.day-chip');
      dayChips.forEach((chip) => {
        chip.addEventListener('click', () => {
          dayChips.forEach((c) => {
            c.className = 'day-chip px-2.5 py-1 rounded-lg text-xs font-mono transition-colors bg-white/5 text-text-secondary hover:text-white border border-white/5';
          });
          chip.className = 'day-chip px-2.5 py-1 rounded-lg text-xs font-mono transition-colors bg-accent-sky/20 text-accent-sky border border-accent-sky/40 font-semibold';
          selectedDayId = chip.getAttribute('data-day') || availableDays[0].id;
        });
      });

      // Duration and cost changes
      const durationSelect = container.querySelector('.duration-select');
      durationSelect.addEventListener('change', (e) => {
        durationHrs = parseFloat(e.target.value) || 1;
      });

      const costInput = container.querySelector('.cost-input');
      costInput.addEventListener('input', (e) => {
        cost = parseFloat(e.target.value) || 0;
      });

      // Add to itinerary handler
      const addBtn = container.querySelector('.add-itinerary-btn');
      addBtn.addEventListener('click', () => {
        addBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Added!
        `;
        addBtn.className = 'add-itinerary-btn flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-bold font-body transition-all';

        onAdd({
          name: pinData.name || 'Custom Location',
          durationHrs,
          cost,
          dayId: selectedDayId,
          lat: pinData.lat,
          lng: pinData.lng,
        });
      });

      // Remove pin handler
      const removeBtn = container.querySelector('.remove-pin-btn');
      removeBtn.addEventListener('click', () => {
        onRemove();
      });

      return container;
    },
    [days]
  );

  // ─── Map Click Handler for Dropping Custom Pins ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = async (e) => {
      // Only drop pins when destination view is active and map is not flying
      if (!isDestinationView || isTransitioning) return;

      const { lng, lat } = e.lngLat;

      // Center map slightly around the clicked pin
      map.easeTo({ center: [lng, lat], duration: 400 });

      // Clean up previous marker & popup
      if (customMarkerRef.current) customMarkerRef.current.remove();
      if (activePopupRef.current) activePopupRef.current.remove();

      // Create animated custom pin element
      const pinEl = document.createElement('div');
      pinEl.className = 'custom-map-marker cursor-pointer select-none';
      pinEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-accent-sky/40 animate-ping absolute"></div>
          <div class="w-5 h-5 rounded-full bg-accent-sky border-2 border-white shadow-xl flex items-center justify-center relative z-10">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: pinEl, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      customMarkerRef.current = marker;

      // Initial placeholder data while reverse geocoding
      const pinData = {
        lat,
        lng,
        name: 'Locating place...',
        address: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
      };

      placeMarker(pinData);

      // Create and open interactive popup
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 20,
        className: 'custom-pin-popup',
      });

      const handleAdd = (activityData) => {
        addActivity(activityData.dayId, {
          name: activityData.name,
          durationHrs: activityData.durationHrs,
          cost: activityData.cost,
          lat: activityData.lat,
          lng: activityData.lng,
        });
        onToggleDrawer('itinerary');
        setTimeout(() => {
          popup.remove();
        }, 800);
      };

      const handleRemove = () => {
        marker.remove();
        popup.remove();
        customMarkerRef.current = null;
        activePopupRef.current = null;
        clearMarker();
      };

      const popupNode = createPinPopupContent(pinData, handleAdd, handleRemove);
      popup.setLngLat([lng, lat]).setDOMContent(popupNode).addTo(map);
      activePopupRef.current = popup;

      // Reverse geocode to get REAL location / attraction / street name
      try {
        const geoResult = await reverseGeocode(lat, lng);
        if (geoResult && geoResult.name) {
          pinData.name = geoResult.name;
          pinData.address = geoResult.displayName || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
          placeMarker(pinData);

          const titleEl = popupNode.querySelector('.pin-title');
          const addrEl = popupNode.querySelector('.pin-address');
          if (titleEl) titleEl.textContent = geoResult.name;
          if (addrEl) addrEl.textContent = geoResult.displayName || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        }
      } catch (err) {
        console.warn('Reverse geocode error:', err);
      }
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [
    isDestinationView,
    isTransitioning,
    mapLoaded,
    placeMarker,
    clearMarker,
    addActivity,
    onToggleDrawer,
    createPinPopupContent,
  ]);

  // ─── Render Suggested Activity Markers in Destination View ───
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

    // Clear previous destination markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // In Destination View: Show rich interactive activity markers with popups
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
            <div class="w-7 h-7 rounded-full bg-surface border border-accent-sky/60 shadow-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
              <span class="w-2.5 h-2.5 rounded-full bg-accent-sky"></span>
            </div>
            <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div class="bg-surface/95 border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shadow-2xl">
                <span>${act.name}</span>
                <span class="text-accent-sky ml-1.5 font-mono">${act.cost > 0 ? `$${act.cost}` : 'Free'}</span>
              </div>
            </div>
          </div>
        `;

        // Interactive popup on clicking activity marker
        el.addEventListener('click', (e) => {
          e.stopPropagation();

          if (activePopupRef.current) activePopupRef.current.remove();

          const targetDay = days?.[0] || { id: 1 };
          const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            offset: 18,
            className: 'activity-marker-popup',
          });

          const popupContent = document.createElement('div');
          popupContent.className = 'flex flex-col gap-2.5 text-left';
          popupContent.innerHTML = `
            <div class="border-b border-white/10 pb-2">
              <h4 class="text-white text-sm font-semibold">${act.name}</h4>
              <p class="text-text-secondary text-[11px] font-mono mt-0.5">
                ⏱ ${act.durationHrs || 2}h · 💰 ${act.cost > 0 ? `$${act.cost}` : 'Free'}
              </p>
            </div>
            <button type="button" class="add-act-btn w-full py-2 rounded-xl bg-accent-sky text-slate-950 text-xs font-semibold font-body hover:bg-sky-400 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-accent-sky/20">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add to Day 1
            </button>
          `;

          const addActBtn = popupContent.querySelector('.add-act-btn');
          addActBtn.addEventListener('click', () => {
            addActivity(targetDay.id, {
              name: act.name,
              durationHrs: act.durationHrs || 2,
              cost: act.cost || 0,
              lat: offsetLat,
              lng: offsetLng,
            });
            onToggleDrawer('itinerary');
            popup.remove();
          });

          popup.setLngLat([offsetLng, offsetLat]).setDOMContent(popupContent).addTo(map);
          activePopupRef.current = popup;
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([offsetLng, offsetLat])
          .addTo(map);

        markersRef.current.push(marker);
      });
      return;
    }

    // On Globe View: Add minimalist clickable destination dot pins
    if (!isDestinationView) {
      filteredDestinations.forEach((dest) => {
        const isTrending = trendingIds.has(dest.id);
        const el = document.createElement('div');
        el.className = 'group cursor-pointer select-none';

        el.innerHTML = `
          <div class="relative flex items-center justify-center p-2">
            <div class="w-3.5 h-3.5 rounded-full ${
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
    }
  }, [
    filteredDestinations,
    isDestinationView,
    activeDest,
    trendingIds,
    flyToDestination,
    mapLoaded,
    days,
    addActivity,
    onToggleDrawer,
  ]);

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
      // Remove popups and custom pins
      if (activePopupRef.current) activePopupRef.current.remove();
      if (customMarkerRef.current) customMarkerRef.current.remove();
      setSelectedPanel(null);
      onToggleDrawer(null);

      isInteractingRef.current = true;
      try { map.setProjection({ type: 'globe' }); } catch {}
      setProjectionMode('globe');

      let completed = false;
      const onGlobeArrival = () => {
        if (completed) return;
        completed = true;
        navigateToGlobe(false);
        isInteractingRef.current = false;
      };

      map.flyTo({
        center: [15, 20],
        zoom: 1.6,
        pitch: 0,
        bearing: 0,
        speed: 1.1,
        curve: 1.2,
        essential: true,
      });

      map.once('moveend', onGlobeArrival);
      setTimeout(onGlobeArrival, 4000);
    } else {
      navigateToGlobe(false);
    }
  }, [navigateToGlobe, onToggleDrawer]);

  const crowdColor = crowdData ? getCrowdColor(crowdData.level) : '#F59E0B';

  return (
    <ErrorBoundary name="MapLibre Globe">
      <div className="relative w-full h-full bg-[#080C14] overflow-hidden select-none">
        {/* MapLibre Canvas Container — fullscreen */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* ─── Destination View Overlays (Only rendered once flight is 100% completed) ─── */}
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

                  {/* Center: Destination Name */}
                  <div className="pointer-events-auto px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-surface/90 border border-white/10 shadow-lg flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="font-display font-bold text-white text-sm sm:text-base lg:text-lg truncate">
                      {activeDest.name}
                    </span>
                  </div>

                  {/* Right: Map Controls */}
                  <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {/* 2D / 3D Projection Toggle */}
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

                    {/* Weather & Crowd — desktop */}
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
                            setSelectedPanel((prev) => (prev === item.key ? null : item.key));
                            if (activeDrawer) onToggleDrawer(activeDrawer);
                          } else {
                            onToggleDrawer(item.key);
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

              {/* Side Detail Panel (local overview) */}
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
        {!isMobile && isDestinationView && (
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
