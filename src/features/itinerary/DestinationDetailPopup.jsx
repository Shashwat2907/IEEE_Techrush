import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDestinationPhoto } from '../../services/photos';
import { CloseIcon, CalendarIcon, CompassIcon, SunIcon, DollarIcon } from '../../components/ui/Icons';

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function MapPinIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function DestinationDetailPopup({ destination, isDark, onClose, onViewOnGlobe }) {
  const [expandedActivityId, setExpandedActivityId] = useState(null);
  
  // Ref for sections to scroll to
  const overviewRef = useRef(null);
  const activitiesRef = useRef(null);
  const staysRef = useRef(null);
  const placesRef = useRef(null);
  const containerRef = useRef(null);
  
  const scrollTo = (ref) => {
    if (ref.current && containerRef.current) {
      containerRef.current.scrollTo({
        top: ref.current.offsetTop - 80, // offset for sticky nav
        behavior: 'smooth'
      });
    }
  };

  const navItems = [
    { label: 'Overview', ref: overviewRef },
    { label: 'Activities', ref: activitiesRef, count: destination.activities?.length },
    { label: 'Stays', ref: staysRef, count: destination.stays?.length },
    { label: 'Places', ref: placesRef, count: destination.places?.length },
  ].filter(item => item.count !== 0);

  const cityName = destination.name.split(',')[0].trim();
  const countryName = destination.country || destination.name.split(',')[1]?.trim() || 'Global';

  // Gather all markers for the map
  const mapMarkers = [];
  ['activities', 'stays', 'places'].forEach(category => {
    if (destination[category]) {
      destination[category].forEach(item => {
        if (item.location && item.location.lat && item.location.lng) {
          mapMarkers.push({
            ...item,
            category
          });
        }
      });
    }
  });

  return (
    <>
      {/* Dimmed Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup Container */}
      <div className="fixed inset-0 z-[2010] flex items-center justify-center p-4 sm:p-8 pointer-events-none">
        <motion.div
          layoutId={`dest-card-${destination.id}`}
          className={`pointer-events-auto w-full max-w-3xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden ${
            isDark ? 'bg-[#0E0E12] border-white/10 text-white' : 'bg-white border-black/10 text-[#0F172A]'
          } border`}
        >
            <div ref={containerRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative">
              {/* Image Header */}
              <div className="relative h-72 sm:h-96 w-full shrink-0">
                <img
                  src={getDestinationPhoto(destination)}
                  alt={destination.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>

                <div className="absolute bottom-5 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-emerald-400 border border-emerald-500/30">
                        {destination.season?.[0] || 'Year-Round'}
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-zinc-200 border border-white/15">
                        {destination.budgetTier || 'Mid-Range'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight drop-shadow-lg">
                        {cityName}
                      </h2>
                      <p className="text-sm sm:text-lg text-zinc-300 font-medium drop-shadow-md">
                        {countryName}
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={onViewOnGlobe}
                      className="px-4 py-3 rounded-full text-xs font-bold text-white border border-white/30 bg-black/40 backdrop-blur-md hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <MapPinIcon className="w-4 h-4" />
                      View on Globe
                    </button>
                    <button
                      onClick={onClose}
                      className="btn-primary px-6 py-3 text-xs font-bold rounded-full flex items-center gap-2 shadow-lg hover:scale-105 transition-transform cursor-pointer"
                    >
                      <span>Explore</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky Nav Strip */}
              <div className={`sticky top-0 z-10 px-6 py-3 border-b backdrop-blur-xl ${isDark ? 'border-white/10 bg-[#0E0E12]/80' : 'border-black/10 bg-white/80'} flex items-center gap-4 overflow-x-auto no-scrollbar`}>
                 {navItems.map(item => (
                   <button
                     key={item.label}
                     onClick={() => scrollTo(item.ref)}
                     className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap px-3 py-1.5 rounded-full transition-colors cursor-pointer ${isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-black hover:bg-black/5'}`}
                   >
                     {item.label} {item.count ? `(${item.count})` : ''}
                   </button>
                 ))}
              </div>

              {/* Content Body */}
              <div className="p-6 sm:p-8 space-y-12 pb-24">
                {/* OVERVIEW SECTION */}
                <div ref={overviewRef} className="space-y-6 scroll-mt-20">
                  <p className={`text-sm sm:text-base ${isDark ? 'text-zinc-300' : 'text-zinc-600'} leading-relaxed font-medium`}>
                    {destination.description}
                  </p>
                  
                  {/* Stat Chips Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Budget Chip */}
                    {destination.budget ? (
                      <div className={`p-4 rounded-2xl flex flex-col gap-2 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                        <div className="flex items-center gap-2 text-emerald-500">
                           <DollarIcon className="w-4 h-4" />
                           <span className="text-[10px] font-bold uppercase tracking-wider">Budget</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold">${destination.budget.perDayMin}–{destination.budget.perDayMax}/day</div>
                          <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>~${destination.budget.tripTotalMin}–{destination.budget.tripTotalMax} total</div>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl flex flex-col gap-2 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                        <div className="flex items-center gap-2 text-emerald-500">
                           <DollarIcon className="w-4 h-4" />
                           <span className="text-[10px] font-bold uppercase tracking-wider">Budget Tier</span>
                        </div>
                        <div className="text-sm font-bold capitalize">{destination.budgetTier}</div>
                      </div>
                    )}

                    {/* Weather Chip */}
                    {destination.weather ? (
                      <div className={`p-4 rounded-2xl flex flex-col gap-2 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                        <div className="flex items-center gap-2 text-blue-500">
                           <SunIcon className="w-4 h-4" />
                           <span className="text-[10px] font-bold uppercase tracking-wider">Weather</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold">{destination.weather.tempMin}–{destination.weather.tempMax}°C</div>
                          <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{destination.weather.condition}</div>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl flex flex-col gap-2 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                        <div className="flex items-center gap-2 text-blue-500">
                           <SunIcon className="w-4 h-4" />
                           <span className="text-[10px] font-bold uppercase tracking-wider">Season</span>
                        </div>
                        <div className="text-sm font-bold capitalize">{destination.season?.join(', ')}</div>
                      </div>
                    )}

                    {/* Best Time Chip */}
                    <div className={`p-4 rounded-2xl flex flex-col gap-2 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                      <div className="flex items-center gap-2 text-amber-500">
                         <CalendarIcon className="w-4 h-4" />
                         <span className="text-[10px] font-bold uppercase tracking-wider">Best Time</span>
                      </div>
                      <div className="text-sm font-bold">{destination.bestTimeToVisit || 'Year-round'}</div>
                    </div>
                  </div>
                </div>

                {/* ACTIVITIES SECTION */}
                {destination.activities && destination.activities.length > 0 && (
                  <div ref={activitiesRef} className="space-y-4 scroll-mt-20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                      <CompassIcon className="w-4 h-4" /> Activities
                    </h3>
                    <div className="space-y-3">
                      {destination.activities.map((act, i) => {
                        const isExpanded = expandedActivityId === (act.id || i);
                        return (
                          <div 
                            key={act.id || i} 
                            className={`rounded-2xl transition-all overflow-hidden ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}
                          >
                            <button
                              onClick={() => setExpandedActivityId(isExpanded ? null : (act.id || i))}
                              className="w-full text-left p-4 flex items-center justify-between gap-4 focus:outline-none cursor-pointer"
                            >
                              <div className="flex-1">
                                <div className="text-sm font-bold">{act.name}</div>
                                <div className={`text-xs mt-1 flex items-center gap-3 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                   {act.durationHrs && <span>⏱ {act.durationHrs} hrs</span>}
                                   {act.cost !== undefined && <span>{act.cost === 0 ? 'Free' : `$${act.cost}`}</span>}
                                </div>
                              </div>
                              <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="px-4 pb-4 pt-1 space-y-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                                    {act.description && (
                                      <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                        {act.description}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      {act.bestTime && (
                                        <span className={`text-[10px] px-2 py-1 rounded-md ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                                          <strong>Best time:</strong> {act.bestTime}
                                        </span>
                                      )}
                                      {act.included && (
                                        <span className={`text-[10px] px-2 py-1 rounded-md ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                                          <strong>Included:</strong> {act.included}
                                        </span>
                                      )}
                                      {act.location?.label && (
                                        <span className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                          <MapPinIcon className="w-3 h-3" /> {act.location.label}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STAYS SECTION */}
                {destination.stays && destination.stays.length > 0 && (
                  <div ref={staysRef} className="space-y-4 scroll-mt-20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Where to Stay</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {destination.stays.map((stay, i) => (
                        <div key={stay.id || i} className={`p-4 rounded-2xl flex flex-col gap-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold leading-tight">{stay.name}</div>
                              <div className={`text-xs mt-0.5 capitalize ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                {stay.type} {stay.rating && `· ★ ${stay.rating}`}
                              </div>
                            </div>
                            {stay.pricePerNight && (
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold text-emerald-500">${stay.pricePerNight}</div>
                                <div className="text-[9px] uppercase tracking-wider text-zinc-500">/ night</div>
                              </div>
                            )}
                          </div>
                          {stay.description && (
                            <p className={`text-xs line-clamp-2 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{stay.description}</p>
                          )}
                          {stay.location?.label && (
                            <div className={`text-[10px] font-medium mt-auto pt-2 flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              <MapPinIcon className="w-3 h-3" /> {stay.location.label}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PLACES SECTION */}
                {destination.places && destination.places.length > 0 && (
                  <div ref={placesRef} className="space-y-4 scroll-mt-20">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Places to Visit</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {destination.places.map((place, i) => (
                        <div key={place.id || i} className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="text-sm font-bold">{place.name}</div>
                            {place.tag && (
                              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                                {place.tag}
                              </span>
                            )}
                          </div>
                          {place.description && (
                            <p className={`text-xs mb-3 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{place.description}</p>
                          )}
                          {place.location?.label && (
                            <div className={`text-[10px] font-medium flex items-center gap-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              <MapPinIcon className="w-3 h-3" /> {place.location.label}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
        </motion.div>
      </div>
    </>
  );
}
