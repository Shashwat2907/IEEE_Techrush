import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useCompare } from '../../context/CompareContext';
import { useApp } from '../../context/AppContext';
import { fetchDestinationPhoto, getDestinationPhoto } from '../../services/photos';
import { API_KEYS } from '../../config/api';
import { getWeather } from '../../services/weather';
import { getDestinationHotspots } from '../../services/destinations';
import { generateDestinationOverview } from '../../services/tripAssistantAI';
import {
  SunIcon,
  MapIcon,
  CloseIcon,
  CalendarIcon,
  CheckIcon,
  ScaleIcon,
} from '../../components/ui/Icons';

function HotelSlider({ stays, days, isDark, isAddedToItinerary, addingActivity, setAddingActivity, addDay, confirmAddActivity, formatPrice, handleAddActivityClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!stays || stays.length === 0) return null;

  const handleNext = (e) => {
    e.stopPropagation();
    setIsExpanded(false);
    setCurrentIndex((prev) => (prev + 1) % stays.length);
  };
  const handlePrev = (e) => {
    e.stopPropagation();
    setIsExpanded(false);
    setCurrentIndex((prev) => (prev - 1 + stays.length) % stays.length);
  };

  const activeStay = stays[currentIndex];
  const isAdded = isAddedToItinerary(activeStay.name);
  const isAdding = addingActivity?.name === activeStay.name;

  const amenities = ['Free WiFi', 'Breakfast', 'Pool', 'Parking'];

  return (
    <div className="relative w-full">
      {/* Card */}
      <motion.div
        layout
        className={`relative overflow-hidden rounded-2xl apple-liquid-glass border ${
          isDark ? 'border-white/10' : 'border-black/8'
        }`}
      >
        {/* Collapsed view — always fully readable */}
        <div className="p-3.5">
          {/* Hotel name + nav arrows */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{activeStay.name}</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                ★ {activeStay.rating} &nbsp;·&nbsp; {formatPrice(activeStay.cost)}/night
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={handlePrev} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${ isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/8 hover:bg-black/15 text-slate-700'}`}>‹</button>
              <span className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{currentIndex + 1}/{stays.length}</span>
              <button type="button" onClick={handleNext} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${ isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/8 hover:bg-black/15 text-slate-700'}`}>›</button>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`mt-2 text-[10px] font-semibold flex items-center gap-1 transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'}`}
          >
            {isExpanded ? '▴ Less info' : '▾ More details'}
          </button>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className={`px-3.5 pb-3 text-xs leading-relaxed border-t ${ isDark ? 'border-white/8 text-zinc-300' : 'border-black/6 text-slate-600'}`}>
                <p className="pt-3">Comfortable stay with great access to local attractions. Perfect for travellers who value location and quality service.</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {amenities.map((a) => (
                    <span key={a} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ isDark ? 'bg-white/10 text-zinc-300' : 'bg-black/6 text-slate-600'}`}>{a}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA footer */}
        <div className={`px-3.5 pb-3.5 pt-1 flex items-center gap-2 border-t ${ isDark ? 'border-white/8' : 'border-black/6'}`}>
          {isAdding ? (
            <>
              <select
                className={`flex-1 text-xs px-2 py-1.5 rounded-lg outline-none font-medium ${ isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-black/5 text-black border border-black/10'}`}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    const newId = addDay();
                    confirmAddActivity(newId, activeStay);
                  } else if (e.target.value) {
                    confirmAddActivity(e.target.value, activeStay);
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Select a day…</option>
                {days?.map((d) => (
                  <option key={d.id} value={d.id}>{d.formattedDate ? d.formattedDate : `Day ${d.dayNumber}`}</option>
                ))}
                <option value="new">+ New Day</option>
              </select>
              <button type="button" onClick={() => setAddingActivity(null)} className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 text-slate-500 flex items-center justify-center text-sm">✕</button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => !isAdded && handleAddActivityClick(activeStay)}
              disabled={isAdded}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isAdded
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default'
                  : isDark
                  ? 'bg-white/10 hover:bg-white/20 text-white'
                  : 'bg-slate-900 hover:bg-slate-700 text-white'
              }`}
            >
              {isAdded ? '✓ Added to itinerary' : '+ Add to itinerary'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1 mt-2">
        {stays.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setIsExpanded(false); setCurrentIndex(i); }}
            className={`h-1.5 rounded-full transition-all ${
              i === currentIndex
                ? `w-4 ${ isDark ? 'bg-white' : 'bg-slate-800'}`
                : `w-1.5 ${ isDark ? 'bg-white/25' : 'bg-black/20'}`
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function DetailPanel({
  destination,
  weatherData,
  crowdData,
  onClose,
  onPlanTrip,
}) {
  const { isDark } = useTheme();
  const { addActivity, addDay, days } = useItinerary();
  const { formatPrice } = useCurrency();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const { showCrowdHeatmap, toggleCrowdHeatmap } = useApp();
  const [addingActivity, setAddingActivity] = useState(null);
  const [liveWeather, setLiveWeather] = useState(null);

  const fallbackPhoto = useMemo(() => getDestinationPhoto(destination), [destination]);
  const [photoUrl, setPhotoUrl] = useState(fallbackPhoto);
  const [description, setDescription] = useState(destination?.description || '');

  const displayActivities = useMemo(() => {
    if (destination?.activities && destination.activities.length > 0) {
      return destination.activities;
    }
    const cleanName = destination?.name?.split(',')[0] || 'Local Area';
    return [
      { name: `Explore ${cleanName} Historic District & Architecture`, durationHrs: 2.5, cost: 0, type: 'activity' },
      { name: `Local Markets & Culinary Tasting in ${cleanName}`, durationHrs: 2.0, cost: 25, type: 'food' },
      { name: `Panoramic Sunset & Scenic Landscape Walk`, durationHrs: 2.0, cost: 0, type: 'activity' },
    ];
  }, [destination]);
  const hotspots = useMemo(() => getDestinationHotspots(destination), [destination]);

  useEffect(() => {
    let isMounted = true;
    if (destination?.lat !== undefined && destination?.lng !== undefined) {
      getWeather(destination.lat, destination.lng).then((res) => {
        if (isMounted && res) {
          setLiveWeather(res);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [destination?.lat, destination?.lng]);

  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(fallbackPhoto);
    fetchDestinationPhoto(destination, API_KEYS.UNSPLASH).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    
    // Fetch overview if missing
    setDescription(destination?.description || '');
    if (!destination?.description && destination?.name && destination.name !== 'Resolving Location...') {
      generateDestinationOverview(destination.name).then(desc => {
        if (!cancelled && desc) setDescription(desc);
      });
    }
    
    return () => { cancelled = true; };
  }, [destination, fallbackPhoto]);

  if (!destination) return null;

  const inCompare = isInCompare(destination.id);

  const toggleCompare = () => {
    if (inCompare) {
      removeFromCompare(destination.id);
    } else {
      addToCompare(destination);
    }
  };

  const isAddedToItinerary = (activityName) => {
    return days?.some((day) => day.activities?.some((act) => act.name === activityName));
  };

  const handleAddActivityClick = (activity) => {
    if (!days || days.length === 0) {
      const newDayId = addDay();
      confirmAddActivity(newDayId, activity);
    } else {
      setAddingActivity(activity);
    }
  };

  const confirmAddActivity = (dayId, activity = addingActivity) => {
    if (!activity) return;
    addActivity(dayId, {
      name: activity.name,
      durationHrs: activity.durationHrs || 2,
      cost: activity.cost || 0,
      type: activity.type || 'activity',
      lat: activity.lat,
      lng: activity.lng,
    });
    setAddingActivity(null);
  };

  const handleHotspotDrag = (event, hotspot) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/tripnest-hotspot', JSON.stringify({
      name: hotspot.name,
      durationHrs: hotspot.durationHrs,
      cost: hotspot.cost,
      type: hotspot.type,
      lat: hotspot.lat,
      lng: hotspot.lng,
      notes: hotspot.dietary ? `${hotspot.dietary} · ${hotspot.specialty}` : `Rated ${hotspot.rating}/5`,
    }));
  };

  const weather = liveWeather || weatherData || {
    temp: 24,
    condition: 'Clear Sky',
    humidity: 48,
    wind: 12,
    source: 'Simulated',
  };

  const crowd = crowdData || {
    level: destination.crowdLevel || 'Moderate',
    status: destination.crowdLevel === 'low' ? 'Low Traffic' : 'Standard Flux',
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'} font-sans select-none overflow-hidden`}>
      {/* ─── Top Navigation Header ─── */}
      <div
        className="p-3.5 sm:p-4 border-b apple-liquid-glass flex items-center justify-between shrink-0 z-10"
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
        {description && (
          <div className="p-4 rounded-2xl apple-liquid-glass">
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'} font-medium`}>
              {description}
            </p>
          </div>
        )}

        {/* ─── Bento Metrics Grid ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Atmosphere & Weather Spec */}
          <div className="col-span-2 p-4 rounded-2xl apple-liquid-glass flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <SunIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                    Atmosphere
                  </span>
                  {weather.isLive && (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                      {weather.source || 'Live'}
                    </span>
                  )}
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

          <div className="p-4 rounded-2xl apple-liquid-glass space-y-1 relative">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider flex justify-between items-center">
              <span>Crowd Flux</span>
              <button
                type="button"
                onClick={toggleCrowdHeatmap}
                className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold transition-colors cursor-pointer ${
                  showCrowdHeatmap
                    ? 'bg-orange-500 text-white'
                    : 'bg-black/10 dark:bg-white/20 text-slate-500 dark:text-zinc-300'
                }`}
              >
                {showCrowdHeatmap ? 'MAP ON' : 'MAP OFF'}
              </button>
            </div>
            <div className={`text-sm font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {crowd.level}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
              {crowd.status}
            </div>
          </div>

          {/* Budget Tier */}
          <div className="p-4 rounded-2xl apple-liquid-glass space-y-1">
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
        {displayActivities && displayActivities.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
                {destination.activities?.length ? `Curated Sights (${destination.activities.length})` : 'Suggested Highlights'}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                Quick Stage
              </span>
            </div>

            <div className="space-y-2">
              {displayActivities.map((act, idx) => {
                const isAdded = isAddedToItinerary(act.name);
                const isAdding = addingActivity?.name === act.name;
                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden p-3.5 rounded-2xl apple-liquid-glass flex items-center justify-between gap-3"
                  >
                    <div className="relative flex-1 min-w-0">
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                        {act.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                        {act.durationHrs ? `${act.durationHrs}h` : '2h'} • {act.cost > 0 ? formatPrice(act.cost) : 'Free Access'}
                      </div>
                    </div>

                    {isAdding ? (
                      <div className="flex items-center gap-1 shrink-0 z-20">
                        <select
                          className={`text-[10px] px-1 py-1 rounded-md outline-none ${isDark ? 'bg-[#1A1A22] text-white' : 'bg-white text-black'}`}
                          onChange={(e) => {
                            if (e.target.value === 'new') {
                              const newId = addDay();
                              confirmAddActivity(newId, act);
                            } else if (e.target.value) {
                              confirmAddActivity(e.target.value, act);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Select Day</option>
                          {days?.map((d) => (
                            <option key={d.id} value={d.id}>Day {d.dayNumber}</option>
                          ))}
                          <option value="new">+ New Day</option>
                        </select>
                        <button type="button" onClick={() => setAddingActivity(null)} className="p-1 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 text-slate-500">✕</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isAdded && handleAddActivityClick(act)}
                        disabled={isAdded}
                        className={`relative px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Top 5 stays</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Budget-aware</span>
          </div>
          <div className="flex w-full">
            <HotelSlider
              stays={hotspots.stays}
              days={days}
              isDark={isDark}
              isAddedToItinerary={isAddedToItinerary}
              addingActivity={addingActivity}
              setAddingActivity={setAddingActivity}
              addDay={addDay}
              confirmAddActivity={confirmAddActivity}
              formatPrice={formatPrice}
              handleAddActivityClick={handleAddActivityClick}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Top 5 foods</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Veg + non-veg picks</span>
          </div>
          <div className="space-y-2">
            {hotspots.foods.map((food) => {
              const isAdded = isAddedToItinerary(food.name);
              const isAdding = addingActivity?.name === food.name;
              return (
                <div key={food.name} draggable onDragStart={(event) => handleHotspotDrag(event, food)} className="relative overflow-hidden p-3 rounded-2xl flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing apple-liquid-glass">
                  <div className="relative min-w-0"><p className="text-xs font-bold truncate">{food.name}</p><p className="mt-0.5 text-[10px] text-slate-500 dark:text-zinc-400 truncate">{food.dietary} · {food.specialty}</p></div>
                  {isAdding ? (
                    <div className="flex items-center gap-1 shrink-0 z-20">
                      <select
                        className={`text-[9px] px-1 py-0.5 rounded-md outline-none ${isDark ? 'bg-[#1A1A22] text-white' : 'bg-white text-black'}`}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            const newId = addDay();
                            confirmAddActivity(newId, food);
                          } else if (e.target.value) {
                            confirmAddActivity(e.target.value, food);
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Select Day</option>
                        {days?.map((d) => (
                          <option key={d.id} value={d.id}>Day {d.dayNumber}</option>
                        ))}
                        <option value="new">+ New Day</option>
                      </select>
                      <button type="button" onClick={() => setAddingActivity(null)} className="p-1 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 text-slate-500">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => !isAdded && handleAddActivityClick(food)} disabled={isAdded} className={`relative shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${isAdded ? 'bg-emerald-500 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-zinc-200'}`}>{isAdded ? 'Added' : '+ Add'}</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Action Footer */}
      <div className="p-4 border-t apple-liquid-glass shrink-0">
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
