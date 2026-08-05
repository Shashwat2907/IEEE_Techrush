import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Tooltip, Polyline } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import { useItinerary } from '../../context/ItineraryContext';
import { getDestinationById } from '../../services/destinations';
import { getWeather, getWeatherIconUrl } from '../../services/weather';
import { getCrowdLevel, getCrowdColor } from '../../services/crowd';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import DetailPanel from './DetailPanel';
import GlobeFilters from '../globe-home/GlobeFilters';
import { MAP_TILES } from '../../config/api';

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
    if (center) map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.4 });
  }, [center, zoom, map]);

  useEffect(() => {
    const handleZoomEnd = () => { if (map.getZoom() <= 5) navigateToGlobe(true); };
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
      opacity={0.4} attribution="Weather &copy; OpenWeatherMap"
    />
  );
}

/* Route polyline connecting itinerary activities */
function ItineraryRoute({ destination, activities, activeDay }) {
  if (!destination || !activities || activities.length < 2) return null;

  const dayColors = ['#38BDF8', '#F59E0B', '#10B981', '#6366F1', '#F43F5E'];

  const markers = activities.map((activity, i) => {
    const angle = (i / activities.length) * Math.PI * 2;
    const radius = 0.012 + (i % 3) * 0.005;
    return {
      ...activity,
      lat: destination.lat + Math.sin(angle) * radius,
      lng: destination.lng + Math.cos(angle) * radius,
    };
  });

  const positions = markers.map(m => [m.lat, m.lng]);

  return (
    <>
      {/* Route polyline */}
      <Polyline
        positions={[[destination.lat, destination.lng], ...positions]}
        pathOptions={{ color: dayColors[0], weight: 2, opacity: 0.6, dashArray: '8,6' }}
      />
      {markers.map((activity, i) => (
        <CircleMarker
          key={activity.uid || `activity-${i}`}
          center={[activity.lat, activity.lng]}
          radius={6}
          pathOptions={{ color: dayColors[0], fillColor: dayColors[0], fillOpacity: 0.7, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -8]}
            className="!bg-surface !text-text-primary !border-surface-raised !rounded-card !font-body !text-xs">
            <strong>{activity.name}</strong><br />{activity.durationHrs}h · ${activity.cost}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

export default function DestinationMap() {
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
    ]).then(([weather, crowd]) => {
      setWeatherData(weather); setCrowdData(crowd); setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [destination, setDestination]);

  const allActivities = useMemo(() => days.flatMap(day => day.activities), [days]);

  if (!destination) return null;

  const center = [destination.lat, destination.lng];
  const crowdColor = crowdData ? getCrowdColor(crowdData.level) : '#F59E0B';

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

  return (
    <ErrorBoundary name="Destination Map">
      <div className="relative w-full h-full">
        <MapContainer center={center} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <MapController center={center} zoom={12} />
          <TileLayer key={tileStyle} url={currentTileUrl} attribution={currentTileAttr} />
          <WeatherLayer visible={showWeather} />

          {/* Main destination marker */}
          <CircleMarker center={center} radius={10}
            pathOptions={{ color: crowdColor, fillColor: crowdColor, fillOpacity: 0.25, weight: 2 }}
            eventHandlers={{ click: () => setSelectedPanel('detail') }}>
            <Tooltip permanent direction="top" offset={[0, -12]}
              className="!bg-surface/95 !backdrop-blur-xl !text-text-primary !border-white/10 !rounded-card !font-display !text-sm !font-semibold !px-3 !py-1.5">
              {destination.name}
            </Tooltip>
          </CircleMarker>

          {showCrowd && (
            <CircleMarker center={center} radius={22}
              pathOptions={{ color: crowdColor, fillColor: 'transparent', weight: 1.5, opacity: 0.3, dashArray: '5,5' }}
            />
          )}

          <ItineraryRoute destination={destination} activities={allActivities} />
        </MapContainer>

        {/* ─── Top Controls ─── */}
        <div className="absolute top-0 inset-x-0 z-[1000] pointer-events-none">
          <div className="flex items-start justify-between p-4 pointer-events-auto">
            {/* Back */}
            <button onClick={() => navigateToGlobe(false)}
              className="glass flex items-center gap-2 px-4 py-2.5 rounded-card text-text-secondary text-sm
                hover:text-white hover:border-accent-sky/30 transition-all duration-200 h-10">
              <span>🌍</span><span className="font-body">Globe</span>
            </button>

            {/* Destination name */}
            <div className="text-center">
              <h2 className="font-display text-lg sm:text-xl font-bold text-white
                glass px-5 py-2.5 rounded-card h-10 flex items-center justify-center">
                {destination.name}
              </h2>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {/* Map style */}
                <div className="glass flex items-center rounded-card p-0.5 h-10">
                  {[
                    { key: 'voyager', label: '🗺️', title: 'Atlas' },
                    { key: 'dark', label: '🌑', title: 'Dark' },
                    { key: 'satellite', label: '🛰️', title: 'Satellite' },
                  ].map(s => (
                    <button key={s.key} onClick={() => setTileStyle(s.key)} title={s.title}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                        tileStyle === s.key
                          ? 'bg-accent-sky/20 text-accent-sky font-bold'
                          : 'text-text-secondary hover:text-white'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>

                <button onClick={() => setShowWeather(!showWeather)}
                  className={`glass px-3 py-2 rounded-card text-xs font-mono h-10 flex items-center transition-all duration-200
                    ${showWeather ? 'border-accent-sky/40 text-accent-sky' : 'text-text-secondary hover:text-white'}`}>
                  🌤️
                </button>

                <button onClick={() => setShowCrowd(!showCrowd)}
                  className={`glass px-3 py-2 rounded-card text-xs font-mono h-10 flex items-center transition-all duration-200
                    ${showCrowd ? 'border-accent-sky/40 text-accent-sky' : 'text-text-secondary hover:text-white'}`}>
                  👥
                </button>

                <button onClick={() => setShowFilters(!showFilters)}
                  className={`glass px-3 py-2 rounded-card text-xs font-mono h-10 flex items-center transition-all duration-200
                    ${showFilters ? 'border-accent-sky/40 text-accent-sky' : 'text-text-secondary hover:text-white'}`}>
                  🔍 Filters
                </button>
              </div>

              {/* Info panels */}
              <div className="flex gap-2">
                {showWeather && weatherData && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="glass rounded-card px-4 py-3 shadow-xl w-48">
                    <div className="flex items-center gap-2">
                      <img src={getWeatherIconUrl(weatherData.icon)} alt="" className="w-8 h-8" />
                      <div>
                        <div className="font-mono text-lg text-white">{weatherData.temp}°C</div>
                        <div className="text-[10px] text-text-secondary capitalize">{weatherData.description}</div>
                      </div>
                    </div>
                    {weatherData.isMock && <div className="text-[9px] text-accent-amber font-mono mt-1">estimated data</div>}
                  </motion.div>
                )}
                {showCrowd && crowdData && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="glass rounded-card px-4 py-3 shadow-xl w-48">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{crowdData.icon}</span>
                      <div>
                        <div className="text-sm text-white font-medium" style={{ color: crowdColor }}>{crowdData.label}</div>
                        <div className="text-[10px] text-text-secondary">{crowdData.description}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Filters panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="glass rounded-card p-3 overflow-hidden">
                    <GlobeFilters />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 inset-x-0 z-[1000] pointer-events-none">
          <div className="flex items-end justify-between p-4 pointer-events-auto">
            <span className="font-mono text-[10px] text-text-secondary/40 glass-subtle px-2 py-0.5 rounded">
              {destination.lat.toFixed(4)}°, {destination.lng.toFixed(4)}°
            </span>
            <button onClick={() => setSelectedPanel('detail')}
              className="glass px-4 py-2.5 rounded-card text-text-secondary text-sm hover:text-white
                hover:border-accent-sky/30 transition-all duration-200">
              📋 Details
            </button>
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedPanel === 'detail' && (
            <DetailPanel
              destination={destination} weatherData={weatherData} crowdData={crowdData}
              onClose={() => setSelectedPanel(null)} onPlanTrip={() => setSelectedPanel('itinerary')}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
