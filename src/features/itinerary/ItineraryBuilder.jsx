import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useItinerary } from '../../context/ItineraryContext';
import { ACTIVITY_TYPES } from '../../utils/itineraryUtils';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { generateActivities } from '../../services/itineraryAI';
import TripShareModal from '../../components/ui/TripShareModal';
import ItineraryManager from './ItineraryManager';
import {
  CalendarIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  CompassIcon,
  BedIcon,
  UtensilsIcon,
  CarIcon,
  MoonIcon,
} from '../../components/ui/Icons';

// Map activity type to Icon
function getActivityIcon(type) {
  switch (type) {
    case 'stay':
      return <BedIcon className="w-3.5 h-3.5" />;
    case 'food':
      return <UtensilsIcon className="w-3.5 h-3.5" />;
    case 'transport':
      return <CarIcon className="w-3.5 h-3.5" />;
    case 'rest':
      return <MoonIcon className="w-3.5 h-3.5" />;
    case 'activity':
    default:
      return <CompassIcon className="w-3.5 h-3.5" />;
  }
}

// Format 24hr decimal into 12hr AM/PM
function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const mStr = m > 0 ? `:${m.toString().padStart(2, '0')}` : ':00';
  return `${h12}${mStr} ${period}`;
}

function distanceBetween(a, b) {
  const rad = Math.PI / 180;
  const lat1 = Number(a.lat) * rad;
  const lat2 = Number(b.lat) * rad;
  const dLat = lat2 - lat1;
  const dLng = (Number(b.lng) - Number(a.lng)) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function optimizeByNearestStop(activities) {
  const located = activities.filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)));
  if (located.length < 2) return activities;
  const unlocated = activities.filter((item) => !located.includes(item));
  const result = [located[0]];
  const remaining = located.slice(1);
  while (remaining.length) {
    const previous = result[result.length - 1];
    let nearestIndex = 0;
    for (let index = 1; index < remaining.length; index += 1) {
      if (distanceBetween(previous, remaining[index]) < distanceBetween(previous, remaining[nearestIndex])) nearestIndex = index;
    }
    result.push(remaining.splice(nearestIndex, 1)[0]);
  }
  let startHour = 9;
  return [...result, ...unlocated].map((activity) => {
    const next = { ...activity, startHour };
    startHour += Number(activity.durationHrs) || 2;
    return next;
  });
}

// ─── Sortable Activity Item Component with Ultra-Smooth Spring Transitions ───
function SortableActivityCard({
  activity,
  dayId,
  onRemove,
  onUpdate,
  onMove,
  days,
  formatPrice,
  isDark,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: activity.uid });

  const [isExpanded, setIsExpanded] = useState(false);
  const [cost, setCost] = useState(activity.cost || 0);
  const [type, setType] = useState(activity.type || 'activity');
  const [notes, setNotes] = useState(activity.notes || '');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const handleSaveDetails = () => {
    onUpdate(dayId, activity.uid, {
      cost: parseFloat(cost) || 0,
      type,
      notes: notes.trim(),
    });
    setIsExpanded(false);
  };

  const typeConfig = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.activity;
  const startH = activity.startHour || 9;
  const durH = activity.durationHrs || 2;
  const endH = startH + durH;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
      ref={setNodeRef}
      style={style}
      className="rounded-2xl transition-shadow duration-200 apple-liquid-glass overflow-hidden"
    >
      {/* Primary Row */}
      <div className="p-3.5 flex items-center gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 p-1 select-none"
          title="Drag to reschedule"
        >
          ⋮⋮
        </div>

        {/* Category Icon Badge */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white/15"
          style={{ backgroundColor: `${typeConfig.color}25`, color: typeConfig.color }}
        >
          {getActivityIcon(activity.type)}
        </div>

        {/* Title and Timeline */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">
              {activity.name}
            </h4>
            <span
              className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0"
              style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
            <span className="flex items-center gap-1 font-medium">
              <ClockIcon className="w-3 h-3 opacity-70" />
              {formatHour(startH)} – {formatHour(endH)}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-700 dark:text-zinc-300">
              {durH}h
            </span>
          </div>
        </div>

        {/* Cost & Delete Action */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {formatPrice(activity.cost || 0)}
          </span>

          <button
            type="button"
            onClick={() => onRemove(dayId, activity.uid)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete activity"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Edit Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            className="p-4 border-t apple-liquid-glass space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={`w-full ${
                    isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
                  } border rounded-xl text-xs p-2 outline-none font-medium`}
                >
                  <option value="activity">Sight / Attraction</option>
                  <option value="food">Dining / Cuisine</option>
                  <option value="stay">Hotel / Stay</option>
                  <option value="transport">Transit</option>
                  <option value="rest">Leisure / Break</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Est. Cost ($)
                </label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className={`w-full ${
                    isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
                  } border rounded-xl text-xs p-2 outline-none font-semibold`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Day
                </label>
                <select
                  value={dayId}
                  onChange={(e) => {
                    onMove(e.target.value);
                  }}
                  className={`w-full ${
                    isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
                  } border rounded-xl text-xs p-2 outline-none font-medium`}
                >
                  {days?.map((d) => (
                    <option key={d.id} value={d.id}>Day {d.dayNumber}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Notes & Reservations
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Booking info..."
                  className={`w-full ${
                    isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
                  } border rounded-xl text-xs p-2 outline-none placeholder:text-slate-400 font-medium`}
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveDetails}
                className="py-1.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-bold rounded-full transition-all cursor-pointer shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Interactive Apple OS Liquid Calendar Modal (Fits Naturally Without Sliders/Scrollbars) ───
function TravelCalendarModal({ isOpen, onClose, startDate, endDate, onSaveDateRange, isDark }) {
  const [selectedStart, setSelectedStart] = useState(
    startDate || new Date().toISOString().split('T')[0]
  );
  const [selectedEnd, setSelectedEnd] = useState(() => {
    if (endDate) return endDate;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (startDate) {
      const [y, m] = startDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const monthYearStr = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate calendar days
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setViewMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonth(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dayNum) => {
    const pad = (n) => String(n).padStart(2, '0');
    const clickedStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    // Parse dates without UTC offset for comparison
    const parseLocal = (s) => { const [y,mo,d] = s.split('-').map(Number); return new Date(y, mo-1, d); };

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(clickedStr);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      if (parseLocal(clickedStr) < parseLocal(selectedStart)) {
        setSelectedStart(clickedStr);
      } else {
        setSelectedEnd(clickedStr);
      }
    }
  };

  const handleApply = () => {
    const pad = (n) => String(n).padStart(2, '0');
    if (selectedStart && selectedEnd) {
      onSaveDateRange(selectedStart, selectedEnd);
    } else if (selectedStart) {
      const [y, mo, d] = selectedStart.split('-').map(Number);
      const end = new Date(y, mo - 1, d + 2);
      onSaveDateRange(selectedStart, `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}`);
    }
    onClose();
  };

  const calculateDays = () => {
    if (!selectedStart) return 1;
    if (!selectedEnd) return 1;
    const [sy, sm, sd] = selectedStart.split('-').map(Number);
    const [ey, em, ed] = selectedEnd.split('-').map(Number);
    const diff = Math.ceil((new Date(ey, em-1, ed) - new Date(sy, sm-1, sd)) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
        className={`w-full max-w-[360px] sm:max-w-[380px] apple-liquid-glass rounded-[28px] p-5 space-y-3.5 my-auto relative ${isDark ? 'text-white' : 'text-slate-900'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Travel Dates
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                Tap start & end dates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white border-white/15'
                : 'bg-black/5 hover:bg-black/10 text-slate-700 hover:text-black border-black/10'
            }`}
            title="Close (Esc)"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-900 dark:text-white">{monthYearStr}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                  : 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-900'
              } text-xs font-bold`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 border-white/15 text-white'
                  : 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-900'
              } text-xs font-bold`}
            >
              ›
            </button>
          </div>
        </div>

        {/* Calendar Day Grid (Breathable and zero scrollbar) */}
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 py-0.5">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const pad = (n) => String(n).padStart(2, '0');
              const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
              const isStart = selectedStart === dateStr;
              const isEnd = selectedEnd === dateStr;
              const isInRange =
                selectedStart &&
                selectedEnd &&
                (() => {
                  const pad = (n) => String(n).padStart(2, '0');
                  const [sy, sm, sd] = selectedStart.split('-').map(Number);
                  const [ey, em, ed] = selectedEnd.split('-').map(Number);
                  const startMs = new Date(sy, sm-1, sd).getTime();
                  const endMs = new Date(ey, em-1, ed).getTime();
                  const dayMs = new Date(year, month, dayNum).getTime();
                  return dayMs >= startMs && dayMs <= endMs;
                })();

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleDayClick(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                    isStart || isEnd
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md scale-105'
                      : isInRange
                      ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold'
                      : isDark
                      ? 'hover:bg-white/10 text-zinc-300'
                      : 'hover:bg-black/5 text-slate-700'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selection Summary Pill */}
        <div className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500 dark:text-zinc-400 text-[11px]">Duration:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            {calculateDays()} Days Scheduled
          </span>
        </div>

        {/* Actions (Always clean and visible) */}
        <div className="flex items-center gap-2 pt-1 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? 'border-white/15 text-zinc-300 hover:bg-white/10'
                : 'border-black/15 text-slate-700 hover:bg-black/5'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2 rounded-full text-xs font-bold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black transition-all cursor-pointer shadow-md"
          >
            Apply Dates
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Itinerary Builder ───
export default function ItineraryBuilder({ isOpen, onClose }) {
  const {
    days,
    destination,
    startDate,
    endDate,
    setDateRange,
    addDay,
    removeDay,
    addActivity,
    removeActivity,
    updateActivity,
    reorderActivities,
  } = useItinerary();
  const { startRouteFlythrough, toggleDrawer } = useApp();

  const { formatPrice } = useCurrency();
  const { isDark } = useTheme();
  const [selectedDayId, setSelectedDayId] = useState(days?.[0]?.id || 'day-1');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationNote, setGenerationNote] = useState('');

  // Custom Activity Inputs
  const [customName, setCustomName] = useState('');
  const [customDuration, setCustomDuration] = useState(1.5);
  const [customCost, setCustomCost] = useState(0);
  const [customType, setCustomType] = useState('activity');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeDay = useMemo(
    () => days.find((d) => d.id === selectedDayId) || days[0] || { id: 'day-1', activities: [] },
    [days, selectedDayId]
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentActivities = activeDay.activities || [];
    const oldIndex = currentActivities.findIndex((a) => a.uid === active.id);
    const newIndex = currentActivities.findIndex((a) => a.uid === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(currentActivities, oldIndex, newIndex);
      reorderActivities(activeDay.id, reordered);
    }
  };

  const handleAddDayClick = () => {
    const newId = addDay();
    if (newId) setSelectedDayId(newId);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;

    addActivity(activeDay.id, {
      name: customName.trim(),
      durationHrs: parseFloat(customDuration) || 1.5,
      cost: parseFloat(customCost) || 0,
      type: customType,
    });

    setCustomName('');
    setCustomCost(0);
    setShowAddCustomModal(false);
  };

  const handleMagicGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const request = magicPrompt.trim() || 'A balanced local day with food, a signature experience, and a scenic finish';
    const result = await generateActivities(request, destination);
    result.activities.forEach((activity) => addActivity(activeDay.id, activity));
    setGenerationNote(`${result.activities.length} stops added via ${result.source}.`);
    setMagicPrompt('');
    setIsGenerating(false);
  };

  const handleOptimizeRoute = () => {
    const optimized = optimizeByNearestStop(activeDay.activities || []);
    if (optimized !== activeDay.activities) {
      reorderActivities(activeDay.id, optimized);
      setGenerationNote('Route ordered by the nearest next waypoint.');
    } else {
      setGenerationNote('Add at least two mapped stops to optimize this route.');
    }
  };

  const handleHotspotDrop = (event) => {
    event.preventDefault();
    try {
      const hotspot = JSON.parse(event.dataTransfer.getData('application/tripnest-hotspot'));
      if (hotspot?.name) addActivity(activeDay.id, hotspot);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <motion.div
      layout="position"
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'} font-sans select-none overflow-hidden`}
    >
      {/* ─── Top Navigation Header ─── */}
      <div
        className="p-3.5 sm:p-4 border-b apple-liquid-glass flex items-center justify-between shrink-0 z-10"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white block truncate">
              {destination?.name || 'Itinerary Builder'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
              {days.length} Days Planned
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowManagerModal(true)}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border shadow-sm ${
              isDark
                ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-200'
            }`}
            title="Manage Itineraries"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className={`text-xs py-1.5 px-3 rounded-full font-bold transition-all cursor-pointer border ${isDark ? 'bg-white/10 text-white border-white/15 hover:bg-white/20' : 'bg-black/5 text-slate-800 border-black/10 hover:bg-black/10'}`}
            title="Share itinerary with Magic QR"
          >
            QR
          </button>
          <button
            type="button"
            onClick={() => setShowCalendarModal(true)}
            className={`text-xs py-1.5 px-3 rounded-full font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              isDark
                ? 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                : 'bg-black/5 text-slate-800 border-black/10 hover:bg-black/10'
            }`}
            title="Set Trip Start and End Dates"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Dates</span>
          </button>

          <button
            type="button"
            onClick={handleAddDayClick}
            className="text-xs py-1.5 px-3 rounded-full font-bold transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm"
          >
            + Day
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

      <div
        className="flex items-center gap-2 p-3 border-b apple-liquid-glass overflow-x-auto no-scrollbar shrink-0"
      >
        {days.map((day, idx) => {
          const isSelected = day.id === activeDay.id;
          return (
            <motion.button
              layout="position"
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
                isSelected
                  ? isDark
                    ? 'bg-white text-black font-bold border-white shadow-sm'
                    : 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
                  : isDark
                  ? 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                  : 'bg-black/5 text-slate-600 border-black/10 hover:text-black'
              }`}
            >
              <span>{day.formattedDate || `Day ${day.dayNumber || idx + 1}`}</span>
              <span
                className={`text-[10px] ${
                  isSelected ? (isDark ? 'text-black/70' : 'text-white/70') : 'text-slate-400 dark:text-zinc-500'
                }`}
              >
                ({day.activities?.length || 0})
              </span>
            </motion.button>
          );
        })}
      </div>

      <motion.div
        layout="position"
        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleHotspotDrop}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {activeDay.dayOfWeek ? `${activeDay.dayOfWeek} — ` : ''}Day {activeDay.dayNumber || 1}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              {(activeDay.activities || []).length} items scheduled
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={handleOptimizeRoute} className={`text-[10px] sm:text-xs py-1.5 px-2.5 sm:px-3 rounded-full font-bold transition-all cursor-pointer border shrink-0 ${isDark ? 'bg-white/10 hover:bg-white/15 text-zinc-200 border-white/15' : 'bg-black/5 hover:bg-black/10 text-slate-800 border-black/10'}`}>Optimize</button>
            <button type="button" onClick={() => {
              toggleDrawer(null);
              startRouteFlythrough();
            }} className="text-[10px] sm:text-xs py-1.5 px-2.5 sm:px-3 rounded-full font-bold transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shrink-0">Preview</button>
            <button
              type="button"
              onClick={() => setShowAddCustomModal(true)}
              title="Add Custom Event"
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold transition-all cursor-pointer border flex items-center justify-center shrink-0 ${isDark ? 'bg-white/10 hover:bg-white/15 text-zinc-200 border-white/15' : 'bg-black/5 hover:bg-black/10 text-slate-800 border-black/10'}`}
            >
              <PlusIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </button>

            {days.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  removeDay(activeDay.id);
                  setSelectedDayId(days[0].id);
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center justify-center"
                title="Remove this day"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>



        <AnimatePresence mode="popLayout">
          {(!activeDay.activities || activeDay.activities.length === 0) ? (
            <motion.div
              key="empty-state"
              layout="position"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.25, 1, 0.5, 1] }}
              className="py-12 text-center rounded-3xl border border-dashed border-black/10 dark:border-white/10 p-6 space-y-2"
            >
              <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                No stops scheduled for this day yet.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Drop a waypoint on the 3D map or click "+ Custom Event" above.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="activities-list"
              layout="position"
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeDay.activities.map((a) => a.uid)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2.5">
                    {activeDay.activities.map((act) => (
                      <SortableActivityCard
                        key={act.uid}
                        activity={act}
                        dayId={activeDay.id}
                        onRemove={removeActivity}
                        onUpdate={updateActivity}
                        onMove={(targetDayId) => moveActivity(activeDay.id, targetDayId, act.uid)}
                        days={days}
                        formatPrice={formatPrice}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showAddCustomModal && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddCustomModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
              className={`w-full max-w-sm apple-liquid-glass rounded-[28px] p-5 shadow-2xl border ${
                isDark ? 'border-white/15 text-white' : 'border-black/10 text-slate-900'
              } space-y-4`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Add Custom Event
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleAddCustom} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-600 dark:text-zinc-400">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Sunset Boat Cruise"
                    className={`w-full ${
                      isDark ? 'bg-white/10 text-white border-white/15' : 'bg-black/5 text-slate-900 border-black/15'
                    } border rounded-xl text-xs p-2.5 outline-none font-medium`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-600 dark:text-zinc-400">
                      Duration (Hrs)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="12"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className={`w-full ${
                        isDark ? 'bg-white/10 text-white border-white/15' : 'bg-black/5 text-slate-900 border-black/15'
                      } border rounded-xl text-xs p-2.5 outline-none font-medium`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-600 dark:text-zinc-400">
                      Est. Cost ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={customCost}
                      onChange={(e) => setCustomCost(e.target.value)}
                      className={`w-full ${
                        isDark ? 'bg-white/10 text-white border-white/15' : 'bg-black/5 text-slate-900 border-black/15'
                      } border rounded-xl text-xs p-2.5 outline-none font-medium`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-600 dark:text-zinc-400">
                    Category
                  </label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className={`w-full ${
                      isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
                    } border rounded-xl text-xs p-2.5 outline-none font-medium`}
                  >
                    <option value="activity">Sight / Attraction</option>
                    <option value="food">Dining / Cuisine</option>
                    <option value="stay">Hotel / Stay</option>
                    <option value="transport">Transit</option>
                    <option value="rest">Leisure / Break</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomModal(false)}
                    className="flex-1 py-2.5 rounded-full text-xs font-bold bg-black/5 dark:bg-white/10 text-slate-600 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-full text-xs font-bold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black shadow-md"
                  >
                    Add Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ItineraryManager
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
      />

      <TripShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        itinerary={{ destinationId: destination?.id, destinationName: destination?.name, startDate, endDate, days }}
        isDark={isDark}
      />

      {/* ─── Travel Dates Calendar Modal (Z-[9999], Mobile Viewport Safe, Zero Sliders) ─── */}
      <AnimatePresence>
        {showCalendarModal && (
          <TravelCalendarModal
            isOpen={showCalendarModal}
            onClose={() => setShowCalendarModal(false)}
            startDate={startDate}
            endDate={endDate}
            onSaveDateRange={(s, e) => setDateRange(s, e)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
