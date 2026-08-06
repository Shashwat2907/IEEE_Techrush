import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { geocode } from '../../services/geocode';
import { getDestinations } from '../../services/destinations';
import { SearchIcon, CompassIcon, DiceIcon, CloseIcon } from '../../components/ui/Icons';

const PLACEHOLDERS = [
  'Where to next? (e.g. Kyoto, Bali, Paris)',
  'Search any city, island, or landmark...',
  'Need inspiration? Click the Compass for Quiz',
  'Feeling spontaneous? Click the Dice for a surprise',
  'Plan your next dream getaway...',
];

export default function GlobeSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const { flyToDestination, showQuiz } = useApp();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Subtle rotating placeholder animation
  useEffect(() => {
    if (isFocused || query) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isFocused, query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSuggestions(getDestinations({ search: query }).slice(0, 5));
    }, 160);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSearch = useCallback(async (e) => {
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
        flyToDestination({
          id: `geocoded-${Date.now()}`,
          name: result.name.split(',').slice(0, 2).join(','),
          lat: result.lat,
          lng: result.lng,
          type: [],
          season: [],
          budgetTier: 'mid',
          crowdLevel: 'medium',
          activities: [],
        });
        setQuery('');
        setSuggestions([]);
        setIsFocused(false);
      }
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [query, flyToDestination]);

  const handleSuggestionClick = useCallback((dest) => {
    flyToDestination(dest);
    setQuery('');
    setSuggestions([]);
    setIsFocused(false);
  }, [flyToDestination]);

  const handleRandomPlace = useCallback(() => {
    const all = getDestinations();
    if (all.length > 0) {
      const randomDest = all[Math.floor(Math.random() * all.length)];
      flyToDestination(randomDest);
    }
  }, [flyToDestination]);

  const budgetLabel = (tier) => {
    switch (tier) {
      case 'budget': return '$';
      case 'mid': return '$$';
      case 'premium': return '$$$';
      default: return '$$';
    }
  };

  return (
    <div className="flex justify-center w-full select-none">
      <div className="relative w-full max-w-2xl">
        {/* Main Floating Capsule */}
        <div className="relative flex items-center gap-2 sm:gap-2.5 h-12 sm:h-14 w-full">
          {/* Main Overlapping Search Bar */}
          <motion.div
            layout
            className={`relative flex items-center h-full rounded-2xl transition-all duration-300 ${
              isFocused || query
                ? 'flex-1 bg-[#0A0E17]/95 border border-white/25 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10'
                : 'flex-1 bg-[#0A0E17]/80 hover:bg-[#0A0E17]/95 border border-white/10 shadow-xl backdrop-blur-xl hover:border-white/20'
            } px-3.5 sm:px-5 overflow-hidden`}
            onClick={() => inputRef.current?.focus()}
          >
            <form onSubmit={handleSearch} className="flex items-center w-full h-full relative">
              <span className="text-white/60 mr-2.5 sm:mr-3.5 shrink-0 flex items-center justify-center">
                {isSearching ? (
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <SearchIcon className="w-4 sm:w-5 h-4 sm:h-5 text-white/70" />
                )}
              </span>

              <div className="relative flex-1 h-full flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 250)}
                  className="w-full bg-transparent text-white font-body text-xs sm:text-sm outline-none tracking-wide z-10"
                  id="globe-search-input"
                  autoComplete="off"
                />

                {/* Animated Placeholder text */}
                {!query && (
                  <div className="absolute inset-0 flex items-center pointer-events-none z-0">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={placeholderIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="text-text-secondary/60 text-xs sm:text-sm font-body truncate"
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
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-text-secondary hover:text-white transition-colors z-10"
                >
                  <CloseIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </button>
              )}
            </form>
          </motion.div>

          {/* Discovery Quiz Action Button */}
          <motion.button
            type="button"
            onClick={showQuiz}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center justify-center h-full w-12 sm:w-14 rounded-2xl bg-[#0A0E17]/80 hover:bg-[#0A0E17]/95 border border-white/10 hover:border-white/20 shadow-xl backdrop-blur-xl transition-all shrink-0 text-text-secondary hover:text-white"
            title="Discovery Quiz"
          >
            <CompassIcon className="w-4 sm:w-5 h-4 sm:h-5 transition-transform duration-300 group-hover:rotate-45" />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div className="bg-[#07090E]/95 border border-white/10 text-white px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap shadow-xl">
                Discovery Quiz
              </div>
            </div>
          </motion.button>

          {/* Random Destination Action Button */}
          <motion.button
            type="button"
            onClick={handleRandomPlace}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center justify-center h-full w-12 sm:w-14 rounded-2xl bg-[#0A0E17]/80 hover:bg-[#0A0E17]/95 border border-white/10 hover:border-white/20 shadow-xl backdrop-blur-xl transition-all shrink-0 text-text-secondary hover:text-white"
            title="Surprise Destination"
          >
            <DiceIcon className="w-4 sm:w-5 h-4 sm:h-5 transition-transform duration-300 group-hover:rotate-180" />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
              <div className="bg-[#07090E]/95 border border-white/10 text-white px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap shadow-xl">
                Surprise Me
              </div>
            </div>
          </motion.button>
        </div>

        {/* Floating Auto-suggestions Dropdown */}
        <AnimatePresence>
          {isFocused && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full mt-2 sm:mt-2.5 inset-x-0 bg-[#0A0E17]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5"
            >
              {suggestions.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => handleSuggestionClick(dest)}
                  className="w-full text-left px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-white/5 transition-colors duration-150 flex items-center justify-between group"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-white font-body text-sm font-semibold tracking-wide group-hover:text-accent-sky transition-colors truncate">
                      {dest.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {dest.type.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-text-secondary font-mono uppercase bg-white/5 border border-white/5 px-2 py-0.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end flex-shrink-0 ml-2">
                    <span className="text-xs font-mono text-white/80 font-semibold">
                      {budgetLabel(dest.budgetTier)}
                    </span>
                    <span className="text-[10px] text-text-secondary/60 font-mono mt-0.5 hidden sm:block">
                      {dest.lat.toFixed(1)}°, {dest.lng.toFixed(1)}°
                    </span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

