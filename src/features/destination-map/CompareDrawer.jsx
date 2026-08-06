import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompare } from '../../context/CompareContext';
import { useApp } from '../../context/AppContext';
import { getDestinations } from '../../services/destinations';
import { ScaleIcon, CloseIcon, PlusIcon, ArrowRightIcon } from '../../components/ui/Icons';

export default function CompareDrawer({ isOpen, onClose }) {
  const { compareList, addToCompare, removeFromCompare, clearCompare, canAddMore } = useCompare();
  const { flyToDestination } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const allDestinations = useMemo(() => getDestinations(), []);

  const availableDestinations = useMemo(() => {
    return allDestinations.filter((d) => !compareList.some((c) => c.id === d.id));
  }, [allDestinations, compareList]);

  const filteredPickerDestinations = useMemo(() => {
    if (!searchQuery.trim()) return availableDestinations.slice(0, 6);
    const q = searchQuery.toLowerCase();
    return availableDestinations
      .filter((d) => d.name.toLowerCase().includes(q) || d.country?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [availableDestinations, searchQuery]);

  if (!isOpen) return null;

  const fields = [
    { key: 'country', label: 'Country', format: (v) => v || '—' },
    { key: 'budgetTier', label: 'Budget', format: (v) => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { key: 'crowdLevel', label: 'Crowd Level', format: (v) => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { key: 'bestTimeToVisit', label: 'Best Season', format: (v) => v || 'Year-round' },
    { key: 'activities', label: 'Top Sights', format: (v) => `${v?.length || 0} curated` },
  ];

  const handleFly = (dest) => {
    onClose();
    setTimeout(() => flyToDestination(dest), 300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1040] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl bg-[#07090E]/95 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-sky/10 border border-accent-sky/20 flex items-center justify-center text-accent-sky">
              <ScaleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">
                Compare Destinations
              </h3>
              <p className="text-xs text-text-secondary font-mono">
                Compare climate, costs, crowd levels, and experiences side by side
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {compareList.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="text-xs font-mono text-accent-rose hover:text-accent-rose/80 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors border border-white/5"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {compareList.length === 0 ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-text-secondary">
                <ScaleIcon className="w-7 h-7 text-accent-sky" />
              </div>
              <div>
                <h4 className="font-display font-bold text-white text-base">Select Destinations to Compare</h4>
                <p className="text-xs text-text-secondary font-body mt-1">
                  Pick 2 or 3 destinations from below to compare their highlights:
                </p>
              </div>

              {/* Quick Pick Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto pt-2">
                {allDestinations.slice(0, 6).map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => addToCompare(dest)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-accent-sky/15 border border-white/10 hover:border-accent-sky/30 text-white text-xs font-body transition-all flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-3.5 h-3.5 text-accent-sky" />
                    <span>{dest.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Compare Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs font-mono text-text-secondary uppercase py-3 pr-4 w-28 sm:w-36">
                        Attribute
                      </th>
                      {compareList.map((dest) => (
                        <th key={dest.id} className="text-left py-3 px-3 min-w-[180px]">
                          <div className="flex items-center justify-between pb-2">
                            <span className="font-display font-bold text-white text-base">{dest.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFromCompare(dest.id)}
                              className="text-text-secondary/60 hover:text-accent-rose p-1 transition-colors"
                              title="Remove"
                            >
                              <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFly(dest)}
                            className="w-full py-1.5 px-3 rounded-lg bg-accent-sky/20 hover:bg-accent-sky/30 border border-accent-sky/30 text-accent-sky text-xs font-medium font-body flex items-center justify-center gap-1 transition-all"
                          >
                            <span>Explore & Plan</span>
                            <ArrowRightIcon className="w-3 h-3" />
                          </button>
                        </th>
                      ))}
                      {canAddMore && (
                        <th className="text-left py-3 px-3 min-w-[140px] align-top">
                          <button
                            type="button"
                            onClick={() => setShowPicker(!showPicker)}
                            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-accent-sky/40 text-text-secondary hover:text-accent-sky text-xs font-mono transition-all flex items-center justify-center gap-1.5 bg-white/[0.02]"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Add City</span>
                          </button>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {fields.map((field) => (
                      <tr key={field.key}>
                        <td className="text-xs font-mono text-text-secondary py-3 pr-4 font-medium">
                          {field.label}
                        </td>
                        {compareList.map((dest) => (
                          <td key={dest.id} className="text-white font-body py-3 px-3">
                            {field.format(dest[field.key])}
                          </td>
                        ))}
                        {canAddMore && <td className="py-3 px-3"></td>}
                      </tr>
                    ))}
                    {/* Types */}
                    <tr>
                      <td className="text-xs font-mono text-text-secondary py-3 pr-4">Categories</td>
                      {compareList.map((dest) => (
                        <td key={dest.id} className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {dest.type?.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] bg-accent-sky/10 border border-accent-sky/20 text-accent-sky px-2.5 py-0.5 rounded-full font-mono uppercase"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                      {canAddMore && <td className="py-3 px-3"></td>}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Destination Selector Dropdown / Grid */}
          {(showPicker || (canAddMore && compareList.length > 0)) && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
                  Add to comparison ({3 - compareList.length} slots left)
                </span>
                <input
                  type="text"
                  placeholder="Filter destinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 bg-surface border border-white/10 focus:border-accent-sky rounded-lg text-xs text-white outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {filteredPickerDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => {
                      addToCompare(dest);
                      setSearchQuery('');
                      setShowPicker(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-accent-sky/15 border border-white/10 hover:border-accent-sky/30 text-white text-xs font-body transition-all flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-3 h-3 text-accent-sky" />
                    <span>{dest.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
