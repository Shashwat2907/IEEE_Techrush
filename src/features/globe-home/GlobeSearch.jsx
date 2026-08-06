import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { geocode } from '../../services/geocode';
import { getDestinations } from '../../services/destinations';
import { SearchIcon, CompassIcon, DiceIcon, CloseIcon } from '../../components/ui/Icons';

export default function GlobeSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const { flyToDestination, showQuiz } = useApp();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile, disable hover expand — show all 3 buttons compactly
  const activeMode = isMobile
    ? (isFocused || query.length > 0 ? 'oval' : null)
    : (isFocused || query.length > 0 ? 'oval' : hovered);

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

  // Softer spring for subtle animations
  const subtleSpring = { type: 'spring', stiffness: 200, damping: 28 };

  return (
    <div className="flex justify-center w-full select-none">
      <div
        className="relative w-full max-w-2xl"
        onMouseLeave={() => {
          if (!isFocused && !query) setHovered(null);
        }}
      >
        {/* Main Floating Bar */}
        <div className="relative flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 w-full">
          {/* Search Input Box */}
          {(!activeMode || activeMode === 'oval') && (
            <motion.div
              layout
              initial={false}
              animate={{ flexGrow: activeMode === 'oval' ? 1 : 1 }}
              transition={subtleSpring}
              onMouseEnter={() => !isMobile && setHovered('oval')}
              onClick={() => {
                setHovered('oval');
                inputRef.current?.focus();
              }}
              className={`relative flex items-center h-full rounded-2xl cursor-pointer transition-colors duration-300 ${
                activeMode === 'oval'
                  ? 'bg-surface/95 border border-white/20 shadow-2xl backdrop-blur-xl'
                  : 'bg-surface/85 hover:bg-surface/95 border border-white/10 shadow-xl backdrop-blur-lg'
              } px-3 sm:px-5 overflow-hidden flex-1`}
            >
              <form onSubmit={handleSearch} className="flex items-center w-full h-full">
                <span className="text-white/70 mr-2.5 sm:mr-3.5 shrink-0 flex items-center justify-center">
                  {isSearching ? (
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 animate-spin text-accent-sky" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <SearchIcon className="w-4 sm:w-5 h-4 sm:h-5 text-accent-sky/80" />
                  )}
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 250)}
                  placeholder={isMobile ? 'Where to next?' : 'Where to next? (e.g. Kyoto, Bali, Paris)'}
                  className="w-full bg-transparent text-white placeholder:text-text-secondary/60 font-body text-xs sm:text-sm outline-none tracking-wide"
                  id="globe-search-input"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuery('');
                      setSuggestions([]);
                      inputRef.current?.focus();
                    }}
                    className="p-1 sm:p-1.5 text-text-secondary hover:text-white transition-colors"
                  >
                    <CloseIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  </button>
                )}
              </form>
            </motion.div>
          )}

          {/* Discovery Quiz Action Button */}
          {(!activeMode || activeMode === 'quiz') && (
            <motion.div
              layout
              initial={false}
              animate={{
                width: activeMode === 'quiz' ? '100%' : isMobile ? '44px' : '56px',
              }}
              transition={subtleSpring}
              onMouseEnter={() => !isMobile && setHovered('quiz')}
              onClick={() => {
                if (activeMode === 'quiz' || isMobile) showQuiz();
              }}
              className={`relative flex items-center justify-center h-full rounded-2xl cursor-pointer transition-colors duration-300 ${
                activeMode === 'quiz'
                  ? 'bg-surface/95 border border-white/20 shadow-2xl backdrop-blur-xl px-4 sm:px-5'
                  : `${isMobile ? 'w-11' : 'w-14'} bg-surface/85 hover:bg-surface/95 border border-white/10 shadow-xl backdrop-blur-lg`
              } shrink-0 overflow-hidden`}
            >
              {activeMode === 'quiz' && !isMobile ? (
                <button
                  type="button"
                  onClick={showQuiz}
                  className="flex items-center justify-center gap-2 sm:gap-3 w-full h-full text-white font-body font-medium text-xs sm:text-sm whitespace-nowrap"
                >
                  <CompassIcon className="w-5 h-5 text-accent-sky" />
                  <span>
                    Not sure where to go?{' '}
                    <strong className="text-accent-sky font-semibold">Take Quiz →</strong>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={showQuiz}
                  className="flex items-center justify-center w-full h-full text-text-secondary hover:text-white transition-colors"
                  title="Take Discovery Quiz"
                >
                  <CompassIcon className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
              )}
            </motion.div>
          )}

          {/* Random Destination Action Button */}
          {(!activeMode || activeMode === 'random') && (
            <motion.div
              layout
              initial={false}
              animate={{
                width: activeMode === 'random' ? '100%' : isMobile ? '44px' : '56px',
              }}
              transition={subtleSpring}
              onMouseEnter={() => !isMobile && setHovered('random')}
              onClick={() => {
                if (activeMode === 'random' || isMobile) handleRandomPlace();
              }}
              className={`relative flex items-center justify-center h-full rounded-2xl cursor-pointer transition-colors duration-300 ${
                activeMode === 'random'
                  ? 'bg-surface/95 border border-white/20 shadow-2xl backdrop-blur-xl px-4 sm:px-5'
                  : `${isMobile ? 'w-11' : 'w-14'} bg-surface/85 hover:bg-surface/95 border border-white/10 shadow-xl backdrop-blur-lg`
              } shrink-0 overflow-hidden`}
            >
              {activeMode === 'random' && !isMobile ? (
                <button
                  type="button"
                  onClick={handleRandomPlace}
                  className="flex items-center justify-center gap-2 sm:gap-3 w-full h-full text-white font-body font-medium text-xs sm:text-sm whitespace-nowrap"
                >
                  <DiceIcon className="w-5 h-5 text-accent-amber" />
                  <span>
                    Surprise Me!{' '}
                    <strong className="text-accent-amber font-semibold">Random Place →</strong>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRandomPlace}
                  className="flex items-center justify-center w-full h-full text-text-secondary hover:text-white transition-colors"
                  title="Random Destination"
                >
                  <DiceIcon className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* Floating Auto-suggestions Dropdown */}
        <AnimatePresence>
          {isFocused && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="absolute top-full mt-2 sm:mt-2.5 inset-x-0 bg-surface/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-white/5"
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
                      {dest.type.slice(0, isMobile ? 2 : 4).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-accent-sky/90 font-mono uppercase bg-accent-sky/10 border border-accent-sky/20 px-2 py-0.5 rounded-full"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end flex-shrink-0 ml-2">
                    <span className="text-xs font-mono text-accent-amber font-semibold">
                      {budgetLabel(dest.budgetTier)}
                    </span>
                    <span className="text-[10px] text-text-secondary/70 font-mono mt-0.5 hidden sm:block">
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
