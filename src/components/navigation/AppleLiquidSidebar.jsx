import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useItinerary } from '../../context/ItineraryContext';
import { getDestinations } from '../../services/destinations';
import { getDestinationPhoto } from '../../services/photos';
import { geocode } from '../../services/geocode';
import {
  SearchIcon,
  SidebarToggleIcon,
  PinIcon,
  BookmarkIcon,
  BookOpenIcon,
  RouteIcon,
  CitySkylineIcon,
  SparklesIcon,
  ScaleIcon,
  SunIcon,
  MoonIcon,
  CloseIcon,
  AppleChevronRightIcon,
  MountainIcon,
  LandmarkIcon,
} from '../ui/Icons';

const INITIAL_RECENTS = [
  { id: 'dest-pune', name: 'Pune', subtitle: 'Maharashtra', type: 'city', lat: 18.5204, lng: 73.8567 },
  { id: 'dest-sangamwadi-1', name: 'Sangamwadi Moze P...', subtitle: 'Aadya Krantiguru Vastad S...', type: 'place', lat: 18.5362, lng: 73.8789 },
  { id: 'dest-sangamwadi-2', name: 'Sangamwadi', subtitle: 'Sangamwadi, Pune', type: 'city', lat: 18.5314, lng: 73.8742 },
  { id: 'dest-tokyo', name: 'Tokyo', subtitle: 'Japan', type: 'landmark', lat: 35.6762, lng: 139.6503 },
  { id: 'dest-swiss-alps', name: 'Swiss Alps', subtitle: 'Switzerland', type: 'mountain', lat: 46.559, lng: 8.561 },
];

export default function AppleLiquidSidebar({ isCollapsed, onToggleCollapse, onOpenDrawer }) {
  const {
    flyToDestination,
    showQuiz,
    openCompare,
    openPremade,
    selectedDestination,
  } = useApp();

  const { isDark, toggleTheme } = useTheme();
  const { days } = useItinerary();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recents, setRecents] = useState(INITIAL_RECENTS);

  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const allDestinations = useMemo(() => getDestinations(), []);

  // Calculate total pinned waypoints
  const pinnedCount = useMemo(() => {
    return (days || []).reduce((sum, d) => sum + (d.activities?.length || 0), 0);
  }, [days]);

  // Siri suggestion / featured
  const siriSuggestion = useMemo(() => {
    return (
      allDestinations.find((d) => d.id === 'dest-tokyo') ||
      allDestinations[0] || {
        name: 'Pune',
        subtitle: 'Recently viewed',
        lat: 18.5204,
        lng: 73.8567,
      }
    );
  }, [allDestinations]);

  // Live search handler
  const handleSearch = useCallback(
    async (text) => {
      if (!text.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const textLower = text.toLowerCase();

      const localMatches = allDestinations.filter(
        (d) =>
          d.name.toLowerCase().includes(textLower) ||
          d.country?.toLowerCase().includes(textLower) ||
          d.type?.some((t) => t.toLowerCase().includes(textLower))
      );

      try {
        const geoResults = await geocode(text);
        const combined = [
          ...localMatches.map((d) => ({ ...d, source: 'curated' })),
          ...(geoResults || [])
            .filter((g) => !localMatches.some((ld) => ld.name.toLowerCase() === g.name.toLowerCase()))
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

        setSearchResults(combined.slice(0, 6));
      } catch {
        setSearchResults(localMatches.slice(0, 6));
      } finally {
        setIsSearching(false);
      }
    },
    [allDestinations]
  );

  const onInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(val);
    }, 200);
  };

  const handleSelectLocation = (loc) => {
    // Add to recents
    setRecents((prev) => {
      const filtered = prev.filter((r) => r.name !== loc.name);
      return [
        {
          id: loc.id || `loc-${Date.now()}`,
          name: loc.name.split(',')[0],
          subtitle: loc.country || loc.subtitle || 'Custom Location',
          type: loc.type?.[0] || 'city',
          lat: loc.lat,
          lng: loc.lng,
        },
        ...filtered.slice(0, 6),
      ];
    });

    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);

    // Find destination or fallback object
    const match = allDestinations.find(
      (d) => d.id === loc.id || d.name.toLowerCase() === loc.name.toLowerCase()
    );

    if (match) {
      flyToDestination(match);
    } else {
      flyToDestination({
        id: loc.id || `dest-${Date.now()}`,
        name: loc.name,
        country: loc.subtitle || 'Global',
        lat: loc.lat,
        lng: loc.lng,
        activities: [],
      });
    }

    if (onOpenDrawer) {
      onOpenDrawer('overview');
    }
  };

  const clearRecents = (e) => {
    e.stopPropagation();
    setRecents([]);
  };

  // Keyboard shortcut ⌘K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <motion.aside
      initial={{ x: -380, opacity: 0 }}
      animate={{ x: isCollapsed ? -380 : 0, opacity: isCollapsed ? 0 : 1 }}
      exit={{ x: -380, opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-4 left-4 bottom-4 w-[330px] sm:w-[350px] max-w-[calc(100vw-2rem)] z-40 apple-liquid-glass rounded-[28px] overflow-hidden flex flex-col font-sans select-none ${
        isDark ? 'text-white' : 'text-[#0F172A]'
      }`}
    >
      {/* ─── macOS Traffic Lights Window Header ─── */}
      <div className="pt-4 px-5 pb-3 flex items-center justify-between shrink-0">
        {/* Apple Traffic Dots */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-3 h-3 rounded-full bg-[#FF5F56] hover:brightness-110 active:brightness-90 transition-all cursor-pointer shadow-sm flex items-center justify-center group"
            title="Collapse Sidebar"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] text-black/70 font-bold leading-none">
              ✕
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 active:brightness-90 transition-all cursor-pointer shadow-sm flex items-center justify-center group"
            title="Minimize"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] text-black/70 font-bold leading-none">
              -
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onOpenDrawer) onOpenDrawer('overview');
            }}
            className="w-3 h-3 rounded-full bg-[#27C93F] hover:brightness-110 active:brightness-90 transition-all cursor-pointer shadow-sm flex items-center justify-center group"
            title="Expand Dossier"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] text-black/70 font-bold leading-none">
              +
            </span>
          </button>
        </div>

        {/* Right macOS Sidebar Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isDark ? 'hover:bg-white/10 text-zinc-300' : 'hover:bg-black/5 text-zinc-700'
          }`}
          title="Toggle Sidebar"
        >
          <SidebarToggleIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Apple Maps Translucent Inset Search Pill ─── */}
      <div className="px-4 pb-3 shrink-0 relative">
        <div className="apple-search-pill px-3.5 py-2 flex items-center gap-2.5">
          <SearchIcon className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={onInputChange}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search TripNest / Apple Maps"
            className="w-full bg-transparent text-xs font-medium placeholder:text-zinc-400 outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] font-mono text-zinc-400 bg-white/10 dark:bg-white/10 light:bg-black/10 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          )}
        </div>

        {/* Live Search Autocomplete Flyout */}
        <AnimatePresence>
          {isSearchFocused && (searchQuery.trim() || searchResults.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.16 }}
              className={`absolute top-full inset-x-4 mt-1.5 p-2 rounded-2xl z-50 shadow-2xl max-h-72 overflow-y-auto ${
                isDark
                  ? 'bg-[#121622]/98 border border-white/15 text-white'
                  : 'bg-white/98 border border-black/10 text-black'
              } backdrop-blur-3xl`}
            >
              {isSearching ? (
                <div className="p-3 text-center text-xs font-mono text-zinc-400">
                  Searching destinations...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-center text-xs font-mono text-zinc-400">
                  No places found
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((res) => {
                    const photo = getDestinationPhoto(res);
                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => handleSelectLocation(res)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
                        }`}
                      >
                        <img
                          src={photo}
                          alt={res.name}
                          className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{res.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono truncate">
                            {res.country || res.name.split(',')[1]?.trim() || 'Global'}
                          </div>
                        </div>
                        <AppleChevronRightIcon className="w-3 h-3 text-zinc-400" />
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Scrollable Apple OS Sidebar Menu Items ─── */}
      <div className="flex-1 overflow-y-auto px-3.5 py-1 space-y-4">
        {/* ─── Section: Places ─── */}
        <div className="space-y-1">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 tracking-tight">
            Places
          </div>

          {/* Pinned */}
          <div
            className="apple-list-row justify-between"
            onClick={() => {
              if (onOpenDrawer) onOpenDrawer('itinerary');
            }}
          >
            <div className="flex items-center gap-3">
              <PinIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Pinned</span>
            </div>
            {pinnedCount > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {pinnedCount}
              </span>
            )}
          </div>

          {/* Saved Places */}
          <div
            className="apple-list-row"
            onClick={() => {
              if (onOpenDrawer) onOpenDrawer('overview');
            }}
          >
            <BookmarkIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium">Saved Places</span>
          </div>

          {/* Guides / Curated Expeditions */}
          <div
            className="apple-list-row justify-between"
            onClick={openPremade}
          >
            <div className="flex items-center gap-3">
              <BookOpenIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium">Guides & Catalog</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {allDestinations.length}
            </span>
          </div>

          {/* Routes / Itinerary Builder */}
          <div
            className="apple-list-row"
            onClick={() => {
              if (onOpenDrawer) onOpenDrawer('itinerary');
            }}
          >
            <RouteIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium">Routes & Itinerary</span>
          </div>
        </div>

        {/* ─── Section: Siri / AI Suggestions ─── */}
        <div className="space-y-1 pt-1">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 tracking-tight">
            Siri Suggestions
          </div>

          <div
            className="apple-list-row gap-3"
            onClick={() => handleSelectLocation(siriSuggestion)}
          >
            <div className="w-7 h-7 rounded-full bg-white/10 dark:bg-white/10 light:bg-black/10 border border-white/10 flex items-center justify-center text-zinc-300 dark:text-zinc-300 light:text-zinc-700 shrink-0">
              <CitySkylineIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">
                {siriSuggestion.name.split(',')[0]}
              </div>
              <div className="text-[10px] text-zinc-400 truncate">
                Recently viewed
              </div>
            </div>
          </div>
        </div>

        {/* ─── Section: Recents ─── */}
        {recents.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 tracking-tight">
              Recents
            </div>

            {recents.map((item) => (
              <div
                key={item.id}
                className="apple-list-row gap-3"
                onClick={() => handleSelectLocation(item)}
              >
                {/* Dynamic Avatar Badge based on type */}
                {item.type === 'place' ? (
                  <div className="w-7 h-7 rounded-full bg-blue-500/80 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                    P
                  </div>
                ) : item.type === 'mountain' ? (
                  <div className="w-7 h-7 rounded-full bg-white/10 dark:bg-white/10 light:bg-black/10 border border-white/10 flex items-center justify-center text-zinc-300 dark:text-zinc-300 light:text-zinc-700 shrink-0">
                    <MountainIcon className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 dark:bg-white/10 light:bg-black/10 border border-white/10 flex items-center justify-center text-zinc-300 dark:text-zinc-300 light:text-zinc-700 shrink-0">
                    <CitySkylineIcon className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{item.name}</div>
                  <div className="text-[10px] text-zinc-400 truncate font-mono">
                    {item.subtitle}
                  </div>
                </div>
              </div>
            ))}

            {/* Clear Recents Action Link */}
            <div className="px-2.5 pt-1.5 pb-2">
              <button
                type="button"
                onClick={clearRecents}
                className="text-xs font-semibold text-emerald-400 dark:text-emerald-400 light:text-emerald-600 hover:underline cursor-pointer"
              >
                Clear Recents
              </button>
            </div>
          </div>
        )}

        {/* ─── Section: Quick Tools & Intelligence ─── */}
        <div className="space-y-1 pt-1">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-zinc-400 tracking-tight">
            TripNest OS 26 Tools
          </div>

          <div className="apple-list-row" onClick={showQuiz}>
            <SparklesIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium">AI Travel Matchmaker</span>
          </div>

          <div className="apple-list-row" onClick={openCompare}>
            <ScaleIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium">Compare Places</span>
          </div>

          <div className="apple-list-row justify-between" onClick={toggleTheme}>
            <div className="flex items-center gap-3">
              {isDark ? (
                <SunIcon className="w-4 h-4 text-emerald-400" />
              ) : (
                <MoonIcon className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs font-medium">
                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {isDark ? 'Dark' : 'Light'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Apple OS Footer ─── */}
      <div className="p-3.5 border-t border-white/10 dark:border-white/10 light:border-black/10 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={openPremade}
          className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white dark:hover:text-white light:hover:text-black transition-colors cursor-pointer"
        >
          <span>Terms & Conditions</span>
          <AppleChevronRightIcon className="w-3 h-3 text-zinc-400" />
        </button>

        <span className="text-[10px] font-mono text-zinc-400">
          OS 26
        </span>
      </div>
    </motion.aside>
  );
}
