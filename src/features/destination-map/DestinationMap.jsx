import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Tooltip } from 'react-leaflet';
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
import { MAP_TILES } from '../../config/api';

// Fix leaflet default marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * Map center/zoom controller
 */
function MapController({ center, zoom }) {
  const map = useMap();
  const { navigateToGlobe } = useApp();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.4 });
    }
  }, [center, zoom, map]);

  useEffect(() => {
    const handleZoomEnd = () => {
      if (map.getZoom() <= 5) {
        navigateToGlobe(true);
      }
    };
    map.on('zoomend', handleZoomEnd);
    return () => map.off('zoomend', handleZoomEnd);
  }, [map, navigateToGlobe]);

  return null;
}

/**
 * Weather toggle overlay
 */
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

/**
 * Activity markers on the map connected by trail lines
 */
function ActivityMarkers({ destination, activities }) {
  if (!destination || !activities || activities.length === 0) return null;

  // Spread activities around the destination center
  const markers = activities.map((activity, i) => {
    const angle = (i / activities.length) * Math.PI * 2;
    const radius = 0.01 + (i % 3) * 0.005;
    const lat = destination.lat + Math.sin(angle) * radius;
    const lng = destination.lng + Math.cos(angle) * radius;
    return { ...activity, lat, lng };
  });

  return (
    <>
      {markers.map((activity, i) => (
        <CircleMarker
          key={activity.uid || `activity-${i}`}
          center={[activity.lat, activity.lng]}
          radius={6}
          pathOptions={{
            color: '#4C8C86',
            fillColor: '#4C8C86',
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} className="!bg-surface !text-text-primary !border-surface-raised !rounded-card !font-body !text-xs">
            <strong>{activity.name}</strong>
            <br />
            {activity.durationHrs}h · ${activity.cost}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

/**
 * Main Destination Map Component
 */
export default function DestinationMap() {
  const { selectedDestination, navigateToGlobe } = useApp();
  const { days, setDestination } = useItinerary();
  const [weatherData, setWeatherData] = useState(null);
  const [crowdData, setCrowdData] = useState(null);
  const [showWeather, setShowWeather] = useState(false);
  const [showCrowd, setShowCrowd] = useState(true);
  const [selectedPanel, setSelectedPanel] = useState(null); // 'detail' | 'itinerary' | null
  const [isLoading, setIsLoading] = useState(true);

  const destination = useMemo(() => {
    if (!selectedDestination) return null;
    return getDestinationById(selectedDestination.id) || selectedDestination;
  }, [selectedDestination]);

  // Load weather and crowd data
  useEffect(() => {
    if (!destination) return;

    setIsLoading(true);
    setDestination(destination.id, destination.name);

    Promise.all([
      getWeather(destination.lat, destination.lng),
      getCrowdLevel(destination.id),
    ]).then(([weather, crowd]) => {
      setWeatherData(weather);
      setCrowdData(crowd);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [destination, setDestination]);

  // Get all itinerary activities for map display
  const allActivities = useMemo(() => {
    return days.flatMap(day => day.activities);
  }, [days]);

  if (!destination) return null;

  const center = [destination.lat, destination.lng];
  const crowdColor = crowdData ? getCrowdColor(crowdData.level) : '#C9A227';

  return (
    <ErrorBoundary name="Destination Map">
      <div className="relative w-full h-full">
        {/* Map */}
        <MapContainer
          center={center}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapController center={center} zoom={12} />

          {/* Base tile layer */}
          <TileLayer
            url={MAP_TILES.DARK}
            attribution={MAP_TILES.DARK_ATTR}
          />

          {/* Weather overlay */}
          <WeatherLayer visible={showWeather} />

          {/* Main destination marker */}
          <CircleMarker
            center={center}
            radius={12}
            pathOptions={{
              color: crowdColor,
              fillColor: crowdColor,
              fillOpacity: 0.3,
              weight: 3,
            }}
            eventHandlers={{
              click: () => setSelectedPanel('detail'),
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -15]}
              className="!bg-surface !text-text-primary !border-surface-raised !rounded-card !font-display !text-sm !font-semibold !px-3 !py-1">
              {destination.name}
            </Tooltip>
          </CircleMarker>

          {/* Crowd level ring */}
          {showCrowd && (
            <CircleMarker
              center={center}
              radius={25}
              pathOptions={{
                color: crowdColor,
                fillColor: 'transparent',
                weight: 2,
                opacity: 0.4,
                dashArray: '5,5',
              }}
            />
          )}

          {/* Activity markers from itinerary */}
          <ActivityMarkers destination={destination} activities={allActivities} />
        </MapContainer>

        {/* Top bar & attached panels */}
        <div className="absolute top-0 inset-x-0 z-[1000] pointer-events-none">
          {/* Top Control Bar */}
          <div className="flex items-start justify-between p-4 pointer-events-auto">
            {/* Back to globe */}
            <button
              onClick={() => navigateToGlobe(false)}
              className="flex items-center gap-2 px-4 py-2 bg-surface/90 backdrop-blur-sm
                border border-surface-raised rounded-card text-text-secondary text-sm
                hover:text-text-primary hover:border-accent-trail transition-all duration-200 h-10"
            >
              <span>🌍</span>
              <span className="font-body">Back to Globe</span>
            </button>

            {/* Destination name */}
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-text-primary
                bg-surface/90 backdrop-blur-sm px-4 py-2 rounded-card border border-surface-raised h-10 flex items-center justify-center">
                {destination.name}
              </h2>
            </div>

            {/* Toggle controls & expanded info panels */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWeather(!showWeather)}
                  className={`px-3 py-2 rounded-card text-xs font-mono border transition-all duration-200 h-10 flex items-center
                    ${showWeather
                      ? 'bg-accent-trail/20 border-accent-trail text-accent-trail'
                      : 'bg-surface/90 border-surface-raised text-text-secondary hover:text-text-primary'
                    } backdrop-blur-sm`}
                >
                  🌤️ Weather
                </button>
                <button
                  onClick={() => setShowCrowd(!showCrowd)}
                  className={`px-3 py-2 rounded-card text-xs font-mono border transition-all duration-200 h-10 flex items-center
                    ${showCrowd
                      ? 'bg-accent-trail/20 border-accent-trail text-accent-trail'
                      : 'bg-surface/90 border-surface-raised text-text-secondary hover:text-text-primary'
                    } backdrop-blur-sm`}
                >
                  👥 Crowd
                </button>
              </div>

              {/* Info Panels directly beneath buttons */}
              <div className="flex gap-2">
                {showWeather && weatherData && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="bg-surface/95 backdrop-blur-md border border-surface-raised rounded-card px-4 py-3 shadow-lg shadow-black/20 w-48">
                    <div className="flex items-center gap-2">
                      <img src={getWeatherIconUrl(weatherData.icon)} alt="" className="w-8 h-8" />
                      <div>
                        <div className="font-mono text-lg text-text-primary">{weatherData.temp}°C</div>
                        <div className="text-[10px] text-text-secondary capitalize">{weatherData.description}</div>
                      </div>
                    </div>
                    {weatherData.isMock && (
                      <div className="text-[9px] text-accent-ochre font-mono mt-1">showing estimated data</div>
                    )}
                  </motion.div>
                )}

                {showCrowd && crowdData && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="bg-surface/95 backdrop-blur-md border border-surface-raised rounded-card px-4 py-3 shadow-lg shadow-black/20 w-48">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{crowdData.icon}</span>
                      <div>
                        <div className="text-sm text-text-primary font-medium" style={{ color: crowdColor }}>
                          {crowdData.label}
                        </div>
                        <div className="text-[10px] text-text-secondary">{crowdData.description}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom info bar (actions only) */}
        <div className="absolute bottom-0 inset-x-0 z-[1000] pointer-events-none">
          <div className="flex items-end justify-end p-4 pointer-events-auto">

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPanel('detail')}
                className="px-4 py-2.5 bg-surface/90 backdrop-blur-sm border border-surface-raised
                  rounded-card text-text-secondary text-sm hover:text-text-primary
                  hover:border-accent-trail transition-all duration-200"
              >
                📋 Details
              </button>
              <button
                onClick={() => setSelectedPanel('itinerary')}
                className="px-4 py-2.5 bg-accent-ochre text-bg-base rounded-card text-sm
                  font-semibold hover:opacity-90 transition-opacity"
              >
                📅 Plan Trip
              </button>
            </div>
          </div>
        </div>

        {/* Coordinate display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
          <span className="font-mono text-[10px] text-text-secondary/50 bg-surface/60 px-2 py-0.5 rounded">
            {destination.lat.toFixed(4)}° N, {destination.lng.toFixed(4)}° E
          </span>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedPanel === 'detail' && (
            <DetailPanel
              destination={destination}
              weatherData={weatherData}
              crowdData={crowdData}
              onClose={() => setSelectedPanel(null)}
              onPlanTrip={() => setSelectedPanel('itinerary')}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
