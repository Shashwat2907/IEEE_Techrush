import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useItinerary } from '../../context/ItineraryContext';
import {
  CheckIcon,
  PlusIcon,
  CloseIcon,
  BackpackIcon,
  SunIcon,
  RainIcon,
  SnowflakeIcon,
  WarningIcon,
  CopyIcon,
  TrashIcon,
} from '../../components/ui/Icons';

const DEFAULT_CATEGORIES = [
  { id: 'essentials', label: 'Documents & Essentials', icon: '🪪' },
  { id: 'clothing', label: 'Clothing & Apparel', icon: '👕' },
  { id: 'toiletries', label: 'Toiletries & Care', icon: '🧴' },
  { id: 'electronics', label: 'Tech & Gadgets', icon: '🔌' },
  { id: 'activity', label: 'Activity & Gear', icon: '🎒' },
];

function generateSmartPackingList(destination, weatherData, tripDays = 3, activities = []) {
  const days = Math.max(1, tripDays);
  const items = [];

  // Core Essentials
  items.push(
    { id: 'p-pass', name: 'Passport / National ID', category: 'essentials', qty: 1, packed: false, essential: true },
    { id: 'p-cards', name: 'Credit / Travel Forex Cards', category: 'essentials', qty: 2, packed: false, essential: true },
    { id: 'p-ins', name: 'Travel Medical Insurance PDF', category: 'essentials', qty: 1, packed: false, essential: true }
  );

  // Clothing based on Trip Days
  items.push(
    { id: 'p-tops', name: 'Tops & Shirts', category: 'clothing', qty: Math.min(days + 1, 8), packed: false },
    { id: 'p-bottoms', name: 'Pants / Shorts / Skirts', category: 'clothing', qty: Math.max(2, Math.ceil(days / 2)), packed: false },
    { id: 'p-under', name: 'Undergarments & Socks Sets', category: 'clothing', qty: days + 1, packed: false, essential: true },
    { id: 'p-sleep', name: 'Sleepwear & Loungewear', category: 'clothing', qty: 2, packed: false },
    { id: 'p-shoes', name: 'Comfortable Walking Shoes', category: 'clothing', qty: 1, packed: false, essential: true }
  );

  // Electronics
  items.push(
    { id: 'p-phone', name: 'Phone Charger & High-speed Cable', category: 'electronics', qty: 2, packed: false, essential: true },
    { id: 'p-powerbank', name: 'Power Bank (10,000mAh+)', category: 'electronics', qty: 1, packed: false, essential: true },
    { id: 'p-adapter', name: 'Universal Travel Power Adapter', category: 'electronics', qty: 1, packed: false }
  );

  // Weather-Adaptive Items
  const temp = weatherData?.temp ?? 22;
  const isRain = weatherData?.description?.toLowerCase().includes('rain');

  if (temp > 26) {
    items.push(
      { id: 'w-sunscreen', name: 'SPF 50+ Sunscreen & UV Lip Balm', category: 'toiletries', qty: 1, packed: false, essential: true },
      { id: 'w-sunglasses', name: 'Polarized Sunglasses', category: 'clothing', qty: 1, packed: false },
      { id: 'w-hat', name: 'Breathable Sun Hat', category: 'clothing', qty: 1, packed: false }
    );
  } else if (temp < 12) {
    items.push(
      { id: 'w-jacket', name: 'Thermal Jacket / Heavy Coat', category: 'clothing', qty: 1, packed: false, essential: true },
      { id: 'w-gloves', name: 'Warm Gloves & Beanie', category: 'clothing', qty: 1, packed: false },
      { id: 'w-thermals', name: 'Base Layer Thermals', category: 'clothing', qty: 2, packed: false }
    );
  }

  if (isRain) {
    items.push(
      { id: 'w-umbrella', name: 'Compact Windproof Umbrella', category: 'essentials', qty: 1, packed: false, essential: true },
      { id: 'w-raincoat', name: 'Waterproof Packable Shell', category: 'clothing', qty: 1, packed: false }
    );
  }

  // Activity-Aware Ingestion
  const actNames = activities.map((a) => a.name.toLowerCase()).join(' ');
  if (actNames.includes('beach') || actNames.includes('swim') || actNames.includes('surf') || actNames.includes('snorkel')) {
    items.push(
      { id: 'a-swimwear', name: 'Quick-dry Swimsuit', category: 'activity', qty: 2, packed: false },
      { id: 'a-towel', name: 'Microfiber Beach Towel', category: 'activity', qty: 1, packed: false },
      { id: 'a-drybag', name: 'Waterproof Dry Bag', category: 'activity', qty: 1, packed: false }
    );
  }
  if (actNames.includes('hike') || actNames.includes('trek') || actNames.includes('trail') || actNames.includes('mountain')) {
    items.push(
      { id: 'a-boots', name: 'Trekking / Trail Shoes', category: 'activity', qty: 1, packed: false, essential: true },
      { id: 'a-hydration', name: 'Reusable Hydration Bottle', category: 'activity', qty: 1, packed: false },
      { id: 'a-firstaid', name: 'Mini Blister & First Aid Kit', category: 'toiletries', qty: 1, packed: false }
    );
  }
  if (actNames.includes('temple') || actNames.includes('mosque') || actNames.includes('church') || actNames.includes('cathedral')) {
    items.push(
      { id: 'a-scarf', name: 'Modest Shoulder/Leg Cover Wrap', category: 'clothing', qty: 1, packed: false }
    );
  }

  return items;
}

export default function PackingList({ destination, weatherData, tripDays, isOpen, onClose }) {
  const { days } = useItinerary();

  const allActivities = useMemo(() => {
    return (days || []).flatMap((d) => d.activities || []);
  }, [days]);

  const storageKey = useMemo(() => {
    return `tripnest_packing_${destination?.id || 'general'}`;
  }, [destination]);

  // Load from local storage or initialize smart defaults
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return generateSmartPackingList(destination, weatherData, tripDays, allActivities);
  });

  const [activeCategory, setActiveCategory] = useState('all');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('essentials');
  const [newItemQty, setNewItemQty] = useState(1);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {}
  }, [items, storageKey]);

  const togglePacked = useCallback((itemId) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, packed: !it.packed } : it))
    );
  }, []);

  const changeQty = useCallback((itemId, delta) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const next = Math.max(1, (it.qty || 1) + delta);
          return { ...it, qty: next };
        }
        return it;
      })
    );
  }, []);

  const removeItem = useCallback((itemId) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }, []);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      qty: Math.max(1, newItemQty),
      packed: false,
      essential: false,
    };

    setItems((prev) => [newItem, ...prev]);
    setNewItemName('');
    setNewItemQty(1);
  };

  const handleResetSmartList = () => {
    const fresh = generateSmartPackingList(destination, weatherData, tripDays, allActivities);
    setItems(fresh);
  };

  const handleCopyChecklist = () => {
    const text = items
      .map((it) => `[${it.packed ? 'x' : ' '}] ${it.name} (x${it.qty || 1})`)
      .join('\n');

    navigator.clipboard?.writeText(
      `TripNest Packing Checklist for ${destination?.name || 'My Trip'}:\n\n${text}`
    );
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Progress metrics
  const totalItems = items.length;
  const packedItems = items.filter((it) => it.packed).length;
  const progressPct = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((it) => it.category === activeCategory);
  }, [items, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="h-full w-full flex flex-col bg-[#0B101B]/95 backdrop-blur-2xl text-text-primary overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-sky/15 flex items-center justify-center text-accent-sky">
              <BackpackIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-wide">
                Smart Packing List
              </h3>
              <p className="text-[11px] font-body text-text-secondary">
                {destination?.name ? `Tailored for ${destination.name}` : 'Trip checklist & gear'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Copy / Export */}
            <button
              type="button"
              onClick={handleCopyChecklist}
              className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-text-secondary hover:text-white border border-white/[0.05] transition-all"
              title="Copy checklist as text"
            >
              <CopyIcon className="w-3.5 h-3.5" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Copy toast feedback */}
        <AnimatePresence>
          {copiedNotification && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-center text-[11px] font-mono text-accent-emerald bg-accent-emerald/10 py-1 rounded-lg border border-accent-emerald/20"
            >
              Checklist copied to clipboard!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar Banner */}
        <div className="mt-3.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-mono text-text-secondary font-medium">Packing Readiness</span>
            <span className="font-mono font-bold text-accent-sky">
              {packedItems} / {totalItems} ({progressPct}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-accent-sky to-accent-emerald rounded-full"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
              activeCategory === 'all'
                ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30 font-semibold'
                : 'text-text-secondary hover:text-white bg-white/[0.02]'
            }`}
          >
            All ({totalItems})
          </button>
          {DEFAULT_CATEGORIES.map((cat) => {
            const count = items.filter((it) => it.category === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1 ${
                  activeCategory === cat.id
                    ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30 font-semibold'
                    : 'text-text-secondary hover:text-white bg-white/[0.02]'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label.split(' ')[0]}</span>
                <span className="opacity-60 text-[9px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Checklist */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
        {/* Add custom item form */}
        <form
          onSubmit={handleAddItem}
          className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]"
        >
          <input
            type="text"
            required
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="+ Add custom item..."
            className="flex-1 bg-transparent px-2 text-xs text-white placeholder:text-text-secondary/40 outline-none"
          />

          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="bg-[#0B101B] border border-white/[0.08] text-[10px] font-mono text-text-secondary rounded-lg px-2 py-1 outline-none"
          >
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label.split(' ')[0]}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent-sky text-slate-950 hover:bg-sky-400 text-xs font-bold transition-colors flex-shrink-0"
            title="Add to packing list"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* List items */}
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => togglePacked(item.id)}
            className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
              item.packed
                ? 'bg-white/[0.01] border-white/[0.02] opacity-50'
                : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {/* Checkbox */}
              <div
                className={`w-4 h-4 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                  item.packed
                    ? 'bg-accent-emerald text-slate-950 font-bold'
                    : 'border border-white/20 hover:border-accent-sky'
                }`}
              >
                {item.packed && <CheckIcon className="w-3 h-3" />}
              </div>

              {/* Title & tags */}
              <div className="min-w-0">
                <div
                  className={`text-xs font-medium truncate ${
                    item.packed ? 'line-through text-text-secondary' : 'text-white'
                  }`}
                >
                  {item.name}
                </div>
                {item.essential && !item.packed && (
                  <span className="text-[9px] font-mono text-accent-amber uppercase">
                    ★ Essential
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Controller & Delete */}
            <div
              className="flex items-center gap-1 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center bg-white/[0.03] border border-white/[0.05] rounded-lg">
                <button
                  type="button"
                  onClick={() => changeQty(item.id, -1)}
                  className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-white text-[10px] font-mono"
                >
                  -
                </button>
                <span className="px-1.5 text-[10px] font-mono text-white font-semibold">
                  {item.qty || 1}
                </span>
                <button
                  type="button"
                  onClick={() => changeQty(item.id, 1)}
                  className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-white text-[10px] font-mono"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all ml-1"
                title="Remove item"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Reset button */}
        <div className="pt-3">
          <button
            type="button"
            onClick={handleResetSmartList}
            className="w-full py-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-text-secondary hover:text-white border border-white/[0.04] text-xs font-mono transition-all"
          >
            ↺ Reset to AI Weather & Trip Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
