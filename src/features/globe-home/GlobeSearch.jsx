import { useState, useCallback, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useFilters } from '../../context/FilterContext';
import { geocode } from '../../services/geocode';
import { getDestinations } from '../../services/destinations';

export default function GlobeSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { flyToDestination } = useApp();
  const { setSearch } = useFilters();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const results = getDestinations({ search: query });
      setSuggestions(results.slice(0, 5));
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);

    // First check local destinations
    const localResults = getDestinations({ search: query });
    if (localResults.length > 0) {
      flyToDestination(localResults[0]);
      setQuery('');
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    // Fall back to geocoding
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

  const budgetEmoji = (tier) => {
    switch (tier) {
      case 'budget': return '💰';
      case 'mid': return '💰💰';
      case 'premium': return '💰💰💰';
      default: return '';
    }
  };

  return (
    <div className="flex justify-center pt-6 px-4">
      <div className="relative w-full max-w-lg">


        {/* Search form */}
        <form onSubmit={handleSearch} className="relative">
          <div className={`flex items-center bg-surface/80 backdrop-blur-md rounded-full
            border transition-all duration-300 ease-field-atlas
            ${isFocused ? 'border-accent-trail shadow-lg shadow-accent-trail/10' : 'border-surface-raised'}
          `}>
            <span className="pl-4 text-text-secondary">
              {isSearching ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Search any destination..."
              className="flex-1 bg-transparent px-3 py-3 text-text-primary placeholder:text-text-secondary/50
                font-body text-sm outline-none"
              id="globe-search-input"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setSuggestions([]); }}
                className="pr-4 text-text-secondary hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {isFocused && suggestions.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-surface/95 backdrop-blur-md
              border border-surface-raised rounded-card shadow-xl shadow-black/30
              overflow-hidden z-50 animate-fade-in">
              {suggestions.map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => handleSuggestionClick(dest)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-raised
                    transition-colors duration-150 flex items-center justify-between
                    border-b border-surface-raised/50 last:border-0"
                >
                  <div>
                    <span className="text-text-primary font-body text-sm font-medium">
                      {dest.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {dest.type.map(t => (
                        <span key={t} className="text-[10px] text-accent-trail font-mono uppercase">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs">{budgetEmoji(dest.budgetTier)}</span>
                    <div className="text-[10px] text-text-secondary font-mono">
                      {dest.lat.toFixed(1)}°, {dest.lng.toFixed(1)}°
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
