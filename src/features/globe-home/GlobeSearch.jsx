import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useCompare } from '../../context/CompareContext';
import { geocode } from '../../services/geocode';
import { getDestinations } from '../../services/destinations';
import { getDestinationPhoto } from '../../services/photos';
import {
  SearchIcon,
  SparklesIcon,
  ScaleIcon,
  CloseIcon,
} from '../../components/ui/Icons';

const ENCOURAGING_PLACEHOLDERS = [
  'Where does your wanderlust take you today?',
  'Discover your next breathtaking escape...',
  'Search Tokyo, Swiss Alps, Santorini, Bali...',
  'Where in the world do you want to explore next?',
  'Find untamed landscapes & vibrant cities...',
  'Search any city, mountain peak, or coast...',
];

export default function GlobeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const {
    flyToDestination,
    showQuiz,
    openCompare,
  } = useApp();

  const { compareList } = useCompare();

  // Animated rotating encouraging placeholder
  useEffect(() => {
    if (query.trim()) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ENCOURAGING_PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [query]);

  const handleSearch = useCallback(async (text) => {
    if (!text.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const localDests = getDestinations().filter(
      (d) =>
        d.name.toLowerCase().includes(text.toLowerCase()) ||
        d.country?.toLowerCase().includes(text.toLowerCase()) ||
        d.type?.some((t) => t.toLowerCase().includes(text.toLowerCase()))
    );

    try {
      const geoResults = await geocode(text);
      const combined = [
        ...localDests.map((d) => ({ ...d, source: 'curated' })),
        ...(geoResults || [])
          .filter((g) => !localDests.some((ld) => ld.name.toLowerCase() === g.name.toLowerCase()))
          .map((g) => ({
            id: `geo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: g.name,
            country: g.country || '',
            lat: g.lat,
            lng: g.lng,
            type: ['custom'],
            budgetTier: 'mid',
            crowdLevel: 'medium',
            source: 'geocoded',
          })),
      ];

      setResults(combined.slice(0, 6));
    } catch {
      setResults(localDests.slice(0, 6));
    } finally {
      setIsSearching(false);
    }
  }, []);

  const onInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(val);
    }, 200);
  };

  const handleSelectResult = (dest) => {
    setQuery('');
    setIsOpen(false);
    flyToDestination(dest);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto select-none font-sans px-2">
      {/* ─── Apple OS 26 Liquid Glass Search Capsule ─── */}
      <div className="relative apple-liquid-glass rounded-full p-2 pl-3.5 pr-2 flex items-center gap-2.5 shadow-2xl transition-all">
        {/* Soft Glowing Search Glyph */}
        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <SearchIcon className="w-4 h-4" />
        </div>

        {/* Core Input with Animated Placeholder */}
        <div className="relative flex-1 min-w-0 h-9 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={onInputChange}
            onFocus={() => setIsOpen(true)}
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none z-10"
          />

          {/* Animated Rotating Wanderlust Placeholder */}
          {!query && (
            <div className="absolute inset-0 pointer-events-none flex items-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium truncate"
                >
                  {ENCOURAGING_PLACEHOLDERS[placeholderIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Clear Search Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="w-7 h-7 rounded-full hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer transition-colors"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Integrated Liquid Action Icons */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {/* AI Matchmaker Tool Icon */}
          <button
            type="button"
            onClick={showQuiz}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/40 transition-all cursor-pointer shadow-sm hover:scale-105"
            title="AI Matchmaker — Find Your Vibe"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
          </button>

          {/* Compare Destinations Tool Icon */}
          <button
            type="button"
            onClick={openCompare}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white border border-black/10 dark:border-white/10 transition-all cursor-pointer shadow-sm hover:scale-105 relative"
            title="Compare Destinations"
          >
            <ScaleIcon className="w-3.5 h-3.5" />
            {compareList && compareList.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center shadow-md">
                {compareList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Apple OS Liquid Search Results Dropdown ─── */}
      <AnimatePresence>
        {isOpen && (query.trim() || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full inset-x-2 mt-2 apple-liquid-glass rounded-[24px] p-2 shadow-2xl z-50 max-h-[50vh] sm:max-h-80 overflow-y-auto no-scrollbar"
          >
            {isSearching ? (
              <div className="p-4 text-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Searching destinations worldwide...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                No matching locations found for "{query}"
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((dest) => {
                  const photo = getDestinationPhoto(dest);
                  return (
                    <div
                      key={dest.id}
                      onClick={() => handleSelectResult(dest)}
                      className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer flex items-center gap-3 transition-colors group"
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-black/10 dark:border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <SearchIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                          {dest.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                          {dest.country || 'Custom Location'} {dest.type && `• ${dest.type.join(', ')}`}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        →
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
