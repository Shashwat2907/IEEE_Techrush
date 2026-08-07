import { useState, useMemo } from 'react';
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
  SparklesIcon,
  CompassIcon,
  DollarIcon,
  UsersIcon,
  CheckIcon,
} from '../../components/ui/Icons';

export default function CompareDrawer({ isOpen, onClose }) {
  const { compareList, addToCompare, removeFromCompare, clearCompare } = useCompare();
  const { flyToDestination } = useApp();
  const { isDark } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  const allDestinations = useMemo(() => getDestinations(), []);

  const availableDestinations = useMemo(() => {
    return allDestinations.filter((d) => {
      if (!modalSearch.trim()) return true;
      const q = modalSearch.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.country?.toLowerCase().includes(q) ||
        d.type?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allDestinations, modalSearch]);

  const handleLaunch = (dest) => {
    onClose();
    flyToDestination(dest);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-6xl max-h-[92vh] apple-liquid-glass rounded-[28px] border ${
          isDark ? 'border-white/15 text-white' : 'border-black/10 text-[#0F172A]'
        } flex flex-col overflow-hidden shadow-2xl`}
      >
        {/* ─── Top Header Bar ─── */}
        <div className={`p-4 sm:p-5 border-b ${
          isDark ? 'border-white/10 bg-[#121826]/80' : 'border-black/10 bg-white/80'
        } backdrop-blur-2xl flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ScaleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg uppercase tracking-wider">
                Expedition Matrix Comparison
              </h2>
              <div className="text-xs text-zinc-400 font-mono">
                {compareList.length} of 3 destinations active for side-by-side analysis
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {compareList.length > 0 && (
              <>
                {compareList.length < 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="text-xs py-1.5 px-3.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer"
                  >
                    + Add Destination
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearCompare}
                  className="text-xs py-1.5 px-3 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
                >
                  Clear
                </button>
              </>
            )}
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

        {/* ─── Comparison Matrix Workspace ─── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 no-scrollbar">
          {compareList.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/15 dark:border-white/15 light:border-black/15 rounded-3xl p-8 space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                <ScaleIcon className="w-6 h-6" />
              </div>
              <div className="text-base font-bold">
                No Destinations Staged in Matrix
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Compare up to 3 global destinations side by side. Analyze real-time crowd indexes, budget dynamics, best seasons, and signature activities.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-xs py-2.5 px-6 rounded-full font-bold cursor-pointer"
              >
                + Choose Destinations to Compare
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {compareList.map((dest) => {
                const photo = getDestinationPhoto(dest);
                const budgetPercent = dest.budgetTier === 'budget' ? 30 : dest.budgetTier === 'mid' ? 65 : 95;
                const crowdPercent = dest.crowdLevel === 'low' ? 25 : dest.crowdLevel === 'medium' ? 60 : 90;
                const sightsCount = dest.activities?.length || 0;

                return (
                  <motion.div
                    key={dest.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bento-card overflow-hidden flex flex-col justify-between shadow-xl"
                  >
                    {/* Destination Banner */}
                    <div className="relative h-48 w-full overflow-hidden bg-black/40">
                      <img src={photo} alt={dest.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                      <button
                        type="button"
                        onClick={() => removeFromCompare(dest.id)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer border border-white/15 transition-colors"
                        title="Remove from comparison"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute bottom-3 left-4 right-4">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 drop-shadow">
                          {dest.country || 'Global'}
                        </span>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight truncate drop-shadow">
                          {dest.name}
                        </h3>
                      </div>
                    </div>

                    {/* Dynamic Metric Meters */}
                    <div className="p-4 sm:p-5 space-y-4 flex-1">
                      {/* Metric 1: Budget Level Meter */}
                      <div className="p-3.5 rounded-2xl bento-card space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                            Budget Tier
                          </span>
                          <span className={`font-mono font-bold capitalize ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {dest.budgetTier || 'Mid-Range'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 dark:bg-white/10 light:bg-black/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                            style={{ width: `${budgetPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 2: Crowd Index Meter */}
                      <div className="p-3.5 rounded-2xl bento-card space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                            Crowd Index
                          </span>
                          <span className={`font-mono font-bold capitalize ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {dest.crowdLevel || 'Moderate'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 dark:bg-white/10 light:bg-black/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-700"
                            style={{ width: `${crowdPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 3: Season & Sights */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-2xl bento-card">
                          <div className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                            Best Season
                          </div>
                          <div className={`text-xs font-bold font-mono mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {dest.bestTimeToVisit || 'Year-Round'}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bento-card">
                          <div className="text-[10px] uppercase font-bold text-zinc-400 font-mono">
                            Curated Sights
                          </div>
                          <div className={`text-xs font-bold font-mono mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {sightsCount} Sights
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Launch Action */}
                    <div className="p-4 sm:p-5 border-t border-white/10 dark:border-white/10 light:border-black/10">
                      <button
                        type="button"
                        onClick={() => handleLaunch(dest)}
                        className="w-full btn-primary py-2.5 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.01] transition-transform"
                      >
                        <span>Fly to Destination</span>
                        <span>→</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Add More Slot Placeholder if < 3 */}
              {compareList.length < 3 && (
                <div
                  className="bento-card border-dashed border-white/20 dark:border-white/20 light:border-black/15 p-6 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer hover:border-white/40 transition-all min-h-[380px] rounded-3xl"
                  onClick={() => setShowAddModal(true)}
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 dark:bg-white/5 light:bg-black/5 border border-white/10 dark:border-white/10 light:border-black/10 flex items-center justify-center text-zinc-400 text-lg font-bold">
                    +
                  </div>
                  <div>
                    <div className="text-sm font-bold">Add Destination</div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono">
                      Staging {compareList.length}/3 locations
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Dynamic Destination Selection Grid Modal ─── */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-2xl max-h-[85vh] apple-liquid-glass rounded-[28px] border ${
                  isDark ? 'border-white/15 text-white' : 'border-black/10 text-[#0F172A]'
                } p-5 sm:p-6 space-y-4 shadow-2xl flex flex-col overflow-hidden`}
              >
                {/* Modal Header & Live Search */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">
                      Add Destination to Matrix
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Select any global destination to compare
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter Search Input */}
                <div className={`flex items-center rounded-full px-3.5 py-2 border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                } shrink-0`}>
                  <SearchIcon className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search locations by city, country or type..."
                    className="bg-transparent text-xs w-full outline-none placeholder:text-zinc-500"
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch('')}
                      className="text-zinc-400 hover:text-white ml-1 cursor-pointer"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Cards Grid */}
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 no-scrollbar">
                  {availableDestinations.map((dest) => {
                    const isAlreadyIn = compareList.some((c) => c.id === dest.id);
                    const photo = getDestinationPhoto(dest);

                    return (
                      <div
                        key={dest.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                          isAlreadyIn
                            ? 'opacity-40 border-white/5 bg-white/5 cursor-not-allowed'
                            : isDark
                            ? 'border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer'
                            : 'border-black/10 bg-white hover:bg-black/5 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!isAlreadyIn) {
                            addToCompare(dest);
                            setShowAddModal(false);
                          }
                        }}
                      >
                        <img
                          src={photo}
                          alt={dest.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">
                            {dest.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5 capitalize">
                            {dest.budgetTier || 'Mid'} • {dest.crowdLevel || 'Moderate'} crowd
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isAlreadyIn ? (
                            <span className="text-[10px] font-mono text-zinc-500 font-bold px-2 py-1 bg-white/5 rounded-full">
                              Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="text-xs font-bold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 rounded-full border border-emerald-500/30 transition-colors"
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
