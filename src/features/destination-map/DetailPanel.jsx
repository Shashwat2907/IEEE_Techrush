import { useState } from 'react';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { getDestinationPhoto } from '../../services/photos';
import {
  CalendarIcon,
  DollarIcon,
  UsersIcon,
  SunIcon,
  ClockIcon,
  PlusIcon,
  CloseIcon,
  BedIcon,
  UtensilsIcon,
  CompassIcon,
  CarIcon,
  MoonIcon,
} from '../../components/ui/Icons';

export default function DetailPanel({ destination, weatherData, crowdData, onClose, onPlanTrip }) {
  const { addActivity, days } = useItinerary();
  const { formatPrice } = useCurrency();
  const [imageError, setImageError] = useState(false);
  const [addedIndex, setAddedIndex] = useState(null);

  if (!destination) return null;

  const handleAddActivity = (activity, index) => {
    const targetDay = days[0];
    if (targetDay) {
      addActivity(targetDay.id, {
        name: activity.name,
        durationHrs: activity.durationHrs || 2,
        cost: activity.cost || 0,
        type: activity.type || 'activity',
      });
      setAddedIndex(index);
      setTimeout(() => setAddedIndex(null), 1200);
    }
  };

  const crowdColor = crowdData?.color || '#F59E0B';
  const heroImageUrl = imageError ? null : getDestinationPhoto(destination);

  return (
    <div className="h-full w-full flex flex-col bg-[#0B101B] text-text-primary overflow-hidden select-none">
      {/* Hero Image & Header */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden flex-shrink-0 bg-[#06090F]">
        <img
          src={heroImageUrl}
          alt={destination.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover brightness-[0.8] transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-[#0B101B]/40 to-transparent" />

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-md transition-all z-10 cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}

        {/* Destination Title */}
        <div className="absolute bottom-3.5 left-4 right-4 z-10">
          <span className="text-[11px] font-medium text-accent-sky uppercase tracking-wider bg-accent-sky/15 px-2.5 py-0.5 rounded-full border border-accent-sky/20">
            Overview
          </span>
          <h3 className="font-display text-2xl font-bold text-white tracking-wide mt-1.5 drop-shadow-md">
            {destination.name}
          </h3>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Description */}
        <p className="text-text-secondary text-xs sm:text-sm font-body leading-relaxed">
          {destination.description ||
            `Experience the authentic culture, local flavors, and memorable landmarks of ${destination.name}.`}
        </p>

        {/* Live Weather & Crowd row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Weather Card */}
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium uppercase tracking-wider mb-1">
              <SunIcon className="w-3.5 h-3.5 text-accent-amber" />
              <span>Weather</span>
            </div>
            <div className="text-lg font-bold text-white">
              {weatherData ? `${weatherData.temp}°C` : '—'}
            </div>
            <div className="text-xs text-text-secondary capitalize truncate mt-0.5">
              {weatherData ? weatherData.description : 'Fetching forecast...'}
            </div>
          </div>

          {/* Crowd Card */}
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium uppercase tracking-wider mb-1">
              <UsersIcon className="w-3.5 h-3.5 text-accent-sky" />
              <span>Crowd Level</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crowdColor }} />
              <span className="text-sm font-semibold text-white capitalize">
                {crowdData?.level || destination.crowdLevel || 'Moderate'}
              </span>
            </div>
            <div className="text-xs text-text-secondary capitalize truncate mt-0.5">
              {destination.bestTimeToVisit ? `Best: ${destination.bestTimeToVisit}` : 'Seasonal travel'}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium uppercase tracking-wider mb-1">
              <DollarIcon className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Budget Tier</span>
            </div>
            <div className="text-sm font-semibold text-white capitalize">
              {destination.budgetTier || 'Mid-range'}
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium uppercase tracking-wider mb-1">
              <CalendarIcon className="w-3.5 h-3.5 text-accent-sky" />
              <span>Best Season</span>
            </div>
            <div className="text-sm font-semibold text-white capitalize">
              {destination.season?.join(', ') || 'All Year'}
            </div>
          </div>
        </div>

        {/* Categories / Tags */}
        {destination.type && destination.type.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-2">
              Vibe & Highlights
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {destination.type.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium uppercase bg-white/[0.04] text-text-secondary border border-white/[0.06]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Activities */}
        {destination.activities && destination.activities.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
                Top Experiences
              </h4>
              <span className="text-[11px] text-text-secondary">Click + to add</span>
            </div>

            <div className="space-y-2">
              {destination.activities.map((activity, i) => {
                const isAdded = addedIndex === i;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/[0.04] transition-colors group"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-xs font-semibold text-white/95 truncate">
                        {activity.name}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-text-secondary mt-1">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {activity.durationHrs}h
                        </span>
                        <span className="text-accent-emerald font-medium">
                          {formatPrice(activity.cost)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddActivity(activity, i)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-accent-emerald text-slate-950 border-accent-emerald'
                          : 'bg-white/5 hover:bg-accent-sky/20 text-text-secondary hover:text-accent-sky border-white/5 hover:border-accent-sky/30'
                      }`}
                      title="Add to Day 1"
                    >
                      {isAdded ? (
                        <span className="text-xs font-bold px-1">✓</span>
                      ) : (
                        <PlusIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/[0.06] bg-[#0B101B] flex items-center gap-3">
        {onPlanTrip && (
          <button
            onClick={onPlanTrip}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-sky text-slate-950 text-xs font-bold font-body hover:bg-sky-400 active:scale-[0.98] transition-all shadow-lg shadow-accent-sky/20 cursor-pointer"
          >
            <CalendarIcon className="w-4 h-4" />
            Open Itinerary Planner
          </button>
        )}
      </div>
    </div>
  );
}
