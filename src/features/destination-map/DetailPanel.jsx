import { useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCompare } from '../../context/CompareContext';
import { getDestinationPhoto } from '../../services/photos';
import {
  SunIcon,
  MapIcon,
  CloseIcon,
  CalendarIcon,
  CheckIcon,
  ScaleIcon,
} from '../../components/ui/Icons';

export default function DetailPanel({
  destination,
  weatherData,
  crowdData,
  onClose,
  onPlanTrip,
}) {
  const { isDark } = useTheme();
  const { addActivity, days } = useItinerary();
  const { formatPrice } = useCurrency();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const [addedActivities, setAddedActivities] = useState(new Set());

  const photoUrl = useMemo(() => getDestinationPhoto(destination), [destination]);

  if (!destination) return null;

  const inCompare = isInCompare(destination.id);

  const toggleCompare = () => {
    if (inCompare) {
      removeFromCompare(destination.id);
    } else {
      addToCompare(destination);
    }
  };

  const handleAddActivity = (activity, index) => {
    const targetDayId = days?.[0]?.id || 'day-1';
    addActivity(targetDayId, {
      name: activity.name,
      durationHrs: activity.durationHrs || 2,
      cost: activity.cost || 0,
      type: activity.type || 'activity',
    });
    setAddedActivities((prev) => new Set([...prev, index]));
  };

  const weather = weatherData || {
    temp: 24,
    condition: 'Clear Sky',
    humidity: 48,
    wind: 12,
  };

  const crowd = crowdData || {
    level: destination.crowdLevel || 'Moderate',
    status: destination.crowdLevel === 'low' ? 'Low Traffic' : 'Standard Flux',
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'} font-sans select-none overflow-hidden`}>
      {/* ─── Top Navigation Header ─── */}
      <div
        className={`p-3.5 sm:p-4 border-b ${
          isDark ? 'border-white/10 bg-[#121826]/70' : 'border-black/10 bg-white/70'
        } backdrop-blur-2xl flex items-center justify-between shrink-0 z-10`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <MapIcon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
            {destination.country || 'Global Destination'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Compare Button */}
          <button
            type="button"
            onClick={toggleCompare}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              inCompare
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : isDark
                ? 'bg-white/10 hover:bg-white/20 text-zinc-300 border-white/10'
                : 'bg-black/5 hover:bg-black/10 text-slate-700 border-black/10'
            }`}
            title={inCompare ? 'Remove from compare' : 'Add to compare'}
          >
            <ScaleIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{inCompare ? 'In Compare' : 'Compare'}</span>
          </button>

          {/* Close Dossier Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Close Dossier"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Scrollable Dossier Content ─── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
        {/* Photo Bento Hero Banner */}
        <div
          className={`relative h-48 w-full rounded-2xl overflow-hidden border ${
            isDark ? 'border-white/15' : 'border-black/10'
          } shadow-lg bg-black/40`}
        >
          <img
            src={photoUrl}
            alt={destination.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="min-w-0 pr-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase drop-shadow truncate">
                {destination.name}
              </h2>
              <div className="text-xs text-zinc-300 font-medium mt-0.5">
                {destination.lat?.toFixed(2)}°N, {destination.lng?.toFixed(2)}°E
              </div>
            </div>
            <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/80 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shrink-0">
              Active
            </div>
          </div>
        </div>

        {/* Destination Editorial Overview */}
        {destination.description && (
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#121826]/75 border-white/10' : 'bg-white/80 border-black/10 shadow-sm'
            } backdrop-blur-xl`}
          >
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'} font-medium`}>
              {destination.description}
            </p>
          </div>
        )}

        {/* ─── Bento Metrics Grid ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Atmosphere & Weather Spec */}
          <div
            className={`col-span-2 p-4 rounded-2xl border ${
              isDark ? 'bg-[#121826]/75 border-white/10' : 'bg-white/80 border-black/10 shadow-sm'
            } backdrop-blur-xl flex items-center justify-between`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <SunIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                  Atmosphere
                </div>
                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} mt-0.5`}>
                  {weather.condition}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {weather.temp}°C
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                Humidity: {weather.humidity}% | Wind: {weather.wind}km/h
              </div>
            </div>
          </div>

          {/* Crowd Flux */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#121826]/75 border-white/10' : 'bg-white/80 border-black/10 shadow-sm'
            } backdrop-blur-xl space-y-1`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              Crowd Flux
            </div>
            <div className={`text-sm font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {crowd.level}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
              {crowd.status}
            </div>
          </div>

          {/* Budget Tier */}
          <div
            className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#121826]/75 border-white/10' : 'bg-white/80 border-black/10 shadow-sm'
            } backdrop-blur-xl space-y-1`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              Budget Tier
            </div>
            <div className={`text-sm font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {destination.budgetTier || 'Mid-Range'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
              Estimated Average
            </div>
          </div>

          {/* Optimal Window */}
          <div
            className={`col-span-2 p-4 rounded-2xl border ${
              isDark ? 'bg-[#121826]/75 border-white/10' : 'bg-white/80 border-black/10 shadow-sm'
            } backdrop-blur-xl flex items-center justify-between`}
          >
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                Optimal Window
              </div>
              <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} mt-0.5`}>
                {destination.bestTimeToVisit || 'Year-Round'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Curated Sights & Experiences */}
        {destination.activities && destination.activities.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                Curated Sights ({destination.activities.length})
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                Quick Stage
              </span>
            </div>

            <div className="space-y-2">
              {destination.activities.map((act, idx) => {
                const isAdded = addedActivities.has(idx);
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border ${
                      isDark ? 'bg-[#121826]/75 border-white/10' : 'bg-white/80 border-black/10 shadow-sm'
                    } backdrop-blur-xl flex items-center justify-between gap-3`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                        {act.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                        {act.durationHrs ? `${act.durationHrs}h` : '2h'} • {act.cost > 0 ? formatPrice(act.cost) : 'Free Access'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddActivity(act, idx)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                        isAdded
                          ? 'bg-emerald-500 text-white shadow-sm font-bold'
                          : isDark
                          ? 'bg-white/10 hover:bg-white text-white hover:text-black'
                          : 'bg-black/5 hover:bg-slate-900 text-slate-800 hover:text-white'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span>Staged</span>
                        </>
                      ) : (
                        <span>+ Add</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Footer */}
      <div
        className={`p-4 ${
          isDark ? 'bg-[#121826]/70 border-white/10' : 'bg-white/70 border-black/10'
        } border-t backdrop-blur-xl shrink-0`}
      >
        <button
          type="button"
          onClick={onPlanTrip}
          className="w-full btn-primary py-3 text-xs font-bold rounded-full cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Plan Full Itinerary</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
