import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { BackpackIcon, CloseIcon, PlusIcon, TrashIcon, CheckIcon } from '../../components/ui/Icons';
import { generatePackingList } from '../../services/packing';
import { getWeather } from '../../services/weather';
import { getCrowdLevel } from '../../services/crowd';

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'essentials', label: 'Essentials' },
  { id: 'clothing', label: 'Apparel' },
  { id: 'electronics', label: 'Tech' },
  { id: 'toiletries', label: 'Hygiene' },
];

const CATEGORY_MAP = {
  documents: 'essentials', personal: 'toiletries', health: 'toiletries', protection: 'toiletries',
  accessories: 'clothing', footwear: 'clothing', bags: 'essentials', gear: 'essentials',
  activities: 'essentials', food: 'essentials', electronics: 'electronics', clothing: 'clothing', essentials: 'essentials',
};

function makeId(name) {
  return `suggested-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

function buildAdaptiveItems(destination, weatherData, crowdData, tripDays) {
  return generatePackingList({
    types: destination?.type || [],
    weather: weatherData?.condition || weatherData?.description || 'mild',
    temperature: weatherData?.temp,
    crowdLevel: crowdData?.level || destination?.crowdLevel || 'medium',
    tripDays,
  }).map((item) => ({
    ...item,
    id: makeId(item.name),
    category: CATEGORY_MAP[item.category] || 'essentials',
    qty: /clothes|shirt|shorts|socks|underwear/i.test(item.name) ? Math.max(1, Math.ceil(tripDays / 2)) : 1,
    source: 'recommended',
  }));
}

export default function PackingList({ destination, weatherData, tripDays = 3, isOpen, onClose }) {
  const { isDark } = useTheme();
  const storageKey = useMemo(
    () => `tripnest_packing_${destination?.id || 'default'}`,
    [destination?.id]
  );

  const [activeCategory, setActiveCategory] = useState('all');
  const [liveWeather, setLiveWeather] = useState(weatherData || null);
  const [liveCrowd, setLiveCrowd] = useState(null);

  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored);
    } catch {}

    return [];
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

  useEffect(() => {
    setLiveWeather(weatherData || null);
  }, [weatherData]);

  useEffect(() => {
    let cancelled = false;
    if (!destination || !Number.isFinite(Number(destination.lat)) || !Number.isFinite(Number(destination.lng))) return undefined;
    Promise.all([getWeather(destination.lat, destination.lng), getCrowdLevel(destination.id, destination)])
      .then(([weather, crowd]) => {
        if (!cancelled) {
          if (!weatherData) setLiveWeather(weather);
          setLiveCrowd(crowd);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [destination, weatherData]);

  // Refresh recommendations whenever trip conditions change, while retaining
  // packed checkboxes and every user-created item.
  useEffect(() => {
    const suggested = buildAdaptiveItems(destination, liveWeather, liveCrowd, tripDays);
    setItems((previous) => {
      const existing = new Map(previous.map((item) => [item.id, item]));
      const recommended = suggested.map((item) => {
        const prior = existing.get(item.id);
        return prior ? { ...item, packed: prior.packed, qty: prior.qty || item.qty } : { ...item, packed: false };
      });
      const custom = previous.filter((item) => item.source === 'custom' || String(item.id).startsWith('custom-'));
      return [...recommended, ...custom];
    });
  }, [destination, liveWeather, liveCrowd, tripDays]);

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
      source: 'custom',
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
      <div className="p-3.5 sm:p-4 border-b apple-liquid-glass flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <BackpackIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white block truncate">
              Packing Manifest
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate block">
              {destination?.name || 'Active Trip'} · {liveWeather?.temp ?? '—'}° · {liveCrowd?.label || 'Crowd-aware'}
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
      <div className="p-4 border-b apple-liquid-glass space-y-3 shrink-0">
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
              className={`p-3 rounded-2xl transition-all flex items-center justify-between gap-3 ${
                item.packed
                  ? isDark
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-zinc-300'
                    : 'bg-emerald-50/80 border border-emerald-300 text-slate-700'
                  : 'apple-liquid-glass'
              }`}
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
        className="p-3.5 border-t apple-liquid-glass flex items-center gap-2 shrink-0"
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
