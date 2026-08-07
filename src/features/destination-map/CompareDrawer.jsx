import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompare } from '../../context/CompareContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { getDestinations } from '../../services/destinations';
import { getDestinationPhoto } from '../../services/photos';
import {
  CloseIcon,
  ScaleIcon,
  SearchIcon,
  CheckIcon,
} from '../../components/ui/Icons';

const FILTER_TAGS = [
  { id: 'all', label: 'All Destinations' },
  { id: 'beach', label: 'Beach' },
  { id: 'culture', label: 'Culture & Heritage' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'nature', label: 'Nature' },
  { id: 'budget', label: 'Budget Friendly' },
  { id: 'premium', label: 'Luxury & Premium' },
];

function getBudgetBadge(tier) {
  switch (tier?.toLowerCase()) {
    case 'budget':
      return { label: 'Budget', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' };
    case 'mid':
    case 'mid-range':
      return { label: 'Mid-Range', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25' };
    case 'premium':
    case 'luxury':
    default:
      return { label: 'Premium', bg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25' };
  }
}

function getCrowdBadge(level) {
  switch (level?.toLowerCase()) {
    case 'low':
      return { label: 'Low Crowds', bg: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25' };
    case 'high':
      return { label: 'High Traffic', bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25' };
    case 'medium':
    case 'moderate':
    default:
      return { label: 'Medium Traffic', bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25' };
  }
}

export default function CompareDrawer({ isOpen, onClose }) {
  const { compareList, addToCompare, removeFromCompare, clearCompare } = useCompare();
  const { flyToDestination } = useApp();
  const { isDark } = useTheme();

  const [modalSearch, setModalSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const horizontalSliderRef = useRef(null);

  const allDestinations = useMemo(() => getDestinations(), []);

  // Listen for Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredDestinations = useMemo(() => {
    return allDestinations.filter((d) => {
      // Search matching
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesCountry = d.country?.toLowerCase().includes(q);
        const matchesType = d.type?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesCountry && !matchesType) return false;
      }

      // Tag filtering
      if (activeFilter === 'all') return true;
      if (activeFilter === 'budget') return d.budgetTier === 'budget';
      if (activeFilter === 'premium') return d.budgetTier === 'premium';
      return d.type?.includes(activeFilter);
    });
  }, [allDestinations, modalSearch, activeFilter]);

  const handleLaunch = (dest) => {
    onClose();
    flyToDestination(dest);
  };

  const scrollSlider = (direction) => {
    if (horizontalSliderRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      horizontalSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none font-sans overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-5xl h-[86vh] max-h-[760px] apple-liquid-glass rounded-[28px] border ${
          isDark ? 'border-white/15 text-white' : 'border-black/10 text-slate-900'
        } flex flex-col overflow-hidden shadow-2xl relative my-auto`}
      >
        {/* ─── Top Header Bar (Always pinned at top, 100% visible) ─── */}
        <div
          className={`px-5 py-3.5 border-b ${
            isDark ? 'border-white/10 bg-[#121826]/90' : 'border-black/10 bg-white/90'
          } backdrop-blur-2xl flex items-center justify-between shrink-0 z-20`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ScaleIcon className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="font-bold text-sm sm:text-base uppercase tracking-wider text-slate-900 dark:text-white truncate">
                Destination Comparison Matrix
              </h2>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                {compareList.length} of 3 locations staged for analysis
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className={`text-[11px] py-1 px-3 rounded-full font-semibold transition-colors cursor-pointer border ${
                  isDark
                    ? 'border-white/15 text-zinc-400 hover:text-white hover:bg-white/10'
                    : 'border-black/15 text-slate-600 hover:text-black hover:bg-black/5'
                }`}
              >
                Clear Matrix
              </button>
            )}

            {/* Prominent High-Contrast Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                isDark
                  ? 'bg-white/15 hover:bg-white/25 text-white border-white/20 shadow-md hover:scale-105'
                  : 'bg-black/10 hover:bg-black/20 text-slate-900 border-black/15 shadow-md hover:scale-105'
              }`}
              title="Close Comparison (Esc)"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Scrollable Workspace Body ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {/* Active Comparison Matrix Section (if destinations are chosen) */}
          {compareList.length > 0 && (
            <div className="space-y-2.5 pb-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                <span>Staged Destinations ({compareList.length}/3)</span>
                <span className="text-[10px] text-emerald-500 font-medium">Side-by-Side Analysis Ready</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {compareList.map((dest) => {
                  const photo = getDestinationPhoto(dest);
                  const budgetPercent = dest.budgetTier === 'budget' ? 30 : dest.budgetTier === 'mid' ? 65 : 95;
                  const crowdPercent = dest.crowdLevel === 'low' ? 25 : dest.crowdLevel === 'medium' ? 60 : 90;
                  const sightsCount = dest.activities?.length || 0;
                  const budgetBadge = getBudgetBadge(dest.budgetTier);
                  const crowdBadge = getCrowdBadge(dest.crowdLevel);

                  const parts = dest.name.split(', ');
                  const cityName = parts[0];
                  const countryName = parts[1] || dest.country || 'Global';

                  return (
                    <motion.div
                      key={dest.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className={`rounded-2xl border ${
                        isDark ? 'bg-[#121826]/80 border-white/10' : 'bg-white/90 border-black/10 shadow-md'
                      } backdrop-blur-xl overflow-hidden flex flex-col justify-between`}
                    >
                      {/* Banner */}
                      <div className="relative h-32 w-full overflow-hidden bg-black/40">
                        <img src={photo} alt={dest.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                        {/* Remove from compare button */}
                        <button
                          type="button"
                          onClick={() => removeFromCompare(dest.id)}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/75 backdrop-blur-md text-white hover:bg-red-500 hover:text-white flex items-center justify-center cursor-pointer border border-white/20 transition-all shadow-md"
                          title="Remove from matrix"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>

                        <div className="absolute bottom-2 left-3 right-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 drop-shadow block">
                            {countryName}
                          </span>
                          <h3 className="text-base font-black text-white uppercase tracking-tight truncate drop-shadow">
                            {cityName}
                          </h3>
                        </div>
                      </div>

                      {/* Meters */}
                      <div className="p-3 space-y-2 flex-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-zinc-400">
                            Budget Tier
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${budgetBadge.bg}`}>
                            {budgetBadge.label}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${budgetPercent}%` }} />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-zinc-400">
                            Crowd Traffic
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${crowdBadge.bg}`}>
                            {crowdBadge.label}
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${crowdPercent}%` }} />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 pt-1">
                          <span>Season: <b className="text-slate-800 dark:text-zinc-200">{dest.bestTimeToVisit || 'All-Year'}</b></span>
                          <span>Sights: <b className="text-slate-800 dark:text-zinc-200">{sightsCount} Sights</b></span>
                        </div>
                      </div>

                      {/* Launch button */}
                      <div className="p-2.5 border-t border-black/10 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleLaunch(dest)}
                          className="w-full btn-primary py-1.5 text-xs font-bold rounded-full flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                        >
                          <span>Fly to Destination</span>
                          <span>→</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Destination Browser & Horizontal Slider Section ─── */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                {compareList.length > 0 ? 'Add More Locations' : 'Choose Places to Compare'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                Scroll horizontally or use arrow buttons
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-2">
              <div
                className={`flex items-center rounded-full px-3.5 py-1.5 border ${
                  isDark ? 'bg-white/10 border-white/15' : 'bg-black/5 border-black/10'
                }`}
              >
                <SearchIcon className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search locations by city, country or experiences..."
                  className="bg-transparent text-xs w-full outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-500 font-medium"
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch('')}
                    className="text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white ml-2 cursor-pointer"
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filter Pills + Left/Right Arrow Navigation */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {FILTER_TAGS.map((tag) => {
                    const isSelected = activeFilter === tag.id;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setActiveFilter(tag.id)}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-bold border-transparent shadow-sm'
                            : isDark
                            ? 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                            : 'bg-black/5 hover:bg-black/10 text-slate-700 border-black/10'
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>

                {/* Arrow Navigation */}
                <div className="flex items-center gap-1 shrink-0 pl-1">
                  <button
                    type="button"
                    onClick={() => scrollSlider('left')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                        : 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-900'
                    }`}
                    title="Scroll Left"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollSlider('right')}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                        : 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-900'
                    }`}
                    title="Scroll Right"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Horizontal Slider Carousel ─── */}
            <div
              ref={horizontalSliderRef}
              className="overflow-x-auto overflow-y-hidden flex items-stretch gap-3.5 py-1.5 px-0.5 no-scrollbar snap-x snap-mandatory"
              style={{ scrollBehavior: 'smooth' }}
            >
              {filteredDestinations.length === 0 ? (
                <div className="w-full flex items-center justify-center text-center py-10 text-slate-500 dark:text-zinc-400 text-xs font-semibold">
                  No destinations match your filter criteria.
                </div>
              ) : (
                filteredDestinations.map((dest) => {
                  const isAlreadyIn = compareList.some((c) => c.id === dest.id);
                  const photo = getDestinationPhoto(dest);
                  const budgetBadge = getBudgetBadge(dest.budgetTier);
                  const crowdBadge = getCrowdBadge(dest.crowdLevel);

                  const parts = dest.name.split(', ');
                  const cityName = parts[0];
                  const countryName = parts[1] || dest.country || 'Global';

                  return (
                    <div
                      key={dest.id}
                      className={`w-60 sm:w-64 shrink-0 snap-start rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                        isAlreadyIn
                          ? isDark
                            ? 'opacity-50 border-white/5 bg-white/5 cursor-not-allowed'
                            : 'opacity-50 border-black/5 bg-black/5 cursor-not-allowed'
                          : isDark
                          ? 'border-white/10 bg-[#121826]/80 hover:border-white/25 hover:bg-[#161F32] cursor-pointer shadow-md'
                          : 'border-black/10 bg-white/95 hover:border-black/20 hover:bg-white cursor-pointer shadow-sm'
                      } backdrop-blur-xl`}
                      onClick={() => {
                        if (!isAlreadyIn && compareList.length < 3) {
                          addToCompare(dest);
                        }
                      }}
                    >
                      {/* Photo Banner */}
                      <div className="relative h-28 w-full overflow-hidden bg-black/20 shrink-0">
                        <img
                          src={photo}
                          alt={dest.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        <div className="absolute bottom-2 left-3 right-3">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 drop-shadow block truncate">
                            {countryName}
                          </span>
                          <h4 className="text-sm font-black text-white truncate drop-shadow">
                            {cityName}
                          </h4>
                        </div>
                      </div>

                      {/* Info & Badges */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${budgetBadge.bg}`}>
                            {budgetBadge.label}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${crowdBadge.bg}`}>
                            {crowdBadge.label}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold">Best Season:</span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">
                              {dest.bestTimeToVisit || 'Year-Round'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] uppercase font-bold">Sights:</span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">
                              {dest.activities?.length || 0} Curated
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-1">
                          {isAlreadyIn ? (
                            <span className="w-full py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-full flex items-center justify-center gap-1">
                              <CheckIcon className="w-3 h-3" />
                              <span>Staged</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={compareList.length >= 3}
                              className="w-full py-1.5 text-[11px] font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-full transition-all shadow-sm cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1"
                            >
                              <span>+ Add to Compare</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ─── Bottom Footer Bar (Always pinned at bottom, 100% visible) ─── */}
        <div className="px-5 py-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-black/5 dark:bg-white/5 z-20">
          <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            {compareList.length} of 3 locations staged in matrix
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-6 rounded-full text-xs font-bold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black transition-all cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
