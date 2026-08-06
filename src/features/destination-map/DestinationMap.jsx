import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Tooltip, Polyline } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import { useItinerary } from '../../context/ItineraryContext';
import { getDestinationById } from '../../services/destinations';
import { getWeather } from '../../services/weather';
import { getCrowdLevel, getCrowdColor } from '../../services/crowd';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import DetailPanel from './DetailPanel';
import GlobeFilters from '../globe-home/GlobeFilters';
import { MAP_TILES } from '../../config/api';
import {
  GlobeIcon,
  SatelliteIcon,
  MoonIcon,
  MapIcon,
  SunIcon,
  UsersIcon,
  FilterIcon,
  OverviewIcon,
  CalendarIcon,
  BackpackIcon,
  ScaleIcon,
} from '../../components/ui/Icons';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapController({ center, zoom }) {
  const map = useMap();
  const { navigateToGlobe } = useApp();

  useEffect(() => {
    if (center && center[0] !== undefined && center[1] !== undefined) {
      map.flyTo(center, zoom, { duration: 1.4, easeLinearity: 0.35 });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    const handleZoomEnd = () => {
      // Zooming out to planetary scale automatically returns to the 3D globe!
      if (map.getZoom() <= 4) {
        navigateToGlobe(true);
      }
    };
    map.on('zoomend', handleZoomEnd);
    return () => map.off('zoomend', handleZoomEnd);
  }, [map, navigateToGlobe]);

  return null;
}

function WeatherLayer({ visible }) {
  if (!visible) return null;
  return (
    <TileLayer
      url="https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=MOCK_OWM_KEY_replace_me"
      opacity={0.4}
      attribution="Weather &copy; OpenWeatherMap"
    />
  );
}

/* Route polyline connecting itinerary activities */
function ItineraryRoute({ destination, activities }) {
  if (!destination || !activities || activities.length === 0) return null;

  const markers = activities.map((activity, i) => {
    const angle = (i / Math.max(activities.length, 1)) * Math.PI * 2;
    const radius = 0.016 + (i % 3) * 0.007;
    return {
      ...activity,
      lat: destination.lat + Math.sin(angle) * radius,
      lng: destination.lng + Math.cos(angle) * radius,
    };
  });

  const positions = [[destination.lat, destination.lng], ...markers.map(m => [m.lat, m.lng])];

  return (
    <>
      {activities.length >= 2 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: '#38BDF8', weight: 2.5, opacity: 0.7, dashArray: '6,6' }}
        />
      )}
      {markers.map((activity, i) => (
        <CircleMarker
          key={activity.uid || `act-${i}`}
          center={[activity.lat, activity.lng]}
          radius={7}
          pathOptions={{
            color: '#38BDF8',
            fillColor: '#070B14',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Tooltip
            direction="top"
            offset={[0, -10]}
            className="!bg-surface/95 !backdrop-blur-xl !text-text-primary !border-white/10 !rounded-card !font-body !text-xs !p-2 shadow-2xl"
          >
            <div className="font-semibold text-white">{activity.name}</div>
            <div className="text-text-secondary text-[11px] font-mono mt-0.5">
              ⏱ {activity.durationHrs}h · {activity.cost === 0 ? 'Free' : `$${activity.cost}`}
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

export default function DestinationMap({ onOpenItinerary, onOpenPacking, onOpenCompare }) {
  const { selectedDestination, navigateToGlobe } = useApp();
  const { days, setDestination } = useItinerary();
  const [weatherData, setWeatherData] = useState(null);
  const [crowdData, setCrowdData] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [showCrowd, setShowCrowd] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [tileStyle, setTileStyle] = useState('voyager');
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep all hooks unconditionally at top level
  const destination = useMemo(() => {
    if (!selectedDestination) return null;
    return getDestinationById(selectedDestination.id) || selectedDestination;
  }, [selectedDestination]);

  useEffect(() => {
    if (!destination) return;
    setIsLoading(true);
    setDestination(destination.id, destination.name);
    Promise.all([
      getWeather(destination.lat, destination.lng),
      getCrowdLevel(destination.id),
    ])
      .then(([weather, crowd]) => {
        setWeatherData(weather);
        setCrowdData(crowd);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [destination, setDestination]);

  const allActivities = useMemo(() => days.flatMap(day => day.activities), [days]);

  const currentTileUrl = useMemo(() => {
    switch (tileStyle) {
      case 'satellite': return MAP_TILES.SATELLITE;
      case 'dark': return MAP_TILES.DARK;
      default: return MAP_TILES.VOYAGER;
    }
  }, [tileStyle]);

  const currentTileAttr = useMemo(() => {
    switch (tileStyle) {
      case 'satellite': return MAP_TILES.SATELLITE_ATTR;
      case 'dark': return MAP_TILES.DARK_ATTR;
      default: return MAP_TILES.VOYAGER_ATTR;
    }
  }, [tileStyle]);

  const center = useMemo(() => {
    if (!destination) return [0, 0];
    return [destination.lat, destination.lng];
  }, [destination]);

  const crowdColor = crowdData ? getCrowdColor(crowdData.level) : '#F59E0B';

  if (!destination) {
    return (
      <div className="relative w-full h-full bg-bg-base flex items-center justify-center">
        <div className="text-text-secondary text-sm font-mono">Loading destination...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary name="Destination Map">
      <div className="relative w-full h-full bg-bg-base overflow-hidden">
        {/* Leaflet 2D Map Container */}
        <MapContainer
          center={center}
          zoom={12}
          minZoom={3}
          maxZoom={18}
          style={{ width: '100%', height: '100%', background: '#070B14' }}
          zoomControl={false}
        >
          <MapController center={center} zoom={12} />
          <TileLayer key={tileStyle} url={currentTileUrl} attribution={currentTileAttr} />
          <WeatherLayer visible={showWeather} />

          {/* Main Destination Pulsing Marker */}
          <CircleMarker
            center={center}
            radius={11}
            pathOptions={{
              color: crowdColor,
              fillColor: crowdColor,
              fillOpacity: 0.35,
              weight: 2.5,
            }}
            eventHandlers={{ click: () => setSelectedPanel('detail') }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -12]}
              className="!bg-surface/95 !backdrop-blur-xl !text-text-primary !border-white/10 !rounded-xl !font-display !text-sm !font-bold !px-3 !py-1.5 shadow-2xl"
            >
              {destination.name}
            </Tooltip>
          </CircleMarker>

          {showCrowd && (
            <CircleMarker
              center={center}
              radius={26}
              pathOptions={{
                color: crowdColor,
                fillColor: 'transparent',
                weight: 1.5,
                opacity: 0.4,
                dashArray: '5,5',
              }}
            />
          )}

          <ItineraryRoute destination={destination} activities={allActivities} />
        </MapContainer>

        {/* ─── Top Floating Navigation Island ─── */}
        <div className="absolute top-0 inset-x-0 z-[1000] pointer-events-none p-4 sm:p-5">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
            {/* Left: Back to 3D Globe */}
            <button
              onClick={() => navigateToGlobe(true)}
              className="glass pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-white text-sm font-medium hover:border-accent-sky/50 hover:bg-surface-raised transition-all duration-200 shadow-xl group"
              title="Return to 3D Globe (or zoom out)"
            >
            {/* Left: Back to 3D Globe */}
            <button
              onClick={() => navigateToGlobe(true)}
              className="glass pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-white text-sm font-medium hover:border-accent-sky/50 hover:bg-surface-raised transition-all duration-200 shadow-xl group"
              title="Return to 3D Globe (or zoom out)"
            >
              <GlobeIcon className="w-4 h-4 text-accent-sky group-hover:scale-110 transition-transform" />
              <span className="font-body tracking-wide">Globe</span>
            </button>

            {/* Center: Destination Header Pill */}
            <div className="glass pointer-events-auto px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
              <span className="font-display font-bold text-white text-base sm:text-lg tracking-wide">
                {destination.name}
              </span>
              {destination.bestTimeToVisit && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-accent-sky bg-accent-sky/10 border border-accent-sky/20 px-2 py-0.5 rounded-full">
                  <CalendarIcon className="w-3 h-3" />
                  {destination.bestTimeToVisit}
                </span>
              )}
            </div>

            {/* Right: Map Layers & Quick Controls */}
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {/* Tile Layer Selector */}
                <div className="glass flex items-center rounded-2xl p-1 shadow-xl">
                  {[
                    { key: 'voyager', icon: <MapIcon className="w-3.5 h-3.5" />, title: 'Atlas Map' },
                    { key: 'dark', icon: <MoonIcon className="w-3.5 h-3.5" />, title: 'Dark Matter' },
                    { key: 'satellite', icon: <SatelliteIcon className="w-3.5 h-3.5" />, title: 'Satellite' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setTileStyle(s.key)}
                      title={s.title}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                        tileStyle === s.key
                          ? 'bg-accent-sky/20 text-accent-sky font-bold border border-accent-sky/30 shadow-md'
                          : 'text-text-secondary hover:text-white'
                      }`}
                    >
                      {s.icon}
                    </button>
                  ))}
                </div>

                {/* Weather Badge Toggle */}
                <button
                  onClick={() => setShowWeather(!showWeather)}
                  className={`glass px-3.5 py-2 rounded-2xl text-xs font-mono flex items-center gap-1.5 transition-all shadow-xl ${
                    showWeather
                      ? 'border-accent-sky/40 text-accent-sky bg-accent-sky/10'
                      : 'text-text-secondary hover:text-white'
                  }`}
                  title="Toggle Weather Layer"
                >
                  <SunIcon className="w-3.5 h-3.5 text-accent-amber" />
                  {weatherData && <span className="font-bold">{weatherData.temp}°C</span>}
                </button>

                {/* Crowd Badge Toggle */}
                <button
                  onClick={() => setShowCrowd(!showCrowd)}
                  className={`glass px-3.5 py-2 rounded-2xl text-xs font-mono flex items-center gap-1.5 transition-all shadow-xl ${
                    showCrowd
                      ? 'border-accent-amber/40 text-accent-amber bg-accent-amber/10'
                      : 'text-text-secondary hover:text-white'
                  }`}
                  title="Toggle Crowd Layer"
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  {crowdData && <span className="font-bold">{crowdData.label}</span>}
                </button>

                {/* Filter Drawer Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`glass px-3.5 py-2 rounded-2xl text-xs font-mono flex items-center gap-1.5 transition-all shadow-xl ${
                    showFilters
                      ? 'border-accent-sky/40 text-accent-sky bg-accent-sky/10'
                      : 'text-text-secondary hover:text-white'
                  }`}
                  title="Toggle Filters"
                >
                  <FilterIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
              </div>

              {/* Filters Drawer Popup */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass rounded-2xl p-4 shadow-2xl overflow-hidden mt-1 border border-white/10 w-80"
                  >
                    <GlobeFilters />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ─── Bottom Floating Action Dock ─── */}
        <div className="absolute bottom-6 inset-x-0 z-[1000] pointer-events-none px-4">
          <div className="max-w-7xl mx-auto flex items-end justify-between">
            {/* Coordinates Badge */}
            <div className="glass pointer-events-auto px-3.5 py-1.5 rounded-xl font-mono text-[11px] text-text-secondary/70 shadow-lg">
              {destination.lat.toFixed(4)}°, {destination.lng.toFixed(4)}°
            </div>

            {/* Quick Action Dock */}
            <div className="glass pointer-events-auto p-1.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/10">
              <button
                onClick={() => setSelectedPanel(selectedPanel === 'detail' ? null : 'detail')}
                className={`px-4 py-2.5 rounded-full font-body text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                  selectedPanel === 'detail'
                    ? 'bg-white/20 text-white'
                    : 'text-text-secondary hover:text-white hover:bg-white/10'
                }`}
              >
                <OverviewIcon className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={onOpenItinerary}
                className="px-4 py-2.5 bg-accent-sky text-bg-base rounded-full font-body text-xs sm:text-sm font-bold shadow-lg shadow-accent-sky/20 hover:shadow-xl hover:shadow-accent-sky/30 hover:scale-105 transition-all flex items-center gap-2"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Itinerary ({allActivities.length})</span>
              </button>

              <button
                onClick={onOpenPacking}
                className="px-4 py-2.5 rounded-full font-body text-xs sm:text-sm font-medium text-text-secondary hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <BackpackIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Packing</span>
              </button>

              <button
                onClick={onOpenCompare}
                className="px-4 py-2.5 rounded-full font-body text-xs sm:text-sm font-medium text-text-secondary hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <ScaleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Compare</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Detail Slide-Over Panel ─── */}
        <AnimatePresence>
          {selectedPanel === 'detail' && (
            <DetailPanel
              destination={destination}
              weatherData={weatherData}
              crowdData={crowdData}
              onClose={() => setSelectedPanel(null)}
              onPlanTrip={() => {
                setSelectedPanel(null);
                onOpenItinerary();
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
