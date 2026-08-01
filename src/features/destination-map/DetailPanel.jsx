import { motion } from 'framer-motion';
import { useItinerary } from '../../context/ItineraryContext';

export default function DetailPanel({ destination, weatherData, crowdData, onClose, onPlanTrip }) {
  const { addActivity, days } = useItinerary();

  if (!destination) return null;

  const handleAddActivity = (activity) => {
    // Add to the first day that has space
    const targetDay = days[0];
    if (targetDay) {
      addActivity(targetDay.id, activity);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="absolute top-0 right-0 h-full w-[400px] max-w-[90vw] z-[1001]
        bg-surface/95 backdrop-blur-xl border-l border-surface-raised
        overflow-y-auto shadow-2xl shadow-black/40"
    >
      {/* Header */}
      <div className="sticky top-0 bg-surface/95 backdrop-blur-xl border-b border-surface-raised p-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold text-text-primary">
            {destination.name}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
              hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-text-secondary text-sm mt-1 font-body">
          {destination.description}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick info */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard
            icon="📍"
            label="Coordinates"
            value={`${destination.lat.toFixed(2)}°, ${destination.lng.toFixed(2)}°`}
            mono
          />
          <InfoCard
            icon="📅"
            label="Best Time"
            value={destination.bestTimeToVisit}
          />
          <InfoCard
            icon="💰"
            label="Budget Tier"
            value={destination.budgetTier}
            capitalize
          />
          <InfoCard
            icon={crowdData?.icon || '👥'}
            label="Crowd Level"
            value={crowdData?.label || destination.crowdLevel}
            color={crowdData?.color}
          />
        </div>

        {/* Weather */}
        {weatherData && (
          <div className="bg-surface-raised/50 rounded-card p-4">
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-3">
              Current Weather
            </h4>
            <div className="flex items-center gap-4">
              <img src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`} alt="" className="w-14 h-14" />
              <div>
                <div className="font-mono text-2xl text-text-primary">{weatherData.temp}°C</div>
                <div className="text-sm text-text-secondary capitalize">{weatherData.description}</div>
                <div className="text-xs text-text-secondary mt-1">
                  💧 {weatherData.humidity}% · 💨 {weatherData.wind} km/h
                </div>
              </div>
            </div>
            {weatherData.isMock && (
              <div className="mt-2 text-[10px] text-accent-ochre font-mono flex items-center gap-1">
                ⚠ showing estimated data
              </div>
            )}
          </div>
        )}

        {/* Type tags */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2">
            Categories
          </h4>
          <div className="flex flex-wrap gap-2">
            {destination.type?.map(t => (
              <span key={t} className="chip active text-xs">
                {t}
              </span>
            ))}
            {destination.season?.map(s => (
              <span key={s} className="chip text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider">
              Activities
            </h4>
            <span className="text-[10px] text-text-secondary font-mono">
              Click + to add to itinerary
            </span>
          </div>
          <div className="space-y-2">
            {destination.activities?.map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-surface-raised/30
                  rounded-card border border-surface-raised/50 hover:border-accent-trail/30
                  transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-body font-medium truncate">
                    {activity.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-text-secondary font-mono">
                      ⏱ {activity.durationHrs}h
                    </span>
                    <span className="text-xs font-mono" style={{
                      color: activity.cost === 0 ? '#5B8A5A' : '#C9A227'
                    }}>
                      {activity.cost === 0 ? 'Free' : `$${activity.cost}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleAddActivity(activity)}
                  className="ml-2 w-8 h-8 flex items-center justify-center rounded-full
                    bg-accent-trail/10 text-accent-trail text-sm
                    opacity-0 group-hover:opacity-100 hover:bg-accent-trail/20
                    transition-all duration-200"
                  title="Add to Day 1"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Plan trip CTA */}
        <button
          onClick={onPlanTrip}
          className="w-full py-3 bg-accent-ochre text-bg-base rounded-card font-body
            font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          📅 Build Itinerary
        </button>
      </div>
    </motion.div>
  );
}

function InfoCard({ icon, label, value, mono, capitalize, color }) {
  return (
    <div className="bg-surface-raised/30 rounded-card p-3 border border-surface-raised/50">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`text-sm text-text-primary font-medium ${mono ? 'font-mono' : 'font-body'} ${capitalize ? 'capitalize' : ''}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
