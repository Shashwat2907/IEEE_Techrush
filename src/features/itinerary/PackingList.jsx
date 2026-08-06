import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { generatePackingList } from '../../services/packing';
import { BackpackIcon, CloseIcon, CheckIcon } from '../../components/ui/Icons';

export default function PackingList({ destination, weatherData, tripDays, isOpen, onClose }) {
  const [checkedItems, setCheckedItems] = useState(new Set());

  const items = useMemo(() => {
    if (!destination) return [];
    const weather = weatherData?.description || 'mild';
    return generatePackingList({
      types: destination.type || [],
      weather,
      tripDays: tripDays || 3,
    });
  }, [destination, weatherData, tripDays]);

  const toggleItem = useCallback((name) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const progress = items.length > 0 ? Math.round((checkedItems.size / items.length) * 100) : 0;

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    items.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="absolute top-0 right-0 h-full w-[420px] max-w-[92vw] z-[1003] bg-surface/95 backdrop-blur-2xl border-l border-white/10 overflow-y-auto shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-white/5 p-5 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BackpackIcon className="w-5 h-5 text-accent-sky" />
            <h3 className="font-display text-xl font-bold text-white tracking-wide">Packing List</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        {destination && (
          <p className="text-text-secondary text-xs font-mono">
            {destination.name} · {tripDays} {tripDays === 1 ? 'day' : 'days'}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-secondary font-mono">
              {checkedItems.size}/{items.length} packed
            </span>
            <span className="text-xs font-mono text-accent-sky font-semibold">{progress}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-sky rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items by category */}
      <div className="flex-1 p-5 space-y-5">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category}>
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-2.5 capitalize">
              {category}
            </h4>
            <div className="space-y-1.5">
              {categoryItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => toggleItem(item.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${
                    checkedItems.has(item.name)
                      ? 'bg-accent-emerald/10 opacity-70 border border-accent-emerald/20'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      checkedItems.has(item.name)
                        ? 'bg-accent-emerald border-accent-emerald'
                        : 'border-white/20'
                    }`}
                  >
                    {checkedItems.has(item.name) && <CheckIcon className="w-3 h-3 text-bg-base" />}
                  </div>
                  <span
                    className={`text-sm font-body ${
                      checkedItems.has(item.name) ? 'text-text-secondary line-through' : 'text-white'
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.essential && !checkedItems.has(item.name) && (
                    <span className="text-[9px] font-mono text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-2 py-0.5 rounded-full ml-auto">
                      Essential
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
