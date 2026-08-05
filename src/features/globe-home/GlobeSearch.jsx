import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { geocode } from '../../services/geocode';
import { getDestinations } from '../../services/destinations';

export default function GlobeSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hovered, setHovered] = useState(null);

  const { flyToDestination, showQuiz } = useApp();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const activeMode = isFocused || query.length > 0 ? 'oval' : hovered;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => {
      setSuggestions(getDestinations({ search: query }).slice(0, 5));
    }, 180);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    const localResults = getDestinations({ search: query });
    if (localResults.length > 0) {
      flyToDestination(localResults[0]);
      setQuery(''); setSuggestions([]); setIsSearching(false); setIsFocused(false);
      return;
    }
    try {
      const result = await geocode(query);
      if (result) {
        flyToDestination({
          id: `geocoded-${Date.now()}`, name: result.name.split(',').slice(0, 2).join(','),
          lat: result.lat, lng: result.lng, type: [], season: [],
          budgetTier: 'mid', crowdLevel: 'medium', activities: [],
        });
        setQuery(''); setSuggestions([]); setIsFocused(false);
      }
    } catch (err) { console.warn('Search failed:', err); }
    finally { setIsSearching(false); }
  }, [query, flyToDestination]);

  const handleSuggestionClick = useCallback((dest) => {
    flyToDestination(dest);
    setQuery(''); setSuggestions([]); setIsFocused(false);
  }, [flyToDestination]);

  const handleRandomPlace = useCallback(() => {
    const all = getDestinations();
    if (all.length > 0) flyToDestination(all[Math.floor(Math.random() * all.length)]);
  }, [flyToDestination]);

  const budgetEmoji = (tier) => {
    switch (tier) { case 'budget': return '💰'; case 'mid': return '💰💰'; case 'premium': return '💰💰💰'; default: return ''; }
  };

  return (
    <div className="flex justify-center pt-2 px-4 w-full select-none">
      <div className="relative w-full max-w-xl"
        onMouseLeave={() => { if (!isFocused && !query) setHovered(null); }}
      >
        <div className="relative flex items-center justify-center gap-3 h-14 w-full">
          {/* Search Input */}
          {(!activeMode || activeMode === 'oval') && (
            <motion.div layout initial={false}
              animate={{ flexGrow: activeMode === 'oval' ? 1 : 1, width: activeMode === 'oval' ? '100%' : 'auto' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              onMouseEnter={() => setHovered('oval')}
              onClick={() => { setHovered('oval'); inputRef.current?.focus(); }}
              className={`relative flex items-center h-full rounded-full cursor-pointer transition-colors duration-200 ${
                activeMode === 'oval'
                  ? 'bg-surface/90 border border-accent-sky/40 shadow-xl shadow-accent-sky/10'
                  : 'bg-white/5 hover:bg-white/8 border border-white/10 shadow-lg'
              } backdrop-blur-xl px-4 overflow-hidden flex-1`}
            >
              <form onSubmit={handleSearch} className="flex items-center w-full h-full">
                <span className="text-white/60 mr-3 shrink-0">
                  {isSearching ? (
                    <svg className="w-5 h-5 animate-spin text-accent-sky" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </span>
                <input ref={inputRef} type="text" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 250)}
                  placeholder="Where to next?"
                  className="w-full bg-transparent text-white placeholder:text-white/30 font-body text-sm sm:text-base outline-none tracking-wide"
                  id="globe-search-input" autoComplete="off"
                />
                {query && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setQuery(''); setSuggestions([]); inputRef.current?.focus(); }}
                    className="p-1 text-white/30 hover:text-white transition-colors">✕</button>
                )}
              </form>
            </motion.div>
          )}

          {/* Quiz Button */}
          {(!activeMode || activeMode === 'quiz') && (
            <motion.div layout initial={false}
              animate={{ width: activeMode === 'quiz' ? '100%' : '56px' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              onMouseEnter={() => setHovered('quiz')}
              onClick={() => { if (activeMode === 'quiz') showQuiz(); }}
              className={`relative flex items-center justify-center h-full rounded-full cursor-pointer transition-colors duration-200 ${
                activeMode === 'quiz'
                  ? 'bg-surface/90 border border-accent-sky/40 shadow-xl shadow-accent-sky/10 px-6'
                  : 'w-14 bg-white/5 hover:bg-white/8 border border-white/10 shadow-lg'
              } backdrop-blur-xl shrink-0 overflow-hidden`}
            >
              {activeMode === 'quiz' ? (
                <button type="button" onClick={showQuiz}
                  className="flex items-center justify-center gap-3 w-full h-full text-white font-body font-medium text-sm sm:text-base whitespace-nowrap">
                  <span className="text-xl">🧭</span>
                  <span>Don't know where to go? <strong className="text-accent-sky font-semibold">Take Quiz →</strong></span>
                </button>
              ) : (
                <span className="text-xl select-none" title="Don't know where to go?">🧭</span>
              )}
            </motion.div>
          )}

          {/* Random Place */}
          {(!activeMode || activeMode === 'random') && (
            <motion.div layout initial={false}
              animate={{ width: activeMode === 'random' ? '100%' : '56px' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              onMouseEnter={() => setHovered('random')}
              onClick={() => { if (activeMode === 'random') handleRandomPlace(); }}
              className={`relative flex items-center justify-center h-full rounded-full cursor-pointer transition-colors duration-200 ${
                activeMode === 'random'
                  ? 'bg-surface/90 border border-accent-amber/40 shadow-xl shadow-accent-amber/10 px-6'
                  : 'w-14 bg-white/5 hover:bg-white/8 border border-white/10 shadow-lg'
              } backdrop-blur-xl shrink-0 overflow-hidden`}
            >
              {activeMode === 'random' ? (
                <button type="button" onClick={handleRandomPlace}
                  className="flex items-center justify-center gap-3 w-full h-full text-white font-body font-medium text-sm sm:text-base whitespace-nowrap">
                  <span className="text-xl">🎲</span>
                  <span>Surprise Me! <strong className="text-accent-amber font-semibold">Random Place →</strong></span>
                </button>
              ) : (
                <span className="text-xl select-none" title="Random destination">🎲</span>
              )}
            </motion.div>
          )}
        </div>

        {/* Suggestions */}
        {isFocused && suggestions.length > 0 && (
          <div className="absolute top-full mt-3 w-full glass rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
            {suggestions.map((dest) => (
              <button key={dest.id} type="button" onClick={() => handleSuggestionClick(dest)}
                className="w-full text-left px-5 py-3.5 hover:bg-white/5 transition-colors duration-150 flex items-center justify-between border-b border-white/5 last:border-0">
                <div>
                  <span className="text-white font-body text-sm font-semibold tracking-wide">{dest.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    {dest.type.map((t) => (
                      <span key={t} className="text-[10px] text-accent-sky font-mono uppercase bg-accent-sky/10 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm">{budgetEmoji(dest.budgetTier)}</span>
                  <div className="text-[10px] text-text-secondary font-mono mt-0.5">{dest.lat.toFixed(1)}°, {dest.lng.toFixed(1)}°</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
