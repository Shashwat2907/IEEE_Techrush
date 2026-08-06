import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useFilters } from '../../context/FilterContext';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { getDestinations, getTrendingDestinations } from '../../services/destinations';
import { reverseGeocode } from '../../services/geocode';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import {
  GlobeIcon,
  SatelliteIcon,
  MoonIcon,
  MapIcon,
  CalendarIcon,
  OverviewIcon,
  BackpackIcon,
  DollarIcon,
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
  const [projectionMode, setProjectionMode] = useState('globe');

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

  // Smooth canvas resize when drawer opens/closes
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
          'sky-color': '#06090F',
          'sky-horizon-blend': 0.4,
          'horizon-color': '#0B101B',
          'horizon-fog-blend': 0.6,
          'fog-color': '#06090F',
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
    });

    map.on('load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {}
      setMapLoaded(true);

      // Route layers
      map.addSource('itinerary-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'itinerary-line',
        type: 'line',
        source: 'itinerary-route',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-opacity': 0.85,
          'line-dasharray': [2, 2],
        },
      });
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

    // Smooth idle globe spin
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

  // Tile layer switching
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

  // 2D / 3D Projection Toggle
  const toggleProjection = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const nextMode = projectionMode === 'globe' ? 'mercator' : 'globe';
    try {
      map.setProjection({ type: nextMode });
      setProjectionMode(nextMode);
    } catch (err) {
      console.warn('Projection error:', err);
    }
  }, [projectionMode]);

  // ─── Camera Flight (Pitch 0, Bearing 0 for perfect stability) ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !flightTarget || !isTransitioning) return;

    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const targetZoom = 12.8;
    map.flyTo({
      center: [flightTarget.lng, flightTarget.lat],
      zoom: targetZoom,
      pitch: 0,
      bearing: 0,
      duration: 2400,
      essential: true,
    });

    const handleMoveEnd = () => {
      map.off('moveend', handleMoveEnd);
      arriveAtDestination(flightTarget);
      onToggleDrawer('overview');
    };

    map.on('moveend', handleMoveEnd);
    return () => map.off('moveend', handleMoveEnd);
  }, [flightTarget, isTransitioning, mapLoaded, arriveAtDestination, onToggleDrawer]);

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
      setProjectionMode('globe');
    } catch {}

    map.flyTo({
      center: [15, 20],
      zoom: 1.6,
      pitch: 0,
      bearing: 0,
      duration: 1800,
      essential: true,
    });

    onToggleDrawer(null);
    navigateToGlobe(false);
  }, [navigateToGlobe, onToggleDrawer]);

  // Pointer tracking to ignore drag/pan gestures
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

  // ─── Create Rich Pin Popup Content (Restored) ───
  const createPinPopupContent = useCallback(
    (pinData, onAdd, onRemove) => {
      const container = document.createElement('div');
      container.className = 'custom-pin-popup-card p-4 rounded-2xl bg-[#0B101B] border border-white/10 text-white shadow-2xl space-y-3 min-w-[260px] max-w-[300px] select-none';

      const availableDays = days && days.length > 0 ? days : [{ id: 'day-1', dayNumber: 1 }];
      let selectedDayId = availableDays[0].id;
      let durationHrs = 1.5;
      let cost = 0;

      container.innerHTML = `
        <div class="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 text-[11px] font-medium text-accent-sky uppercase tracking-wider">
              <span>📍 Custom Pin</span>
            </div>
            <h4 class="pin-title font-display text-sm font-bold text-white truncate mt-0.5">${pinData.name || 'Custom Location'}</h4>
            <p class="pin-address text-[11px] text-text-secondary truncate">${pinData.address || ''}</p>
          </div>
        </div>

        <div>
          <label class="text-[11px] font-medium text-text-secondary uppercase tracking-wider block mb-1.5">Assign to Day</label>
          <div class="day-chips-row flex items-center gap-1.5 overflow-x-auto pb-1">
            ${availableDays
              .map(
                (d, idx) => `
                <button type="button" data-day="${d.id}" class="day-chip px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  idx === 0
                    ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/40 font-semibold'
                    : 'bg-white/5 text-text-secondary hover:text-white border border-white/5'
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
            <label class="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Duration</label>
            <select class="duration-select w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none">
              <option value="1" class="bg-[#0B101B]">1 hour</option>
              <option value="1.5" selected class="bg-[#0B101B]">1.5 hours</option>
              <option value="2" class="bg-[#0B101B]">2 hours</option>
              <option value="3" class="bg-[#0B101B]">3 hours</option>
              <option value="4" class="bg-[#0B101B]">Half Day</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Est. Cost</label>
            <input type="number" min="0" value="0" placeholder="$0" class="cost-input w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none" />
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-white/10">
          <button type="button" class="add-itinerary-btn flex-1 py-2 rounded-xl bg-accent-sky text-slate-950 text-xs font-bold hover:bg-sky-400 active:scale-95 transition-all shadow-md cursor-pointer">
            Add to Itinerary
          </button>
          <button type="button" class="remove-pin-btn p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-text-secondary hover:text-red-400 border border-white/5 transition-colors cursor-pointer" title="Remove Pin">
            ✕
          </button>
        </div>
      `;

      // Day chip selection
      const dayChips = container.querySelectorAll('.day-chip');
      dayChips.forEach((chip) => {
        chip.addEventListener('click', () => {
          dayChips.forEach((c) => {
            c.className = 'day-chip px-3 py-1 rounded-lg text-xs font-medium transition-all bg-white/5 text-text-secondary hover:text-white border border-white/5';
          });
          chip.className = 'day-chip px-3 py-1 rounded-lg text-xs font-medium transition-all bg-accent-sky/20 text-accent-sky border border-accent-sky/40 font-semibold';
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
        addBtn.textContent = '✓ Added!';
        addBtn.className = 'add-itinerary-btn flex-1 py-2 rounded-xl bg-accent-emerald text-slate-950 text-xs font-bold transition-all';

        onAdd({
          name: pinData.name || 'Custom Location',
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

  // ─── Dual-Mode Map Click Handler (Restored) ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = async (e) => {
      if (isTransitioning) return;

      const dx = e.point.x - pointerDownRef.current.x;
      const dy = e.point.y - pointerDownRef.current.y;
      const dist = Math.hypot(dx, dy);
      const dt = Date.now() - pointerDownRef.current.time;

      if (dist > 8 || dt > 450) return; // User was panning/rotating

      const { lng, lat } = e.lngLat;

      // ── MODE 1: Destination View — Place Custom Pin ──
      if (isDestinationView) {
        if (customMarkerRef.current) customMarkerRef.current.remove();
        if (activePopupRef.current) activePopupRef.current.remove();

        const pinEl = document.createElement('div');
        pinEl.className = 'cursor-pointer select-none';
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

        const pinData = {
          lat,
          lng,
          name: 'Locating place...',
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
          onToggleDrawer('itinerary');
          setTimeout(() => {
            popup.remove();
          }, 600);
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
          offset: 16,
          className: 'custom-pin-popup',
        });

        popup.setLngLat([lng, lat]).setDOMContent(popupNode).addTo(map);
        activePopupRef.current = popup;

        // Reverse geocode to get street name
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

      // ── MODE 2: Globe Orbit View — Click to Fly ──
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
    onToggleDrawer,
    createPinPopupContent,
    flyToDestination,
  ]);

  // ─── Destination Markers & Day Route Linkages ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // In Destination View: Map out Itinerary Stops & Route Lines
    if (isDestinationView && activeDest) {
      const baseLat = activeDest.lat;
      const baseLng = activeDest.lng;
      const dayColors = ['#38BDF8', '#F59E0B', '#10B981', '#A78BFA', '#F43F5E'];
      const routeFeatures = [];

      let stopNumber = 1;

      (days || []).forEach((day, dayIndex) => {
        const dayColor = dayColors[dayIndex % dayColors.length];
        const dayCoords = [];

        (day.activities || []).forEach((act, actIndex) => {
          const actLat = act.lat || baseLat + Math.sin(stopNumber * 1.4) * 0.032;
          const actLng = act.lng || baseLng + Math.cos(stopNumber * 1.4) * 0.042;
          dayCoords.push([actLng, actLat]);

          const isStart = stopNumber === 1;
          const isFinish =
            dayIndex === days.length - 1 && actIndex === day.activities.length - 1 && stopNumber > 1;

          const el = document.createElement('div');
          el.className = 'group cursor-pointer select-none';
          el.innerHTML = `
            <div class="relative flex items-center justify-center">
              <div class="w-7 h-7 rounded-full border border-white/20 shadow-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-125" style="background-color: #0B101B; border-color: ${dayColor};">
                ${
                  isStart
                    ? `<span class="text-[10px]">🚩</span>`
                    : isFinish
                    ? `<span class="text-[10px]">🏁</span>`
                    : `<span class="text-[11px] font-bold" style="color: ${dayColor}">${stopNumber}</span>`
                }
              </div>
              <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                <div class="bg-[#0B101B]/95 border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shadow-2xl">
                  <span>${act.name}</span>
                  <span class="ml-1.5 text-accent-emerald">${formatPrice(act.cost)}</span>
                </div>
              </div>
            </div>
          `;

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([actLng, actLat])
            .addTo(map);

          markersRef.current.push(marker);
          stopNumber++;
        });

        if (dayCoords.length >= 2) {
          routeFeatures.push({
            type: 'Feature',
            properties: { color: dayColor },
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

    // Globe Landing View: Minimalist dot pins
    if (!isDestinationView) {
      const allDests = getDestinations();
      const trendingIds = new Set(getTrendingDestinations().map((d) => d.id));

      allDests.forEach((dest) => {
        const isTrending = trendingIds.has(dest.id);
        const el = document.createElement('div');
        el.className = 'group cursor-pointer select-none';

        el.innerHTML = `
          <div class="relative flex items-center justify-center p-2.5">
            <div class="relative flex items-center justify-center">
              ${isTrending ? '<span class="absolute w-3 h-3 rounded-full bg-accent-sky/40 animate-ping"></span>' : ''}
              <div class="w-2.5 h-2.5 rounded-full ${
                isTrending ? 'bg-accent-sky shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-white/80'
              } transition-transform duration-200 group-hover:scale-150"></div>
            </div>
            <div class="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div class="bg-[#0B101B]/95 border border-white/10 text-white px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap shadow-2xl backdrop-blur-md">
                ${dest.name}
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
      <div className="relative w-full h-full bg-[#06090F] overflow-hidden select-none">
        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* ─── Destination View Overlays ─── */}
        <AnimatePresence>
          {isDestinationView && activeDest && (
            <>
              {/* Top Navigation Bar: Back to Globe & 2D/3D Controls */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute top-0 inset-x-0 z-30 pointer-events-none p-3 sm:p-4 flex items-center justify-between"
              >
                {/* Back to Globe Button */}
                <button
                  onClick={handleReturnToGlobe}
                  className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B101B]/80 hover:bg-[#0B101B]/95 border border-white/[0.08] text-white text-xs font-medium backdrop-blur-xl transition-all shadow-xl group cursor-pointer"
                  title="Return to 3D Globe"
                >
                  <GlobeIcon className="w-4 h-4 text-accent-sky group-hover:scale-110 transition-transform" />
                  <span className="font-body">Globe</span>
                </button>

                {/* Map Mode Controls */}
                <div className="pointer-events-auto flex items-center gap-1 bg-[#0B101B]/80 border border-white/[0.08] rounded-xl p-1 backdrop-blur-xl shadow-xl">
                  {/* 2D/3D Toggle */}
                  <button
                    onClick={toggleProjection}
                    title={projectionMode === 'globe' ? 'Switch to 2D Map' : 'Switch to 3D Globe'}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-white transition-colors cursor-pointer"
                  >
                    {projectionMode === 'globe' ? (
                      <FlatMapIcon className="w-4 h-4" />
                    ) : (
                      <Globe3DIcon className="w-4 h-4" />
                    )}
                  </button>

                  <div className="h-3 w-[1px] bg-white/10" />

                  {/* Tile Style Switcher */}
                  {[
                    { key: 'satellite', icon: <SatelliteIcon className="w-3.5 h-3.5" />, title: 'Satellite' },
                    { key: 'dark', icon: <MoonIcon className="w-3.5 h-3.5" />, title: 'Dark' },
                    { key: 'voyager', icon: <MapIcon className="w-3.5 h-3.5" />, title: 'Street' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setActiveTileStyle(s.key)}
                      title={s.title}
                      className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                        activeTileStyle === s.key
                          ? 'bg-accent-sky/20 text-accent-sky font-semibold'
                          : 'text-text-secondary hover:text-white'
                      }`}
                    >
                      {s.icon}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Bottom Liquid Dock Bar */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute bottom-3 sm:bottom-4 inset-x-0 z-30 pointer-events-none flex justify-center px-3"
              >
                <div className="pointer-events-auto bg-[#0B101B]/85 border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-1 shadow-2xl flex items-center gap-1">
                  {[
                    { key: 'overview', icon: <OverviewIcon className="w-3.5 h-3.5" />, label: 'Overview' },
                    {
                      key: 'itinerary',
                      icon: <CalendarIcon className="w-3.5 h-3.5" />,
                      label: 'Itinerary',
                      count: (days || []).reduce((sum, d) => sum + (d.activities?.length || 0), 0),
                    },
                    { key: 'packing', icon: <BackpackIcon className="w-3.5 h-3.5" />, label: 'Packing' },
                    { key: 'budget', icon: <DollarIcon className="w-3.5 h-3.5" />, label: 'Budget' },
                  ].map((item) => {
                    const isActive = activeDrawer === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => onToggleDrawer(item.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold font-body transition-all cursor-pointer ${
                          isActive
                            ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                            : 'text-text-secondary hover:text-white hover:bg-white/[0.03]'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.count > 0 && (
                          <span className="text-[11px] font-semibold bg-accent-sky/20 text-accent-sky px-1.5 py-0.2 rounded-full">
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
