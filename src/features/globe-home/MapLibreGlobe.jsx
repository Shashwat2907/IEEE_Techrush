import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import { getDestinations, getTrendingDestinations } from '../../services/destinations';
import { reverseGeocode } from '../../services/geocode';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import {
  GlobeIcon,
  CalendarIcon,
  OverviewIcon,
  BackpackIcon,
  DollarIcon,
  SunIcon,
  MoonIcon,
} from '../../components/ui/Icons';

// Tile sources
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

export default function MapLibreGlobe({ activeDrawer, onOpenDrawer, onToggleDrawer }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const customMarkerRef = useRef(null);
  const activePopupRef = useRef(null);
  const animFrameRef = useRef(null);
  const isInteractingRef = useRef(false);
  const pointerDownRef = useRef({ x: 0, y: 0, time: 0 });

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

  const { isDark, toggleTheme, setTheme } = useTheme();

  const selectedDestRef = useRef(selectedDestination);
  selectedDestRef.current = selectedDestination;
  const flightTargetRef = useRef(flightTarget);
  flightTargetRef.current = flightTarget;
  const isTransitioningRef = useRef(isTransitioning);
  isTransitioningRef.current = isTransitioning;

  const { days, setDestination, addActivity } = useItinerary();
  const { formatPrice } = useCurrency();

  const [activeTileStyle, setActiveTileStyle] = useState('satellite');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [viewDimension, setViewDimension] = useState('2D');

  const isDestinationView = selectedDestination !== null && !isTransitioning;

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

  // Canvas resize on drawer toggle
  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current.resize();
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeDrawer]);

  // ─── Initialize MapLibre ───
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
          'sky-color': '#0a1128',
          'sky-horizon-blend': 0.3,
          'horizon-color': '#0a1128',
          'horizon-fog-blend': 0.5,
          'fog-color': '#0a1128',
          'fog-ground-blend': 0.3,
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
    });

    map.on('load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {}
      setMapLoaded(true);

      // Route vector line
      map.addSource('itinerary-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'itinerary-line',
        type: 'line',
        source: 'itinerary-route',
        paint: {
          'line-color': '#FF5500',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });
    });

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

    let lastSpinTime = performance.now();
    const spinGlobe = (now) => {
      const delta = (now - lastSpinTime) / 1000;
      lastSpinTime = now;

      if (
        mapRef.current &&
        !isInteractingRef.current &&
        !isTransitioningRef.current &&
        !selectedDestRef.current &&
        !flightTargetRef.current &&
        mapRef.current.getZoom() <= 2.6
      ) {
        const center = mapRef.current.getCenter();
        center.lng = (center.lng - 1.8 * delta) % 360;
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

  // ─── Tile layer & Theme Synchronization ───
  const handleSelectTileStyle = useCallback(
    (styleKey) => {
      setActiveTileStyle(styleKey);
      if (styleKey === 'voyager') {
        setTheme('light');
      } else {
        setTheme('dark');
      }
    },
    [setTheme]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    ['satellite-layer', 'dark-layer', 'voyager-layer'].forEach((id) => {
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch {}
    });

    const targetLayer =
      activeTileStyle === 'satellite'
        ? 'satellite-layer'
        : activeTileStyle === 'dark'
        ? 'dark-layer'
        : 'voyager-layer';

    try {
      map.setLayoutProperty(targetLayer, 'visibility', 'visible');
    } catch {}
  }, [activeTileStyle, mapLoaded]);

  // ─── 2D / 3D Camera Toggle ───
  const handleToggleDimension = useCallback(
    (targetDim) => {
      const map = mapRef.current;
      if (!map) return;

      const nextDim = targetDim || (viewDimension === '2D' ? '3D' : '2D');
      setViewDimension(nextDim);

      try {
        if (nextDim === '3D') {
          map.setProjection({ type: 'globe' });
          map.easeTo({
            pitch: 58,
            bearing: -18,
            duration: 600,
          });
        } else {
          map.easeTo({
            pitch: 0,
            bearing: 0,
            duration: 600,
          });
          map.setProjection({ type: 'mercator' });
        }
      } catch (err) {
        console.warn('Dimension toggle error:', err);
      }
    },
    [viewDimension]
  );

  // ─── Camera Flight ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !flightTarget || !isTransitioning) return;

    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const targetZoom = 12.8;
    const targetPitch = viewDimension === '3D' ? 58 : 0;
    const targetBearing = viewDimension === '3D' ? -18 : 0;

    map.flyTo({
      center: [flightTarget.lng, flightTarget.lat],
      zoom: targetZoom,
      pitch: targetPitch,
      bearing: targetBearing,
      duration: 2200,
      essential: true,
    });

    const handleMoveEnd = () => {
      map.off('moveend', handleMoveEnd);
      arriveAtDestination(flightTarget);
      if (onOpenDrawer) {
        onOpenDrawer('overview');
      } else if (onToggleDrawer) {
        onToggleDrawer('overview');
      }
    };

    map.on('moveend', handleMoveEnd);
    return () => map.off('moveend', handleMoveEnd);
  }, [flightTarget, isTransitioning, mapLoaded, arriveAtDestination, onOpenDrawer, onToggleDrawer, viewDimension]);

  // ─── Return to Globe View ───
  const handleReturnToGlobe = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    try {
      map.setProjection({ type: 'globe' });
    } catch {}

    map.flyTo({
      center: [15, 20],
      zoom: 1.6,
      pitch: 0,
      bearing: 0,
      duration: 1600,
      essential: true,
    });

    setViewDimension('2D');
    onToggleDrawer(null);
    navigateToGlobe(false);
  }, [navigateToGlobe, onToggleDrawer]);

  // Pointer tracking
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const onPointerDown = (e) => {
      pointerDownRef.current = {
        x: e.point.x,
        y: e.point.y,
        time: Date.now(),
      };
    };

    map.on('mousedown', onPointerDown);
    map.on('touchstart', onPointerDown);

    return () => {
      map.off('mousedown', onPointerDown);
      map.off('touchstart', onPointerDown);
    };
  }, [mapLoaded]);

  // ─── Tactile Pin Popup Content ───
  const createPinPopupContent = useCallback(
    (pinData, onAdd, onRemove) => {
      const container = document.createElement('div');
      container.className = 'font-sans select-none space-y-3 w-full p-0.5';

      const availableDays = days && days.length > 0 ? days : [{ id: 'day-1', dayNumber: 1 }];
      let selectedDayId = availableDays[0].id;
      let durationHrs = 1.5;
      let cost = 0;

      container.innerHTML = `
        <div class="border-b border-black/10 dark:border-white/10 pb-2.5">
          <div class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">WAYPOINT</div>
          <h4 class="pin-title font-sans text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">${
            pinData.name || 'Custom Waypoint'
          }</h4>
          <p class="pin-address text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">${
            pinData.address || ''
          }</p>
        </div>

        <div>
          <label class="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">ASSIGN TO DAY</label>
          <div class="day-chips-row flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            ${availableDays
              .map(
                (d, idx) => `
                <button type="button" data-day="${d.id}" class="day-chip px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  idx === 0
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black font-bold shadow-sm'
                    : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-zinc-300 border border-black/10 dark:border-white/15 hover:text-black dark:hover:text-white'
                }">
                  Day ${d.dayNumber || idx + 1}
                </button>
              `
              )
              .join('')}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">DURATION</label>
            <select class="duration-select w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 rounded-full px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none cursor-pointer">
              <option value="1">1.0 Hour</option>
              <option value="1.5" selected>1.5 Hours</option>
              <option value="2">2.0 Hours</option>
              <option value="3">3.0 Hours</option>
              <option value="4">Half Day</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">EST. COST</label>
            <input type="number" min="0" value="0" placeholder="$0" class="cost-input w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15 rounded-full px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none font-semibold" />
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-white/10">
          <button type="button" class="add-itinerary-btn flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 active:scale-[0.98] text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5">
            <span>+ Add to Itinerary</span>
          </button>
          <button type="button" class="remove-pin-btn px-3.5 py-2.5 bg-black/5 dark:bg-white/10 hover:bg-red-500/20 text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 text-xs font-bold rounded-full border border-black/10 dark:border-white/15 transition-all cursor-pointer" title="Discard">
            ✕
          </button>
        </div>
      `;

      const dayChips = container.querySelectorAll('.day-chip');
      dayChips.forEach((chip) => {
        chip.addEventListener('click', () => {
          dayChips.forEach((c) => {
            c.className =
              'day-chip px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer bg-[#1C1C24] dark:bg-[#1C1C24] light:bg-zinc-100 text-zinc-300 dark:text-zinc-300 light:text-zinc-700 border border-white/15 dark:border-white/15 light:border-zinc-300 hover:text-white';
          });
          chip.className =
            'day-chip px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer bg-white text-black font-bold shadow-sm';
          selectedDayId = chip.getAttribute('data-day') || availableDays[0].id;
        });
      });

      const durationSelect = container.querySelector('.duration-select');
      durationSelect.addEventListener('change', (e) => {
        durationHrs = parseFloat(e.target.value) || 1.5;
      });

      const costInput = container.querySelector('.cost-input');
      costInput.addEventListener('input', (e) => {
        cost = parseFloat(e.target.value) || 0;
      });

      const addBtn = container.querySelector('.add-itinerary-btn');
      addBtn.addEventListener('click', () => {
        addBtn.innerHTML = '<span>✓ Added to Plan</span>';
        addBtn.className =
          'add-itinerary-btn flex-1 py-2.5 px-4 bg-emerald-500 text-black text-xs font-bold uppercase tracking-wider rounded-md transition-all shadow-md';

        onAdd({
          name: pinData.name || 'Custom Waypoint',
          durationHrs,
          cost,
          dayId: selectedDayId,
          lat: pinData.lat,
          lng: pinData.lng,
        });
      });

      const removeBtn = container.querySelector('.remove-pin-btn');
      removeBtn.addEventListener('click', () => {
        onRemove();
      });

      return container;
    },
    [days]
  );

  // ─── Map Click Handler ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = async (e) => {
      if (isTransitioning) return;

      const dx = e.point.x - pointerDownRef.current.x;
      const dy = e.point.y - pointerDownRef.current.y;
      const dist = Math.hypot(dx, dy);
      const dt = Date.now() - pointerDownRef.current.time;

      if (dist > 8 || dt > 450) return;

      const rawLng = e.lngLat.lng;
      const rawLat = e.lngLat.lat;
      const lng = ((((rawLng + 180) % 360) + 360) % 360) - 180;
      const lat = Math.max(-85, Math.min(85, rawLat));

      // MODE 1: Destination View — Waypoint Drop
      if (isDestinationView) {
        if (customMarkerRef.current) customMarkerRef.current.remove();
        if (activePopupRef.current) activePopupRef.current.remove();

        const pinEl = document.createElement('div');
        pinEl.className = 'cursor-pointer select-none font-sans';
        pinEl.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center text-xs font-bold border-2 border-black dark:border-white shadow-md">
              +
            </div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: pinEl, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);

        customMarkerRef.current = marker;

        const pinData = {
          lat,
          lng,
          name: 'Resolving Location...',
          address: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
        };

        placeMarker(pinData);

        const handleAdd = (activityData) => {
          addActivity(activityData.dayId, {
            name: activityData.name,
            durationHrs: activityData.durationHrs,
            cost: activityData.cost,
            lat: activityData.lat,
            lng: activityData.lng,
          });
          if (onOpenDrawer) {
            onOpenDrawer('itinerary');
          }
          setTimeout(() => {
            popup.remove();
          }, 400);
        };

        const handleRemove = () => {
          marker.remove();
          popup.remove();
          customMarkerRef.current = null;
          activePopupRef.current = null;
          clearMarker();
        };

        const popupNode = createPinPopupContent(pinData, handleAdd, handleRemove);
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: 'bottom',
          offset: [0, -14],
          className: 'custom-pin-popup',
        });

        popup.setLngLat([lng, lat]).setDOMContent(popupNode).addTo(map);
        activePopupRef.current = popup;

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
        } catch {}
        return;
      }

      // MODE 2: Globe View — Fly To
      const allDests = getDestinations();
      const matched = allDests.find((d) => {
        const dLat = d.lat - lat;
        const dLng = d.lng - lng;
        return dLat * dLat + dLng * dLng < 4.0;
      });

      if (matched) {
        flyToDestination(matched);
      } else {
        let resolvedName = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
        let country = '';
        try {
          const geoResult = await reverseGeocode(lat, lng);
          if (geoResult && geoResult.name) {
            resolvedName = geoResult.name;
            country = geoResult.country || '';
          }
        } catch {}

        flyToDestination({
          id: `coord-${Date.now()}`,
          name: resolvedName,
          lat,
          lng,
          country,
          type: ['custom'],
          budgetTier: 'mid',
          crowdLevel: 'medium',
          activities: [],
        });
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
    onOpenDrawer,
    onToggleDrawer,
    createPinPopupContent,
    flyToDestination,
  ]);

  // ─── Destination Markers & Sequence: Start -> Stop 1 -> Stop 2... ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (isDestinationView && activeDest) {
      const baseLat = activeDest.lat;
      const baseLng = activeDest.lng;
      const routeFeatures = [];

      let globalActivityIndex = 0;

      (days || []).forEach((day) => {
        const dayCoords = [];

        (day.activities || []).forEach((act) => {
          const actLat = act.lat || baseLat + Math.sin(globalActivityIndex * 1.4) * 0.032;
          const actLng = act.lng || baseLng + Math.cos(globalActivityIndex * 1.4) * 0.042;
          dayCoords.push([actLng, actLat]);

          const isStart = globalActivityIndex === 0;
          const labelText = isStart ? 'Start' : `Stop ${globalActivityIndex}`;

          const el = document.createElement('div');
          el.className = 'group cursor-pointer select-none font-sans';
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <div class="px-2.5 py-1 rounded-md ${
                isStart
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'bg-[#121217] text-white border border-white/30'
              } text-xs font-semibold shadow-md group-hover:scale-105 transition-transform">
                ${labelText}
              </div>
              <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                <div class="bg-[#121217]/95 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-md text-xs font-sans whitespace-nowrap shadow-2xl">
                  <span class="font-bold">${act.name}</span>
                  <span class="ml-2 text-zinc-400">(${formatPrice(act.cost)})</span>
                </div>
              </div>
            </div>
          `;

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([actLng, actLat])
            .addTo(map);

          markersRef.current.push(marker);
          globalActivityIndex++;
        });

        if (dayCoords.length >= 2) {
          routeFeatures.push({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: dayCoords,
            },
          });
        }
      });

      try {
        const source = map.getSource('itinerary-route');
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features: routeFeatures,
          });
        }
      } catch {}
      return;
    }

    // Globe Landing View: Destination dots
    if (!isDestinationView) {
      const allDests = getDestinations();
      const trendingIds = new Set(getTrendingDestinations().map((d) => d.id));

      allDests.forEach((dest) => {
        const isTrending = trendingIds.has(dest.id);
        const el = document.createElement('div');
        el.className = 'group cursor-pointer select-none font-sans';

        el.innerHTML = `
          <div class="relative flex items-center justify-center p-2">
            <div class="w-2.5 h-2.5 rounded-sm ${
              isTrending
                ? 'bg-emerald-400 ring-2 ring-white/30'
                : 'bg-zinc-400'
            } group-hover:scale-150 transition-transform"></div>
            <div class="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div class="bento-glass px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-xl">
                ${dest.name.split(',')[0]}
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
  }, [isDestinationView, activeDest, days, mapLoaded, flyToDestination, formatPrice]);

  return (
    <ErrorBoundary name="MapLibre Globe">
      <div className="relative w-full h-full bg-[#0a1128] overflow-hidden select-none font-sans">
        {/* Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* ─── Destination View Overlays ─── */}
        <AnimatePresence>
          {isDestinationView && activeDest && (
            <>
              {/* Top Navigation Bar: Back to Globe & 2D/3D & Sat/Dark Controls */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className={`fixed top-0 left-0 right-0 z-50 pointer-events-none p-3 sm:p-6 flex items-center justify-between gap-2 transition-all duration-300 ${
                  activeDrawer ? 'md:right-[480px]' : ''
                }`}
              >
                {/* Back to Globe Button */}
                <button
                  type="button"
                  onClick={handleReturnToGlobe}
                  className="pointer-events-auto apple-liquid-glass py-2 px-4 hover:scale-105 cursor-pointer shadow-2xl flex items-center gap-2 rounded-full shrink-0"
                  title="Return to Globe Orbit"
                >
                  <GlobeIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white hidden xs:inline sm:inline">
                    Orbit View
                  </span>
                </button>

                {/* Map Mode HUD Toolbar with Smooth Liquid Bubble Sliders & Theme Switcher */}
                <div className="pointer-events-auto flex items-center gap-1 apple-liquid-glass p-1.5 shadow-2xl rounded-full shrink-0">
                  {/* 2D / 3D Mode Switcher */}
                  <div className="flex items-center relative p-0.5">
                    {['2D', '3D'].map((dim) => {
                      const isSelected = viewDimension === dim;
                      return (
                        <button
                          key={dim}
                          type="button"
                          onClick={() => handleToggleDimension(dim)}
                          className={`relative px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer z-10 ${
                            isSelected
                              ? 'text-slate-900 dark:text-white font-bold'
                              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="hud2d3dBubble"
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                              className="absolute inset-0 bg-white dark:bg-white/20 rounded-full -z-10 shadow-md border border-black/5 dark:border-white/15"
                            />
                          )}
                          {dim}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-4 w-[1px] bg-black/10 dark:bg-white/20 mx-0.5" />

                  {/* Tile Layer Switchers */}
                  <div className="flex items-center relative gap-0.5 p-0.5">
                    {[
                      { key: 'satellite', label: 'Sat' },
                      { key: 'dark', label: 'Dark' },
                      { key: 'voyager', label: 'Street' },
                    ].map((s) => {
                      const isSelected = activeTileStyle === s.key;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => handleSelectTileStyle(s.key)}
                          className={`relative px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer z-10 ${
                            isSelected
                              ? 'text-slate-900 dark:text-white font-bold'
                              : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                          }`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="hudTileBubble"
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                              className="absolute inset-0 bg-white dark:bg-white/20 rounded-full -z-10 shadow-md border border-black/5 dark:border-white/15"
                            />
                          )}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-4 w-[1px] bg-black/10 dark:bg-white/20 mx-0.5" />

                  {/* Theme Switcher Button */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {isDark ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-indigo-600" />}
                  </button>
                </div>
              </motion.div>

              {/* Bottom Dock with Smooth Liquid Sliding Bubble */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2 }}
                className={`fixed bottom-4 sm:bottom-6 left-0 right-0 z-50 pointer-events-none flex justify-center px-3 sm:px-4 transition-all duration-300 ${
                  activeDrawer ? 'md:right-[480px]' : ''
                }`}
              >
                <div className="pointer-events-auto apple-liquid-glass p-1 sm:p-1.5 rounded-full flex items-center gap-0.5 sm:gap-1 shadow-2xl relative max-w-full overflow-x-auto">
                  {[
                    { key: 'overview', icon: <OverviewIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />, label: 'Overview' },
                    {
                      key: 'itinerary',
                      icon: <CalendarIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />,
                      label: 'Itinerary',
                      count: (days || []).reduce((sum, d) => sum + (d.activities?.length || 0), 0),
                    },
                    { key: 'packing', icon: <BackpackIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />, label: 'Packing' },
                    { key: 'budget', icon: <DollarIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />, label: 'Budget' },
                  ].map((item) => {
                    const isActive = activeDrawer === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onToggleDrawer(item.key)}
                        className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-colors cursor-pointer z-10 whitespace-nowrap ${
                          isActive
                            ? 'text-slate-900 dark:text-white font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeDockBubble"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                            className="absolute inset-0 bg-white dark:bg-white/20 rounded-full -z-10 shadow-md border border-black/5 dark:border-white/15"
                          />
                        )}
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.count > 0 && (
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              isActive
                                ? 'bg-slate-900 text-white dark:bg-emerald-400 dark:text-slate-950'
                                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
