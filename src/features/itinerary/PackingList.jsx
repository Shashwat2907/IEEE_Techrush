import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePackingList } from '../../services/packing';
import {
  BackpackIcon,
  CloseIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
} from '../../components/ui/Icons';

const CATEGORIES = [
  'clothing',
  'electronics',
  'documents',
  'protection',
  'footwear',
  'gear',
  'personal',
  'essentials',
  'activities',
];

export default function PackingList({ destination, weatherData, tripDays, isOpen, onClose }) {
  const storageKey = useMemo(() => {
    return `tripnest_packing_${destination?.id || 'general'}`;
  }, [destination?.id]);

  // Load items from localStorage or generate defaults
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    const weather = weatherData?.description || 'mild';
    return generatePackingList({
      types: destination?.type || [],
      weather,
      tripDays: tripDays || 3,
    }).map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      ...item,
      packed: false,
    }));
  });

  // Re-generate or sync when destination changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setItems(JSON.parse(saved));
        return;
      }
    } catch {}

    const weather = weatherData?.description || 'mild';
    const generated = generatePackingList({
      types: destination?.type || [],
      weather,
      tripDays: tripDays || 3,
    }).map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      ...item,
      packed: false,
    }));
    setItems(generated);
  }, [storageKey, destination?.type, weatherData?.description, tripDays]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {}
  }, [items, storageKey]);

  // Add Item State
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('essentials');
  const [newItemEssential, setNewItemEssential] = useState(false);

  // Edit Item State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('essentials');

  // Filter State
  const [filterCategory, setFilterCategory] = useState('all');

  // Toggle Packed
  const toggleItem = useCallback((id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item))
    );
  }, []);

  // Create Item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      essential: newItemEssential,
      packed: false,
    };

    setItems((prev) => [newItem, ...prev]);
    setNewItemName('');
    setNewItemEssential(false);
    setIsAdding(false);
  };

  // Start Edit
  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
  };

  // Save Edit
  const handleSaveEdit = (id) => {
    if (!editName.trim()) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, name: editName.trim(), category: editCategory } : item
      )
    );
    setEditingItemId(null);
  };

  // Delete Item
  const handleDeleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Reset to default recommendations
  const handleResetDefaults = () => {
    const weather = weatherData?.description || 'mild';
    const generated = generatePackingList({
      types: destination?.type || [],
      weather,
      tripDays: tripDays || 3,
    }).map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      ...item,
      packed: false,
    }));
    setItems(generated);
  };

  // Progress metrics
  const packedCount = items.filter((i) => i.packed).length;
  const progress = items.length > 0 ? Math.round((packedCount / items.length) * 100) : 0;

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filterCategory === 'all') return items;
    return items.filter((item) => item.category === filterCategory);
  }, [items, filterCategory]);

  // Group by category
  const grouped = useMemo(() => {
    const groups = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 right-0 h-full w-full sm:w-[460px] sm:max-w-[94vw] z-[1030] bg-[#07090E]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
    >
      {/* ─── Header ─── */}
      <div className="p-5 border-b border-white/10 bg-[#0A0E17]/80 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-sky/10 border border-accent-sky/20 flex items-center justify-center text-accent-sky">
              <BackpackIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white tracking-wide">
                Packing Checklist
              </h3>
              {destination && (
                <p className="text-text-secondary text-[11px] font-mono">
                  {destination.name} · {tripDays} {tripDays === 1 ? 'day' : 'days'}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors border border-white/5"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-1 text-xs font-mono">
            <span className="text-text-secondary">
              {packedCount} of {items.length} items packed
            </span>
            <span className="text-accent-sky font-bold">{progress}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-accent-sky to-accent-emerald rounded-full"
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 rounded-lg bg-accent-sky/15 hover:bg-accent-sky/25 border border-accent-sky/30 text-accent-sky text-xs font-medium font-body flex items-center gap-1.5 transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Custom Item</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] font-mono text-text-secondary hover:text-white transition-colors"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {/* ─── Add Custom Item Drawer / Form ─── */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAddItem}
            className="bg-surface/90 border-b border-white/10 p-4 space-y-3 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Item name (e.g. GoPro, Power Adapter)..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-2 bg-bg-base/80 border border-white/10 focus:border-accent-sky rounded-xl text-xs text-white outline-none"
              />
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="px-2.5 py-2 bg-bg-base/80 border border-white/10 focus:border-accent-sky rounded-xl text-xs text-white capitalize outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0A0E17] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newItemEssential}
                  onChange={(e) => setNewItemEssential(e.target.checked)}
                  className="rounded accent-accent-sky"
                />
                <span>Mark as Essential</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newItemName.trim()}
                  className="px-3 py-1 bg-accent-sky hover:bg-accent-sky-dark disabled:opacity-50 text-bg-base text-xs font-bold rounded-lg transition-colors"
                >
                  Save Item
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ─── Category Filter Pills ─── */}
      <div className="p-3 border-b border-white/5 flex gap-1.5 overflow-x-auto custom-scrollbar bg-white/[0.01]">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all ${
            filterCategory === 'all'
              ? 'bg-accent-sky text-bg-base font-bold'
              : 'bg-white/5 text-text-secondary hover:text-white'
          }`}
        >
          All ({items.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap capitalize transition-all ${
                filterCategory === cat
                  ? 'bg-accent-sky text-bg-base font-bold'
                  : 'bg-white/5 text-text-secondary hover:text-white'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* ─── Items List (Grouped) ─── */}
      <div className="flex-1 p-4 space-y-5 overflow-y-auto custom-scrollbar">
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-12 text-text-secondary space-y-2">
            <p className="text-sm">No items in this category.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category} className="space-y-1.5">
              <h4 className="text-[11px] font-mono text-text-secondary/70 uppercase tracking-wider px-1 capitalize">
                {category}
              </h4>
              <div className="space-y-1.5">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      item.packed
                        ? 'bg-accent-emerald/10 border-accent-emerald/20 opacity-70'
                        : 'bg-white/5 hover:bg-white/[0.08] border-white/5'
                    }`}
                  >
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-bg-base border border-white/20 rounded-lg text-xs text-white outline-none"
                          autoFocus
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="px-2 py-1 bg-bg-base border border-white/20 rounded-lg text-xs text-white capitalize outline-none"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2 py-1 bg-accent-sky text-bg-base text-xs font-bold rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-1.5 py-1 text-text-secondary hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Checkbox and Item Name */}
                        <div
                          onClick={() => toggleItem(item.id)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                              item.packed
                                ? 'bg-accent-emerald border-accent-emerald'
                                : 'border-white/20 group-hover:border-white/40'
                            }`}
                          >
                            {item.packed && <CheckIcon className="w-3 h-3 text-bg-base" />}
                          </div>
                          <span
                            className={`text-xs font-body truncate ${
                              item.packed ? 'text-text-secondary line-through' : 'text-white'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.essential && !item.packed && (
                            <span className="text-[9px] font-mono text-accent-amber bg-accent-amber/10 border border-accent-amber/20 px-1.5 py-0.2 rounded-full shrink-0">
                              Essential
                            </span>
                          )}
                        </div>

                        {/* Action Buttons (Edit, Delete) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="p-1 text-text-secondary hover:text-accent-sky transition-colors rounded-md hover:bg-white/5"
                            title="Edit"
                          >
                            <EditIcon className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-text-secondary hover:text-accent-rose transition-colors rounded-md hover:bg-white/5"
                            title="Delete"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
