import { motion } from 'framer-motion';
import { useItinerary } from '../../context/ItineraryContext';
import {
  PinIcon,
  CalendarIcon,
  DollarIcon,
  UsersIcon,
  SunIcon,
  ClockIcon,
  PlusIcon,
  CloseIcon,
  WarningIcon,
} from '../../components/ui/Icons';

export default function DetailPanel({ destination, weatherData, crowdData, onClose, onPlanTrip }) {
  const { addActivity, days } = useItinerary();

  if (!destination) return null;

  const handleAddActivity = (activity) => {
    const targetDay = days[0];
    if (targetDay) addActivity(targetDay.id, activity);
  };

  const crowdColor = crowdData?.color || '#F59E0B';

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="absolute top-0 right-0 h-full w-full sm:w-[400px] sm:max-w-[90vw] z-[1001] bg-surface/95 backdrop-blur-2xl border-l border-white/10 overflow-y-auto shadow-2xl"
    >
      {/* Header */}
      <div className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-white/5 p-5 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-white tracking-wide">{destination.name}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-text-secondary text-sm mt-1.5 font-body leading-relaxed">{destination.description}</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Quick info */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            icon={<PinIcon className="w-4 h-4 text-accent-sky" />}
            label="Coordinates"
            value={`${destination.lat.toFixed(2)}°, ${destination.lng.toFixed(2)}°`}
            mono
          />
          <InfoCard
            icon={<CalendarIcon className="w-4 h-4 text-accent-amber" />}
            label="Best Time"
            value={destination.bestTimeToVisit}
          />
          <InfoCard
            icon={<DollarIcon className="w-4 h-4 text-accent-emerald" />}
            label="Budget"
            value={destination.budgetTier}
            capitalize
          />
          <InfoCard
            icon={<UsersIcon className="w-4 h-4" />}
            label="Crowd"
            value={crowdData?.label || destination.crowdLevel}
            color={crowdColor}
          />
        </div>

        {/* Weather */}
        {weatherData && (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-3">Current Weather</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-raised flex items-center justify-center">
                <SunIcon className="w-6 h-6 text-accent-amber" />
              </div>
              <div>
                <div className="font-mono text-2xl text-white font-bold">{weatherData.temp}°C</div>
                <div className="text-xs text-text-secondary capitalize">{weatherData.description}</div>
                <div className="text-[11px] text-text-secondary/70 font-mono mt-1">
                  Humidity: {weatherData.humidity}% · Wind: {weatherData.wind} km/h
                </div>
              </div>
            </div>
            {weatherData.isMock && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-accent-amber font-mono">
                <WarningIcon className="w-3 h-3" />
                <span>Estimated data</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">Categories</h4>
          <div className="flex flex-wrap gap-1.5">
            {destination.type?.map((t) => (
              <span key={t} className="chip active text-xs capitalize">
                {t}
              </span>
            ))}
            {destination.season?.map((s) => (
              <span key={s} className="chip text-xs capitalize">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider">Suggested Activities</h4>
            <span className="text-[10px] text-text-secondary font-mono">+ to add</span>
          </div>
          <div className="space-y-2">
            {destination.activities?.map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5 hover:border-accent-sky/20 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-body font-medium truncate">{activity.name}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-secondary font-mono flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {activity.durationHrs}h
                    </span>
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{ color: activity.cost === 0 ? '#10B981' : '#F59E0B' }}
                    >
                      {activity.cost === 0 ? 'Free' : `$${activity.cost}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddActivity(activity)}
                  className="ml-2 w-7 h-7 flex items-center justify-center rounded-lg bg-accent-sky/10 text-accent-sky text-sm opacity-0 group-hover:opacity-100 hover:bg-accent-sky/20 transition-all duration-200"
                  title="Add to Itinerary"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onPlanTrip}
          className="w-full py-3.5 bg-accent-sky text-bg-base rounded-xl font-body font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Build Itinerary</span>
        </button>
      </div>
    </motion.div>
  );
}

function InfoCard({ icon, label, value, mono, capitalize, color }) {
  return (
    <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
      <div className="flex items-center gap-2 mb-1.5">
        <span>{icon}</span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`text-sm text-white font-medium ${mono ? 'font-mono' : 'font-body'} ${
          capitalize ? 'capitalize' : ''
        }`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
