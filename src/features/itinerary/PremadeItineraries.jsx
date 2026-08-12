import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { getDestinations } from '../../services/destinations';
import { getDestinationPhoto } from '../../services/photos';
import { useItinerary } from '../../context/ItineraryContext';
import {
  CompassIcon,
  CloseIcon,
  SearchIcon,
  SunIcon,
  DollarIcon,
  UsersIcon,
  CalendarIcon,
  SparklesIcon,
} from '../../components/ui/Icons';

const CATEGORIES = [
  { id: 'all', label: 'All Catalog' },
  { id: 'nature', label: 'Alpine & Nature' },
  { id: 'beach', label: 'Coastal & Tropical' },
  { id: 'culture', label: 'Culture & Heritage' },
  { id: 'city', label: 'Metropolis' },
];

const SEASONS = [
  { id: 'all', label: 'All Seasons' },
  { id: 'spring', label: '🌸 Spring' },
  { id: 'summer', label: '☀️ Summer' },
  { id: 'autumn', label: '🍂 Autumn' },
  { id: 'winter', label: '❄️ Winter' },
];

const BUDGET_TIERS = [
  { id: 'all', label: 'Any Budget' },
  { id: 'budget', label: 'Budget' },
  { id: 'mid', label: 'Mid-Range' },
  { id: 'premium', label: 'Premium' },
];

export default function PremadeItineraries({ isOpen, onClose, onSelectItinerary }) {
  const { flyToDestination } = useApp();
  const { isDark } = useTheme();
  const { loadPremadeItinerary } = useItinerary();

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const allDestinations = useMemo(() => getDestinations(), []);

  const filteredDestinations = useMemo(() => {
    return allDestinations.filter((d) => {
      // Category match
      if (activeCategory !== 'all' && !d.type?.includes(activeCategory)) {
        return false;
      }
      // Season match
      if (selectedSeason !== 'all' && !d.season?.includes(selectedSeason)) {
        return false;
      }
      // Budget match
      if (selectedBudget !== 'all' && d.budgetTier !== selectedBudget) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesCountry = d.country?.toLowerCase().includes(q);
        const matchesDesc = d.description?.toLowerCase().includes(q);
        const matchesType = d.type?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesCountry && !matchesDesc && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [allDestinations, activeCategory, selectedSeason, selectedBudget, searchQuery]);

  const handleLaunch = (dest) => {
    loadPremadeItinerary({
      id: dest.id,
      cityName: dest.name.split(',')[0].trim(),
      days: (dest.activities || []).map((act, i) => ({
        id: `day-${i + 1}`,
        dayNumber: i + 1,
        label: `Day ${i + 1}`,
        activities: [
          {
            id: `act-${dest.id}-${i}-1`,
            name: act.name,
            type: act.type || 'activity',
            durationHrs: act.durationHrs || 2,
            cost: act.cost || 25,
            notes: act.description || 'Curated sight',
          },
        ],
      })),
    });

    onClose();
    flyToDestination(dest);
    if (onSelectItinerary) onSelectItinerary();
  };

  const hasActiveFilters = activeCategory !== 'all' || selectedSeason !== 'all' || selectedBudget !== 'all' || searchQuery.trim() !== '';

  const resetFilters = () => {
    setActiveCategory('all');
    setSelectedSeason('all');
    setSelectedBudget('all');
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0.95 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-0 z-[1000] ${
        isDark ? 'text-white' : 'text-[#0F172A]'
      } flex flex-col overflow-hidden font-sans select-none`}
    >
      {/* ─── Aurora Borealis Night Sky Background Layer ─── */}
      <div className="fixed inset-0 w-[100vw] h-[100vh] pointer-events-none z-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2500&auto=format&fit=crop"
          alt="Aurora Borealis Night Sky"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-[18px]"
        />
        <div className="absolute inset-0 bg-[#020e18]/75" />
      </div>

      {/* ─── Top Header Bar ─── */}
      <div className={`px-5 sm:px-8 py-4 border-b ${
        isDark ? 'border-white/10 bg-[#111116]/95 text-white' : 'border-black/10 bg-white/95 text-[#0F172A]'
      } backdrop-blur-2xl flex items-center justify-between shrink-0 z-20 shadow-md`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CompassIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tight uppercase">
              Curated Destinations
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium hidden sm:block">
              {filteredDestinations.length} Master-Planned Expeditions Ready to Deploy
            </p>
          </div>
        </div>

        {/* Quick Search & Actions */}
        <div className="flex items-center gap-3">
          <div className={`relative hidden md:flex items-center rounded-full px-3.5 py-1.5 border ${
            isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
          }`}>
            <SearchIcon className="w-3.5 h-3.5 text-zinc-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="bg-transparent text-xs outline-none w-36 placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-white ml-1 cursor-pointer"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark ? 'hover:bg-white/15 text-zinc-400 hover:text-white' : 'hover:bg-black/10 text-zinc-600 hover:text-black'
            }`}
            title="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Refined Multi-Tag Filter Matrix (No visible slider bars) ─── */}
      <div className={`px-5 sm:px-8 py-3.5 border-b ${
        isDark ? 'border-white/10 bg-[#0E0E12]/90' : 'border-black/10 bg-[#F1F3F5]/90'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-10`}>
        {/* Horizontal Tag Filters Container */}
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. Category Segment */}
          <div className={`flex items-center p-1 rounded-full border ${
            isDark ? 'bg-black/40 border-white/10' : 'bg-white/70 border-black/10'
          } shrink-0`}>
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? isDark
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'bg-[#0F172A] text-white font-bold shadow-sm'
                      : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="hidden lg:block h-5 w-[1px] bg-white/15 dark:bg-white/15 light:bg-black/10 shrink-0" />

          {/* 2. Season Tags */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 mr-0.5 tracking-wider">Season</span>
            {SEASONS.map((s) => {
              const isSelected = selectedSeason === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSeason(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? 'bg-emerald-500 text-black font-bold border-emerald-500 shadow-sm'
                      : isDark
                      ? 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
                      : 'bg-white text-zinc-600 border-black/10 hover:text-black hover:bg-black/5'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="hidden xl:block h-5 w-[1px] bg-white/15 dark:bg-white/15 light:bg-black/10 shrink-0" />

          {/* 3. Budget Tags */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 mr-0.5 tracking-wider">Budget</span>
            {BUDGET_TIERS.map((b) => {
              const isSelected = selectedBudget === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBudget(b.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    isSelected
                      ? isDark
                        ? 'bg-white/20 text-white font-bold border-white/40 shadow-sm'
                        : 'bg-black/15 text-black font-bold border-black/30 shadow-sm'
                      : isDark
                      ? 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                      : 'bg-white text-zinc-600 border-black/10 hover:text-black'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset Filters Option if any active */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 self-start sm:self-center cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ─── Bento Exhibition Grid with Generous Whitespace ─── */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 no-scrollbar">
        <div className="max-w-7xl mx-auto">
          {filteredDestinations.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-white/10 dark:border-white/10 light:border-black/15 rounded-3xl p-8 space-y-3">
              <div className="text-base font-bold">
                No Destinations Match the Selected Filter Tags
              </div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Try resetting some filters or searching for another location.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="btn-primary text-xs py-2 px-6 rounded-full mt-2 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
              {filteredDestinations.map((dest) => {
                const cityName = dest.name.split(',')[0].trim();
                const countryName = dest.country || dest.name.split(',')[1]?.trim() || 'Global';
                const photo = getDestinationPhoto(dest);
                const daysCount = dest.activities?.length || 3;

                return (
                  <div
                    key={dest.id}
                    className="bento-card overflow-hidden group hover:border-white/30 dark:hover:border-white/30 light:hover:border-black/20 transition-all flex flex-col justify-between shadow-lg"
                  >
                    {/* Visual Media Header */}
                    <div className="relative h-56 w-full overflow-hidden bg-black/40">
                      <img
                        src={photo}
                        alt={dest.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      {/* Floating Metadata Pills */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-emerald-400 border border-emerald-500/30">
                            {dest.season?.[0] || 'Year-Round'}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-zinc-200 border border-white/15">
                            {dest.budgetTier || 'Mid'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-white/25 backdrop-blur-md text-white px-2.5 py-1 rounded-full border border-white/20">
                          {daysCount} Days
                        </span>
                      </div>

                      {/* City / Country Title */}
                      <div className="absolute bottom-3.5 left-3.5 right-3.5">
                        <div className="text-xl font-black text-white uppercase tracking-tight drop-shadow-md">
                          {cityName}
                        </div>
                        <div className="text-xs text-zinc-300 font-medium drop-shadow">
                          {countryName} • {dest.bestTimeToVisit || 'Optimal Season'}
                        </div>
                      </div>
                    </div>

                    {/* Editorial Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'} line-clamp-2 leading-relaxed font-medium`}>
                        {dest.description}
                      </p>

                      {/* Sights Highlights */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                          Highlights Included:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(dest.activities || []).slice(0, 3).map((act, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2.5 py-1 rounded-full ${
                                isDark
                                  ? 'bg-white/5 text-zinc-300 border border-white/10'
                                  : 'bg-black/5 text-zinc-700 border border-black/10'
                              } truncate max-w-[150px] font-medium`}
                            >
                              {act.name}
                            </span>
                          ))}
                          {(dest.activities?.length || 0) > 3 && (
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium self-center">
                              +{dest.activities.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Launch Button */}
                      <button
                        type="button"
                        onClick={() => handleLaunch(dest)}
                        className="w-full btn-primary py-3 text-xs font-bold rounded-full flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-md hover:scale-[1.01] transition-transform"
                      >
                        <span>Explore & Launch Itinerary</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
