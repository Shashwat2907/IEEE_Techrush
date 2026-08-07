import { useState, useMemo } from 'react';
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
import { useItinerary, ACTIVITY_TYPES } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTheme } from '../../context/ThemeContext';
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

// ─── Sortable Activity Item Component ───
function SortableActivityCard({
  activity,
  dayId,
  onRemove,
  onUpdate,
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
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl transition-all duration-200 border ${
        isDark
          ? 'bg-[#121826]/75 border-white/10 hover:border-white/20'
          : 'bg-white/80 border-black/10 hover:border-black/20 shadow-sm'
      } backdrop-blur-xl overflow-hidden`}
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
      {isExpanded && (
        <div
          className={`p-4 border-t ${
            isDark ? 'border-white/10 bg-[#16161E]' : 'border-black/10 bg-slate-50'
          } space-y-3`}
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

          <div>
            <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
              Notes & Reservations
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booking confirmation #, transit route..."
              className={`w-full ${
                isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
              } border rounded-xl text-xs p-2 outline-none placeholder:text-slate-400 font-medium`}
            />
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
        </div>
      )}
    </div>
  );
}

// ─── Interactive Apple OS Liquid Calendar Modal ───
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
    const d = selectedStart ? new Date(selectedStart) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

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
    const clickedDate = new Date(year, month, dayNum);
    const clickedStr = clickedDate.toISOString().split('T')[0];

    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(clickedStr);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      if (new Date(clickedStr) < new Date(selectedStart)) {
        setSelectedStart(clickedStr);
      } else {
        setSelectedEnd(clickedStr);
      }
    }
  };

  const handleApply = () => {
    if (selectedStart && selectedEnd) {
      onSaveDateRange(selectedStart, selectedEnd);
    } else if (selectedStart) {
      const d = new Date(selectedStart);
      d.setDate(d.getDate() + 2);
      onSaveDateRange(selectedStart, d.toISOString().split('T')[0]);
    }
    onClose();
  };

  const calculateDays = () => {
    if (!selectedStart) return 1;
    if (!selectedEnd) return 1;
    const diff = Math.ceil((new Date(selectedEnd) - new Date(selectedStart)) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-sm apple-liquid-glass rounded-[28px] p-5 shadow-2xl border ${
          isDark ? 'border-white/15 text-white' : 'border-black/10 text-slate-900'
        } space-y-4`}
      >
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Travel Dates
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-800 dark:text-white">{monthYearStr}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold"
            >
              ›
            </button>
          </div>
        </div>

        {/* Calendar Day Grid */}
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
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
              const dateStr = new Date(year, month, dayNum).toISOString().split('T')[0];
              const isStart = selectedStart === dateStr;
              const isEnd = selectedEnd === dateStr;
              const isInRange =
                selectedStart &&
                selectedEnd &&
                new Date(dateStr) >= new Date(selectedStart) &&
                new Date(dateStr) <= new Date(selectedEnd);

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  onClick={() => handleDayClick(dayNum)}
                  className={`h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isStart || isEnd
                      ? 'bg-emerald-500 text-white font-bold shadow-md'
                      : isInRange
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300'
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
          <span className="text-slate-600 dark:text-zinc-400">Duration:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {calculateDays()} Days Scheduled
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-xs font-bold bg-black/5 dark:bg-white/10 hover:bg-black/10 text-slate-600 dark:text-zinc-300 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-full text-xs font-bold bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black transition-all cursor-pointer shadow-md"
          >
            Apply Dates
          </button>
        </div>
      </div>
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

  const { formatPrice } = useCurrency();
  const { isDark } = useTheme();
  const [selectedDayId, setSelectedDayId] = useState(days?.[0]?.id || 'day-1');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

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
          {/* Travel Dates Calendar Trigger */}
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

          {/* Quick Add Day Button */}
          <button
            type="button"
            onClick={handleAddDayClick}
            className="text-xs py-1.5 px-3 rounded-full font-bold transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm"
          >
            + Day
          </button>

          {/* Close Sidebar Button */}
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

      {/* ─── Day Selector Tabs ─── */}
      <div
        className={`flex items-center gap-2 p-3 border-b ${
          isDark ? 'border-white/10 bg-[#0E0E14]/80' : 'border-black/10 bg-[#F4F5F7]/80'
        } overflow-x-auto no-scrollbar shrink-0`}
      >
        {days.map((day, idx) => {
          const isSelected = day.id === activeDay.id;
          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
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
            </button>
          );
        })}
      </div>

      {/* ─── Main Schedule Workspace ─── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
        {/* Day Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {activeDay.dayOfWeek ? `${activeDay.dayOfWeek} — ` : ''}Day {activeDay.dayNumber || 1}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              {(activeDay.activities || []).length} items scheduled
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddCustomModal(true)}
              className={`text-xs py-1.5 px-3 rounded-full font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isDark
                  ? 'bg-white/10 hover:bg-white/15 text-zinc-200 border-white/15'
                  : 'bg-black/5 hover:bg-black/10 text-slate-800 border-black/10'
              }`}
            >
              <PlusIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Custom Event</span>
            </button>

            {days.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  removeDay(activeDay.id);
                  setSelectedDayId(days[0].id);
                }}
                className="text-xs py-1.5 px-2.5 rounded-full font-bold text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Remove this day"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Activity Timeline List */}
        {(!activeDay.activities || activeDay.activities.length === 0) ? (
          <div className="py-12 text-center rounded-3xl border border-dashed border-black/10 dark:border-white/10 p-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              No stops scheduled for this day yet.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              Drop a waypoint on the 3D map or click "+ Custom Event" above.
            </p>
          </div>
        ) : (
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
                    formatPrice={formatPrice}
                    isDark={isDark}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ─── Add Custom Activity Modal ─── */}
      <AnimatePresence>
        {showAddCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddCustom} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Sunset Boat Cruise, Ramen Tasting..."
                    className={`w-full ${
                      isDark ? 'bg-white/10 text-white border-white/15' : 'bg-black/5 text-slate-900 border-black/15'
                    } border rounded-full px-3.5 py-2 text-xs outline-none font-medium`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                      Category
                    </label>
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className={`w-full ${
                        isDark ? 'bg-[#1A1A22] text-white border-white/15' : 'bg-white text-slate-900 border-black/15'
                      } border rounded-full px-3 py-2 text-xs outline-none font-medium`}
                    >
                      <option value="activity">Sight / Activity</option>
                      <option value="food">Dining / Food</option>
                      <option value="stay">Hotel / Stay</option>
                      <option value="transport">Transit</option>
                      <option value="rest">Leisure</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
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
                      } border rounded-full px-3.5 py-2 text-xs outline-none font-semibold`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                    Est. Cost ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    className={`w-full ${
                      isDark ? 'bg-white/10 text-white border-white/15' : 'bg-black/5 text-slate-900 border-black/15'
                    } border rounded-full px-3.5 py-2 text-xs outline-none font-semibold`}
                  />
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

      {/* ─── Travel Dates Calendar Modal ─── */}
      <TravelCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        startDate={startDate}
        endDate={endDate}
        onSaveDateRange={setDateRange}
        isDark={isDark}
      />
    </div>
  );
}
