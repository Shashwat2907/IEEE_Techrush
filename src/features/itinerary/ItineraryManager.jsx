import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useItinerary } from '../../context/ItineraryContext';
import { useTheme } from '../../context/ThemeContext';
import { CloseIcon } from '../../components/ui/Icons';

export default function ItineraryManager({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const {
    getSavedItineraries,
    saveAsNewItinerary,
    loadItinerary,
    deleteItinerary,
    exportItinerary,
    importItinerary,
  } = useItinerary();

  const [savedLists, setSavedLists] = useState(getSavedItineraries());
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const refreshList = () => {
    setSavedLists(getSavedItineraries());
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveAsNewItinerary(saveName.trim());
    setSaveName('');
    setIsSaving(false);
    refreshList();
  };

  const handleLoad = (id) => {
    loadItinerary(id);
    onClose();
  };

  const handleDelete = (id) => {
    deleteItinerary(id);
    refreshList();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      await importItinerary(file);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
    e.target.value = null; // Reset input
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`w-full max-w-md apple-liquid-glass rounded-3xl p-5 relative overflow-hidden ${
          isDark ? 'text-white border-white/10' : 'text-slate-900 border-black/10'
        }`}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 dark:border-white/10 light:border-black/10">
          <h2 className="text-sm font-bold uppercase tracking-wider">Itinerary Manager</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-500 text-xs font-bold border border-red-500/30">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={exportItinerary}
            className="flex-1 py-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full transition-colors border border-emerald-500/20 flex justify-center items-center gap-2"
          >
            ↓ Export JSON
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 px-4 bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full transition-colors border border-blue-500/20 flex justify-center items-center gap-2"
          >
            ↑ Import JSON
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Saved Itineraries</h3>
            <button
              onClick={() => setIsSaving(!isSaving)}
              className="text-xs font-bold text-slate-900 dark:text-white hover:opacity-70 transition-opacity"
            >
              + Save Current
            </button>
          </div>

          <AnimatePresence>
            {isSaving && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className={`p-3 rounded-2xl flex items-center gap-2 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                  <input
                    autoFocus
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="E.g. Summer in Paris..."
                    className="flex-1 bg-transparent text-sm font-semibold outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
            {savedLists.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500 dark:text-zinc-500 font-medium italic">
                No saved itineraries yet.
              </div>
            ) : (
              savedLists.map((item) => {
                const dateObj = new Date(item.date);
                const isToday = dateObj.toDateString() === new Date().toDateString();
                const dateStr = isToday ? 'Today' : dateObj.toLocaleDateString();
                const daysCount = item.state?.days?.length || 0;
                
                return (
                  <div key={item.id} className={`p-3 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-black/5 border-black/5 hover:bg-black/10'} transition-colors`}>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-sm truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {dateStr} • {daysCount} Days
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleLoad(item.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-[10px] font-bold rounded-full transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-7 h-7 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] rounded-full transition-colors font-bold"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
