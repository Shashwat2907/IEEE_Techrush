import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { getDestinationPhoto } from '../../services/photos';
import destinationsData from '../../data/destinations.json';
import premadeData from '../../data/premadeItineraries.json';
import {
  CloseIcon,
  SearchIcon,
  CompassIcon,
  CalendarIcon,
  ArrowRightIcon,
  SunIcon,
} from '../../components/ui/Icons';

export default function PremadeItineraries({ isOpen, onClose, onSelectItinerary }) {
  const { flyToDestination } = useApp();
  const { loadPremadeItinerary, setDestination } = useItinerary();
  const { formatPrice } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [customGeocoded, setCustomGeocoded] = useState(null);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Live custom city search if not found in catalog
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setCustomGeocoded(null);
      return;
    }

    const timer = setTimeout(async () => {
      const q = searchQuery.toLowerCase().trim();
      const inCatalog = destinationsData.some((d) => d.name.toLowerCase().includes(q));

      if (!inCatalog) {
        setIsSearchingGeocode(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              searchQuery
            )}&limit=1`
          );
          const data = await res.json();
          if (data && data.length > 0) {
            const place = data[0];
            const lat = parseFloat(place.lat);
            const lng = parseFloat(place.lon);

            let temp = 22;
            let desc = 'Pleasant weather';
            try {
              const wRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`
              );
              const wData = await wRes.json();
              if (wData.current) {
                temp = Math.round(wData.current.temperature_2m);
                desc = `${temp}°C live forecast`;
              }
            } catch {}

            setCustomGeocoded({
              id: `geo-${Date.now()}`,
              name: place.display_name.split(',').slice(0, 2).join(', '),
              lat,
              lng,
              country: place.display_name.split(',').slice(-1)[0]?.trim() || '',
              type: ['custom', 'city'],
              season: ['all'],
              budgetTier: 'mid',
              crowdLevel: 'medium',
              bestTimeToVisit: 'Year-round',
              description: `Explore the vibrant streets, local landmarks, and culture of ${
                place.display_name.split(',')[0]
              }.`,
              weatherDesc: desc,
              activities: [
                { name: 'City Center & Historic District Walk', cost: 0, durationHrs: 3 },
                { name: 'Iconic Landmark & Viewpoint Tour', cost: 15, durationHrs: 2 },
                { name: 'Authentic Local Dining Experience', cost: 30, durationHrs: 2 },
              ],
            });
          } else {
            setCustomGeocoded(null);
          }
        } catch {
          setCustomGeocoded(null);
        } finally {
          setIsSearchingGeocode(false);
        }
      } else {
        setCustomGeocoded(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter destinations with a 5+ minimum guarantee
  const filteredDestinations = useMemo(() => {
    let list = destinationsData.filter((dest) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = dest.name.toLowerCase().includes(q);
        const matchDesc = dest.description.toLowerCase().includes(q);
        const matchType = dest.type.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchType) return false;
      }

      // Season
      if (selectedSeason !== 'all') {
        if (!dest.season.includes(selectedSeason)) return false;
      }

      // Budget
      if (selectedBudget !== 'all') {
        if (dest.budgetTier !== selectedBudget) return false;
      }

      // Type
      if (selectedType !== 'all') {
        if (!dest.type.includes(selectedType)) return false;
      }

      return true;
    });

    // Fallback: If strict filters return fewer than 5 cards, backfill
    if (list.length < 5) {
      const remaining = destinationsData.filter((d) => !list.some((item) => item.id === d.id));
      list = [...list, ...remaining.slice(0, 5 - list.length)];
    }

    return list;
  }, [searchQuery, selectedSeason, selectedBudget, selectedType]);

  const handleSelectDestination = (dest) => {
    const matchedPremade = premadeData.find((p) => p.destinationId === dest.id);

    if (matchedPremade) {
      loadPremadeItinerary(matchedPremade);
    } else {
      setDestination(dest);
    }

    flyToDestination(dest);
    onClose();
    if (onSelectItinerary) onSelectItinerary();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-[#06090F] flex flex-col overflow-hidden select-none"
    >
      {/* Top Bar */}
      <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#0B101B]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-sky/15 flex items-center justify-center text-accent-sky">
              <CompassIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide">
                Trending Destinations
              </h2>
              <p className="text-xs font-body text-text-secondary mt-0.5">
                Curated seasonal itineraries & handcrafted travel guides
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-secondary hover:text-white transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex-shrink-0 border-b border-white/[0.04] bg-[#0B101B]/50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search input */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by city, country, or vibe (e.g. Kyoto, Beach, Alps)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] focus:border-accent-sky/40 rounded-xl text-xs text-white placeholder:text-text-secondary/40 outline-none transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Season Filter */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-body text-text-secondary hover:text-white outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B101B] text-white">All Seasons</option>
              <option value="spring" className="bg-[#0B101B] text-white">🌸 Spring</option>
              <option value="summer" className="bg-[#0B101B] text-white">☀️ Summer</option>
              <option value="autumn" className="bg-[#0B101B] text-white">🍂 Autumn</option>
              <option value="winter" className="bg-[#0B101B] text-white">❄️ Winter</option>
              <option value="monsoon" className="bg-[#0B101B] text-white">🌧️ Monsoon</option>
            </select>

            {/* Budget Filter */}
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-body text-text-secondary hover:text-white outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B101B] text-white">All Budgets</option>
              <option value="budget" className="bg-[#0B101B] text-white">$ Budget</option>
              <option value="mid" className="bg-[#0B101B] text-white">$$ Moderate</option>
              <option value="premium" className="bg-[#0B101B] text-white">$$$ Luxury</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-body text-text-secondary hover:text-white outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0B101B] text-white">All Types</option>
              <option value="beach" className="bg-[#0B101B] text-white">🏖️ Beaches</option>
              <option value="mountain" className="bg-[#0B101B] text-white">⛰️ Mountains</option>
              <option value="culture" className="bg-[#0B101B] text-white">🏛️ Culture & Heritage</option>
              <option value="adventure" className="bg-[#0B101B] text-white">🧗 Adventure</option>
              <option value="city" className="bg-[#0B101B] text-white">🏙️ Modern Cities</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Photographic Cards Grid View */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Dynamic Geocoded Card for searched cities */}
          {customGeocoded && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-accent-sky uppercase tracking-wider">
                  Live Discovered Destination
                </span>
                <span className="text-[11px] text-accent-emerald bg-accent-emerald/10 px-2.5 py-0.5 rounded-full font-medium">
                  AI Enriched
                </span>
              </div>

              <div
                onClick={() => handleSelectDestination(customGeocoded)}
                className="relative h-60 rounded-2xl overflow-hidden border border-accent-sky/30 hover:border-accent-sky transition-all cursor-pointer group shadow-2xl"
              >
                <img
                  src={getDestinationPhoto(customGeocoded)}
                  alt={customGeocoded.name}
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.65] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />

                <div className="relative h-full p-6 flex flex-col justify-between z-10">
                  <div>
                    <span className="text-xs font-semibold text-accent-sky uppercase tracking-wider bg-accent-sky/20 px-2.5 py-1 rounded-md">
                      Custom Location
                    </span>
                    <h3 className="text-2xl font-display font-bold text-white mt-2 group-hover:text-accent-sky transition-colors">
                      {customGeocoded.name}
                    </h3>
                    <p className="text-xs text-white/80 mt-1 max-w-xl line-clamp-2 leading-relaxed">
                      {customGeocoded.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="text-xs text-accent-amber flex items-center gap-1.5 font-medium">
                      <SunIcon className="w-4 h-4" />
                      {customGeocoded.weatherDesc}
                    </span>

                    <span className="text-xs font-semibold text-accent-sky group-hover:translate-x-1.5 transition-transform flex items-center gap-1.5">
                      Explore Destination
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Curated Photographic Destination Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {filteredDestinations.length} Curated Guides Ready
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDestinations.map((dest) => {
                const photoUrl = getDestinationPhoto(dest);
                const minCost = dest.activities
                  ? Math.min(...dest.activities.map((a) => a.cost || 0))
                  : 0;

                return (
                  <div
                    key={dest.id}
                    onClick={() => handleSelectDestination(dest)}
                    className="relative h-64 sm:h-72 rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/25 transition-all cursor-pointer group shadow-xl flex flex-col justify-between"
                  >
                    {/* Background Photographic Image */}
                    <img
                      src={photoUrl}
                      alt={dest.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover brightness-[0.6] group-hover:scale-105 group-hover:brightness-[0.7] transition-all duration-700 ease-out"
                    />

                    {/* Gradient Overlay for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B101B] via-black/40 to-black/20" />

                    {/* Top Row: Tags & Season */}
                    <div className="relative p-5 z-10 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {(dest.type || []).slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-black/50 text-white/90 backdrop-blur-md border border-white/10"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <span className="text-[11px] font-medium text-white/80 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-md capitalize">
                        {dest.season?.[0] || 'Year-round'}
                      </span>
                    </div>

                    {/* Bottom Area: Title, Summary & Explore */}
                    <div className="relative p-5 z-10 flex flex-col justify-end">
                      <h4 className="text-xl font-display font-bold text-white drop-shadow-md group-hover:text-accent-sky transition-colors">
                        {dest.name}
                      </h4>

                      <p className="text-xs text-white/75 font-body mt-1 line-clamp-2 leading-relaxed">
                        {dest.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-white/80">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5 text-accent-sky" />
                            {dest.bestTimeToVisit || 'Seasonal'}
                          </span>
                          <span className="text-accent-emerald font-semibold">
                            From {formatPrice(minCost)}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-accent-sky group-hover:translate-x-1.5 transition-transform flex items-center gap-1">
                          Explore
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
