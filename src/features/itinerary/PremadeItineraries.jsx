import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useItinerary } from '../../context/ItineraryContext';
import premadeData from '../../data/premadeItineraries.json';
import { CloseIcon, SearchIcon, CompassIcon } from '../../components/ui/Icons';

export default function PremadeItineraries({ isOpen, onClose, onSelectItinerary }) {
  const { flyToDestination } = useApp();
  const { loadPremadeItinerary } = useItinerary();
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const allRegions = useMemo(() => {
    return ['all', ...premadeData.map((r) => r.region)];
  }, []);

  const filteredRegions = useMemo(() => {
    return premadeData
      .map((regionGroup) => {
        if (selectedRegion !== 'all' && regionGroup.region !== selectedRegion) {
          return null;
        }

        const filteredItems = regionGroup.items.filter((item) => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            item.country.toLowerCase().includes(q) ||
            item.cityName.toLowerCase().includes(q) ||
            item.tags.some((t) => t.toLowerCase().includes(q))
          );
        });

        if (filteredItems.length === 0) return null;
        return {
          region: regionGroup.region,
          items: filteredItems,
        };
      })
      .filter(Boolean);
  }, [selectedRegion, searchQuery]);

  const handleSelect = (item) => {
    loadPremadeItinerary(item);
    flyToDestination({
      id: item.id,
      name: item.cityName || item.name,
      lat: item.lat,
      lng: item.lng,
      type: item.tags || [],
      season: ['spring', 'summer', 'autumn'],
      budgetTier: 'mid',
      crowdLevel: 'medium',
      activities: item.days?.flatMap((d) => d.activities) || [],
    });
    onClose();
    if (onSelectItinerary) {
      onSelectItinerary();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[1001] bg-[#07090E]/98 backdrop-blur-3xl overflow-y-auto flex flex-col text-white select-none"
    >
      {/* ─── Top Navigation Bar ─── */}
      <div className="sticky top-0 z-30 bg-[#07090E]/90 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-8 py-3.5 sm:py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent-sky/10 border border-accent-sky/20 flex items-center justify-center text-accent-sky">
              <CompassIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-base sm:text-lg tracking-wider text-white">
                Curated Premade Itineraries
              </h2>
              <p className="text-[11px] sm:text-xs text-text-secondary font-body">
                Handcrafted day-by-day itineraries, visa guides & highlights
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/10 transition-colors text-xs font-mono"
            title="Return to Globe"
          >
            <span>Back to Globe</span>
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ─── Filter & Search Bar ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Region Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {allRegions.map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-3 py-1 rounded-full text-xs font-mono whitespace-nowrap transition-all ${
                  selectedRegion === reg
                    ? 'bg-accent-sky text-slate-950 font-bold shadow-md shadow-accent-sky/20'
                    : 'bg-white/5 text-text-secondary hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {reg === 'all' ? 'All Regions' : reg}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex items-center w-full sm:w-64 bg-surface-raised border border-white/10 rounded-xl px-3 py-1.5">
            <SearchIcon className="w-3.5 h-3.5 text-text-secondary/60 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination, visa, tag..."
              className="w-full bg-transparent text-xs text-white placeholder:text-text-secondary/50 font-body outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-text-secondary hover:text-white ml-1 p-0.5"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Content Itineraries Grid ─── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-10">
        {filteredRegions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-text-secondary font-mono text-sm">No curated destinations match your search.</p>
            <button
              onClick={() => {
                setSelectedRegion('all');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-2 bg-accent-sky/20 text-accent-sky border border-accent-sky/30 rounded-xl text-xs font-mono hover:bg-accent-sky/30 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredRegions.map((group) => (
            <div key={group.region} className="space-y-4">
              {/* Region Divider Header (matching user screenshot) */}
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"></div>
                <div className="relative bg-[#07090E] px-6 py-0.5 text-xs sm:text-sm font-display font-bold tracking-widest text-purple-400 italic">
                  {group.region}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                {group.items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleSelect(item)}
                    className="group relative rounded-2xl overflow-hidden cursor-pointer bg-surface border border-white/10 hover:border-accent-sky/40 shadow-lg hover:shadow-2xl hover:shadow-accent-sky/10 transition-all flex flex-col aspect-[3/4]"
                  >
                    {/* Background Cover Image */}
                    <div className="absolute inset-0 z-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                      {/* Gradient Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                      <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/5 transition-colors"></div>
                    </div>

                    {/* Top Flag / Country Badge */}
                    <div className="relative z-10 p-3 flex items-start justify-between">
                      <div className="w-7 h-7 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-sm shadow-md">
                        {item.flag}
                      </div>
                    </div>

                    {/* Bottom Info Card Content (matching user reference screenshot) */}
                    <div className="relative z-10 mt-auto p-3 flex flex-col">
                      <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-wide drop-shadow group-hover:text-accent-sky transition-colors truncate">
                        {item.name}
                      </h3>

                      <div className="mt-1 space-y-0.5 text-[10px] sm:text-[11px] font-body text-white/80">
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span className="font-mono text-white/90">{item.idealDuration}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>🛂</span>
                          <span className="text-accent-sky/90 font-mono">{item.visa}</span>
                        </div>
                      </div>

                      {/* Hover action CTA */}
                      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-accent-sky font-semibold opacity-90 group-hover:opacity-100">
                        <span>Explore {item.name}</span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
