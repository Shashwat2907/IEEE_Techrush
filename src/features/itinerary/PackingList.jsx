import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { BackpackIcon, CloseIcon, PlusIcon, TrashIcon, CheckIcon } from '../../components/ui/Icons';

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'essentials', label: 'Essentials' },
  { id: 'clothing', label: 'Apparel' },
  { id: 'electronics', label: 'Tech' },
  { id: 'toiletries', label: 'Hygiene' },
];

const BASE_ESSENTIALS = [
  { id: 'passport', name: 'Passport & Visa Documentation', category: 'essentials', essential: true },
  { id: 'cards', name: 'Credit / Travel Forex Cards & Cash', category: 'essentials', essential: true },
  { id: 'phone-charger', name: 'Phone, Power Bank & Cables', category: 'electronics', essential: true },
  { id: 'adapter', name: 'Universal Travel Power Adapter', category: 'electronics', essential: true },
  { id: 'toothbrush', name: 'Toothbrush & Travel Paste', category: 'toiletries', essential: true },
  { id: 'sunscreen', name: 'SPF 50 Sunscreen', category: 'toiletries', essential: false },
  { id: 'meds', name: 'Personal Medication & First Aid', category: 'essentials', essential: true },
];

export default function PackingList({ destination, weatherData, tripDays = 3, isOpen, onClose }) {
  const { isDark } = useTheme();
  const storageKey = useMemo(
    () => `tripnest_packing_${destination?.id || 'default'}`,
    [destination?.id]
  );

  const [activeCategory, setActiveCategory] = useState('all');

  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch {}

    const initial = [...BASE_ESSENTIALS.map((it) => ({ ...it, packed: false, qty: 1 }))];

    initial.push(
      { id: 'tops', name: 'Daily Shirts / Tops', category: 'clothing', essential: true, packed: false, qty: Math.max(3, tripDays + 1) },
      { id: 'bottoms', name: 'Pants / Shorts / Skirts', category: 'clothing', essential: true, packed: false, qty: Math.max(2, Math.ceil(tripDays / 2)) },
      { id: 'undergarments', name: 'Undergarments & Socks', category: 'clothing', essential: true, packed: false, qty: tripDays + 2 },
      { id: 'shoes', name: 'Walking Shoes / Sneakers', category: 'clothing', essential: true, packed: false, qty: 1 }
    );

    const temp = weatherData?.temperature || 20;
    if (temp < 12) {
      initial.push(
        { id: 'jacket', name: 'Heavy Insulated Jacket / Fleece', category: 'clothing', essential: true, packed: false, qty: 1 },
        { id: 'gloves', name: 'Warm Beanie & Gloves', category: 'clothing', essential: false, packed: false, qty: 1 }
      );
    } else if (temp > 26) {
      initial.push(
        { id: 'swimwear', name: 'Swimwear & Beach Towel', category: 'clothing', essential: false, packed: false, qty: 1 },
        { id: 'sunglasses', name: 'UV Sunglasses & Sun Hat', category: 'essentials', essential: false, packed: false, qty: 1 }
      );
    }

    if (weatherData?.condition?.toLowerCase().includes('rain')) {
      initial.push({ id: 'umbrella', name: 'Compact Windproof Umbrella / Raincoat', category: 'essentials', essential: true, packed: false, qty: 1 });
    }

    return initial;
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('essentials');
  const [newItemQty, setNewItemQty] = useState(1);
  const [copiedNotification, setCopiedNotification] = useState(false);

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
      qty: Math.max(1, parseInt(newItemQty, 10) || 1),
      packed: false,
    };

    setItems((prev) => [...prev, newItem]);
    setNewItemName('');
    setNewItemQty(1);
  };

  const handleCopySummary = () => {
    const lines = items.map(
      (it) => `[${it.packed ? '✓' : ' '}] (${it.qty}x) ${it.name} [${it.category.toUpperCase()}]`
    );
    navigator.clipboard.writeText(`TripNest Packing Manifest // ${destination?.name || 'Trip'}\n` + lines.join('\n'));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const stats = useMemo(() => {
    const total = items.length;
    const packed = items.filter((i) => i.packed).length;
    const pct = total === 0 ? 0 : Math.round((packed / total) * 100);
    return { total, packed, pct };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'} font-sans select-none overflow-hidden`}>
      {/* ─── Top Navigation Header ─── */}
      <div
        className={`p-3.5 sm:p-4 border-b ${
          isDark ? 'border-white/10 bg-[#121826]/70' : 'border-black/10 bg-white/70'
        } backdrop-blur-2xl flex items-center justify-between shrink-0 z-10`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <BackpackIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white block truncate">
              Packing Manifest
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate block">
              {destination?.name || 'Active Trip'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySummary}
            className={`text-xs py-1.5 px-3 rounded-full font-bold transition-all cursor-pointer border ${
              isDark
                ? 'bg-white/10 hover:bg-white/15 text-zinc-200 border-white/15'
                : 'bg-black/5 hover:bg-black/10 text-slate-800 border-black/10'
            }`}
          >
            {copiedNotification ? '✓ Copied' : 'Export'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Packing Telemetry & Category Filter Bar ─── */}
      <div
        className={`p-4 border-b ${
          isDark ? 'border-white/10 bg-[#0E0E14]/80' : 'border-black/10 bg-[#F4F5F7]/80'
        } space-y-3 shrink-0`}
      >
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-zinc-400">Packing Readiness</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {stats.packed} of {stats.total} packed ({stats.pct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Categories Bubble Slider */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-3.5 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer shrink-0 z-10 ${
                  isSelected
                    ? 'text-white dark:text-black font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="packingCategoryBubble"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-slate-900 dark:bg-white rounded-full -z-10 shadow-sm"
                  />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Checklist Items Workspace ─── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 no-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center rounded-3xl border border-dashed border-black/10 dark:border-white/10 p-6">
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              No items in this category.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                item.packed
                  ? isDark
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-300'
                    : 'bg-emerald-50/80 border-emerald-300 text-slate-700'
                  : isDark
                  ? 'bg-[#121826]/75 border-white/10 hover:border-white/20'
                  : 'bg-white/80 border-black/10 hover:border-black/20 shadow-sm'
              } backdrop-blur-xl`}
            >
              {/* Checkbox & Name */}
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => togglePacked(item.id)}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                    item.packed
                      ? 'bg-emerald-500 text-white'
                      : 'border-2 border-slate-400 dark:border-zinc-500 hover:border-emerald-500'
                  }`}
                >
                  {item.packed && <CheckIcon className="w-3 h-3" />}
                </div>

                <div className="min-w-0">
                  <span
                    className={`text-xs font-bold block truncate ${
                      item.packed ? 'line-through opacity-70' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Quantity Controls & Delete */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-full px-2 py-0.5 border border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => changeQty(item.id, -1)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white px-1"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold px-1.5 text-slate-800 dark:text-zinc-200">
                    {item.qty || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQty(item.id, 1)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white px-1"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Remove"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Add Item Input Bar ─── */}
      <form
        onSubmit={handleAddItem}
        className={`p-3.5 border-t ${
          isDark ? 'border-white/10 bg-[#121826]/90' : 'border-black/10 bg-white/90'
        } backdrop-blur-2xl flex items-center gap-2 shrink-0`}
      >
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="+ Add custom gear or clothing..."
          className={`flex-1 ${
            isDark ? 'bg-white/10 text-white border-white/15' : 'bg-black/5 text-slate-900 border-black/15'
          } border rounded-full px-4 py-2 text-xs outline-none font-medium placeholder:text-slate-400`}
        />

        <select
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value)}
          className={`text-xs ${
            isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
          } border rounded-full px-3 py-2 outline-none font-medium`}
        >
          <option value="essentials">Essentials</option>
          <option value="clothing">Apparel</option>
          <option value="electronics">Tech</option>
          <option value="toiletries">Hygiene</option>
        </select>

        <button
          type="submit"
          disabled={!newItemName.trim()}
          className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
