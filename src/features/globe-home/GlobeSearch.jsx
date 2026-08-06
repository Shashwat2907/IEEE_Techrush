import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { geocode } from '../../services/geocode';
import { getDestinations } from '../../services/destinations';
import { SearchIcon, CloseIcon, SparklesIcon, ScaleIcon } from '../../components/ui/Icons';

const PLACEHOLDERS = [
  'Where to next? (e.g. Kyoto, Bali, Amalfi, Paris)...',
  'Search any city, country, island, or landmark...',
  'Plan your customized dream itinerary with live weather...',
  'Discover handcrafted seasonal recommendations...',
];

export default function GlobeSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const { flyToDestination, showQuiz, openCompare } = useApp();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Rotating placeholder animation
  useEffect(() => {
    if (isFocused || query) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isFocused, query]);

  // Autocomplete suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSuggestions(getDestinations({ search: query }).slice(0, 5));
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSearch = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (!query.trim()) return;
      setIsSearching(true);

      const localResults = getDestinations({ search: query });
      if (localResults.length > 0) {
        flyToDestination(localResults[0]);
        setQuery('');
        setSuggestions([]);
        setIsSearching(false);
        setIsFocused(false);
        return;
      }

      try {
        const result = await geocode(query);
        if (result) {
          const cleanName = result.name.split(',').slice(0, 2).join(', ');

          let temp = 22;
          try {
            const wRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${result.lat}&longitude=${result.lng}&current=temperature_2m`
            );
            const wData = await wRes.json();
            if (wData.current) {
              temp = Math.round(wData.current.temperature_2m);
            }
          } catch {}

          flyToDestination({
            id: `geocoded-${Date.now()}`,
            name: cleanName,
            lat: result.lat,
            lng: result.lng,
            type: ['city', 'custom'],
            season: ['spring', 'summer', 'autumn', 'winter'],
            budgetTier: 'mid',
            crowdLevel: 'medium',
            bestTimeToVisit: 'Apr–Oct',
            description: `Explore the vibrant streets, local landmarks, and authentic culture of ${cleanName}.`,
            activities: [
              { name: 'City Center & Historic Sights', cost: 0, durationHrs: 3, type: 'activity' },
              { name: 'Traditional Dining & Market Tour', cost: 30, durationHrs: 2, type: 'food' },
              { name: 'Local Museum / Scenic Lookout', cost: 15, durationHrs: 2.5, type: 'activity' },
              { name: 'Evening Stroll & Leisure', cost: 0, durationHrs: 2, type: 'rest' },
            ],
          });
          setQuery('');
          setSuggestions([]);
          setIsFocused(false);
        }
      } catch (err) {
        console.warn('Geocoding search failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [query, flyToDestination]
  );

  const handleSuggestionClick = useCallback(
    (dest) => {
      flyToDestination(dest);
      setQuery('');
      setSuggestions([]);
      setIsFocused(false);
    },
    [flyToDestination]
  );

  return (
    <div className="flex flex-col items-center w-full select-none max-w-xl mx-auto px-4">
      {/* Search Input Bar */}
      <div className="relative w-full">
        <motion.div
          layout
          className={`relative flex items-center h-12 sm:h-13 w-full rounded-2xl transition-all duration-300 ${
            isFocused || query
              ? 'bg-[#0B101B]/95 border border-white/20 shadow-2xl backdrop-blur-2xl'
              : 'bg-[#0B101B]/75 hover:bg-[#0B101B]/90 border border-white/[0.08] shadow-lg backdrop-blur-xl hover:border-white/15'
          } px-4 overflow-hidden`}
          onClick={() => inputRef.current?.focus()}
        >
          <form onSubmit={handleSearch} className="flex items-center w-full h-full relative">
            <span className="text-text-secondary mr-3 shrink-0 flex items-center justify-center">
              {isSearching ? (
                <svg className="w-4 h-4 animate-spin text-accent-sky" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <SearchIcon className="w-4 h-4 text-text-secondary" />
              )}
            </span>

            <div className="relative flex-1 h-full flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsFocused(false), 200);
                }}
                className="w-full h-full bg-transparent text-white font-body text-xs sm:text-sm placeholder-transparent focus:outline-none z-10"
                autoComplete="off"
                spellCheck="false"
              />

              {/* Animated Rotating Placeholder */}
              {!query && (
                <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -14, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="text-xs sm:text-sm text-text-secondary/60 font-body truncate"
                    >
                      {PLACEHOLDERS[placeholderIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
            </div>

            {query && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery('');
                  setSuggestions([]);
                }}
                className="p-1 text-text-secondary hover:text-white transition-colors ml-2 cursor-pointer"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </motion.div>

        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && isFocused && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute left-0 right-0 top-full mt-2 bg-[#0B101B]/95 border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-1.5 shadow-2xl z-50 overflow-hidden"
            >
              {suggestions.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  onMouseDown={() => handleSuggestionClick(dest)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-text-secondary text-xs">📍</span>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-accent-sky transition-colors">
                        {dest.name}
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        {dest.bestTimeToVisit ? `Best: ${dest.bestTimeToVisit}` : dest.season?.join(', ')}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-accent-sky opacity-0 group-hover:opacity-100 transition-opacity">
                    Fly →
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Elegant Action Capsules: AI Matchmaker & Compare Places */}
      <div className="flex items-center gap-2.5 mt-3.5">
        <button
          type="button"
          onClick={showQuiz}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0B101B]/80 hover:bg-[#0B101B]/95 border border-white/[0.08] hover:border-accent-sky/30 text-white/80 hover:text-white text-xs font-medium backdrop-blur-xl shadow-lg transition-all cursor-pointer group"
        >
          <SparklesIcon className="w-3.5 h-3.5 text-accent-sky group-hover:rotate-12 transition-transform" />
          <span>AI Matchmaker</span>
        </button>

        <button
          type="button"
          onClick={openCompare}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0B101B]/80 hover:bg-[#0B101B]/95 border border-white/[0.08] hover:border-white/20 text-white/80 hover:text-white text-xs font-medium backdrop-blur-xl shadow-lg transition-all cursor-pointer group"
        >
          <ScaleIcon className="w-3.5 h-3.5 text-text-secondary group-hover:text-white transition-colors" />
          <span>Compare Places</span>
        </button>
      </div>
    </div>
  );
}
