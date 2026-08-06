import { useState, useCallback, useMemo } from 'react';
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
import { useItinerary, getDayTotals } from '../../context/ItineraryContext';
import GlobeFilters from '../globe-home/GlobeFilters';
import {
  ClockIcon,
  CloseIcon,
  WarningIcon,
  OverviewIcon,
  PlusIcon,
  FilterIcon,
} from '../../components/ui/Icons';

function SortableActivity({ activity, dayId, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.uid });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2.5 px-3 py-2.5 bg-surface-raised/80 hover:bg-surface-raised rounded-xl border border-white/5 hover:border-accent-sky/25 transition-all group ${
        isDragging ? 'shadow-lg shadow-accent-sky/10 border-accent-sky/40' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="w-5 h-5 flex items-center justify-center text-text-secondary/40 hover:text-accent-sky cursor-grab active:cursor-grabbing flex-shrink-0 font-mono text-xs select-none"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>

      <div className="flex-shrink-0 w-16 text-left">
        <span className="font-mono text-xs font-semibold text-accent-sky tracking-tight">
          {formatHour(activity.startHour)}
        </span>
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="text-xs font-body font-medium text-white truncate leading-snug">
          {activity.name}
        </div>
        <div className="flex items-center gap-2.5 mt-0.5">
          <span className="text-[10px] text-text-secondary/80 font-mono flex items-center gap-1">
            <ClockIcon className="w-2.5 h-2.5" />
            {activity.durationHrs}h
          </span>
          <span
            className="text-[10px] font-mono font-semibold"
            style={{ color: activity.cost === 0 ? '#10B981' : '#F59E0B' }}
          >
            {activity.cost === 0 ? 'Free' : `$${activity.cost}`}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(dayId, activity.uid)}
        className="w-6 h-6 flex items-center justify-center rounded-lg text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        title="Remove activity"
      >
        <CloseIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DayColumn({ day, isExpanded, onToggle, onRemoveActivity }) {
  const totals = useMemo(() => getDayTotals(day), [day]);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        totals.hasConflict
          ? 'border-accent-rose/30 bg-accent-rose/5'
          : 'border-white/10 bg-surface/70 backdrop-blur-md shadow-sm'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-white text-xs sm:text-sm tracking-wide">
            {day.label}
          </span>
          <span className="text-[10px] text-text-secondary/80 font-mono px-1.5 py-0.5 rounded-md bg-white/5">
            {day.activities.length} acts
          </span>
          {totals.hasConflict && (
            <span className="text-[10px] text-accent-rose font-mono flex items-center gap-1 bg-accent-rose/10 px-1.5 py-0.5 rounded-md">
              <WarningIcon className="w-3 h-3" /> Conflict
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <span
            className="text-xs font-mono font-bold"
            style={{ color: totals.cost === 0 ? '#10B981' : '#F59E0B' }}
          >
            ${totals.cost}
          </span>
          <span className="text-xs font-mono text-text-secondary/80">{totals.hours}h</span>
          <span className="text-text-secondary/60 text-[10px] w-4 text-center">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
          {day.activities.length === 0 ? (
            <div className="text-center py-4 text-text-secondary/50 text-xs font-mono bg-white/[0.02] rounded-xl border border-dashed border-white/5">
              No activities yet — drop pins on map or add custom
            </div>
          ) : (
            <SortableContext
              items={day.activities.map((a) => a.uid)}
              strategy={verticalListSortingStrategy}
            >
              {day.activities.map((act) => (
                <SortableActivity
                  key={act.uid}
                  activity={act}
                  dayId={day.id}
                  onRemove={onRemoveActivity}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}

function AddActivityForm({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [durationHrs, setDurationHrs] = useState(1.5);
  const [cost, setCost] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), durationHrs: Number(durationHrs), cost: Number(cost) });
    setName('');
    setDurationHrs(1.5);
    setCost(0);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-raised/90 rounded-2xl p-3.5 border border-white/10 space-y-2.5 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-display font-semibold text-white">Add Custom Activity</span>
        <button type="button" onClick={onClose} className="text-text-secondary hover:text-white p-0.5">
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="text"
        placeholder="e.g. Louvre Museum Tour"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-surface px-3 py-2 rounded-xl text-white font-body text-xs outline-none border border-white/10 focus:border-accent-sky transition-colors"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-text-secondary font-mono uppercase tracking-wider">Duration</label>
          <select
            value={durationHrs}
            onChange={(e) => setDurationHrs(e.target.value)}
            className="w-full mt-1 bg-surface px-2.5 py-1.5 rounded-xl text-white font-mono text-xs outline-none border border-white/10 focus:border-accent-sky"
          >
            <option value="1">1 hour</option>
            <option value="1.5">1.5 hours</option>
            <option value="2">2 hours</option>
            <option value="3">3 hours</option>
            <option value="4">Half Day</option>
            <option value="6">Full Day</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-text-secondary font-mono uppercase tracking-wider">Cost ($)</label>
          <input
            type="number"
            min="0"
            step="5"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0"
            className="w-full mt-1 bg-surface px-2.5 py-1.5 rounded-xl text-white font-mono text-xs outline-none border border-white/10 focus:border-accent-sky"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-accent-sky text-slate-950 rounded-xl text-xs font-semibold font-body hover:bg-sky-400 active:scale-95 transition-all shadow-md shadow-accent-sky/20"
      >
        Add to Selected Day
      </button>
    </form>
  );
}

export default function ItineraryBuilder({ isOpen, onClose }) {
  const {
    days,
    tripDays,
    setTripDays,
    destinationName,
    removeActivity,
    reorderActivities,
    addActivity,
    clearItinerary,
  } = useItinerary();

  const [expandedDays, setExpandedDays] = useState(new Set([days[0]?.id || 'day-1']));
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleDay = (dayId) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  };

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      for (const day of days) {
        const activeIdx = day.activities.findIndex((a) => a.uid === active.id);
        const overIdx = day.activities.findIndex((a) => a.uid === over.id);
        if (activeIdx !== -1 && overIdx !== -1) {
          const reordered = arrayMove(day.activities, activeIdx, overIdx);
          reorderActivities(day.id, reordered);
          break;
        }
      }
    },
    [days, reorderActivities]
  );

  const handleAddCustomActivity = (act) => {
    const targetDayId = Array.from(expandedDays)[0] || days[0]?.id || 'day-1';
    if (targetDayId) addActivity(targetDayId, act);
    setShowAddForm(false);
  };

  const grandTotals = useMemo(() => {
    let activities = 0;
    let cost = 0;
    let hours = 0;
    let conflicts = 0;
    for (const d of days) {
      const t = getDayTotals(d);
      activities += d.activities.length;
      cost += t.cost;
      hours += t.hours;
      if (t.hasConflict) conflicts++;
    }
    return { activities, cost, hours: Math.round(hours * 10) / 10, conflicts };
  }, [days]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 right-0 h-full w-full sm:w-[420px] sm:max-w-[92vw] z-[1002] bg-[#07090E]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col select-none"
    >
      {/* ─── Header Section ─── */}
      <div className="sticky top-0 bg-[#07090E]/95 backdrop-blur-xl border-b border-white/10 p-4 sm:p-5 z-20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">
              Itinerary
            </h3>
            {destinationName && (
              <p className="text-text-secondary text-xs font-mono mt-0.5 flex items-center gap-1">
                <span>📍</span>
                <span>{destinationName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors border border-white/5"
            title="Close Itinerary"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Trip Duration Controls */}
        <div className="flex items-center justify-between bg-surface-raised/60 border border-white/5 px-3 py-2 rounded-xl">
          <span className="text-xs text-text-secondary font-body font-medium">Trip Duration</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTripDays(tripDays - 1)}
              disabled={tripDays <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-20 text-sm font-bold transition-colors border border-white/5"
            >
              −
            </button>
            <span className="min-w-[60px] text-center font-mono text-xs font-bold text-white bg-white/5 px-2 py-1 rounded-lg">
              {tripDays} {tripDays === 1 ? 'day' : 'days'}
            </span>
            <button
              type="button"
              onClick={() => setTripDays(tripDays + 1)}
              disabled={tripDays >= 14}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-20 text-sm font-bold transition-colors border border-white/5"
            >
              +
            </button>
          </div>
        </div>

        {/* Grand Totals Summary Row */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-white/[0.03] border border-white/5 rounded-xl text-center">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-text-secondary font-mono uppercase">Activities</span>
            <span className="text-xs font-mono font-bold text-white mt-0.5 flex items-center gap-1">
              <OverviewIcon className="w-3 h-3 text-accent-sky" />
              {grandTotals.activities} acts
            </span>
          </div>
          <div className="flex flex-col items-center border-x border-white/5">
            <span className="text-[10px] text-text-secondary font-mono uppercase">Est. Cost</span>
            <span className="text-xs font-mono font-bold text-accent-amber mt-0.5">
              ${grandTotals.cost}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-text-secondary font-mono uppercase">Total Time</span>
            <span className="text-xs font-mono font-bold text-white mt-0.5 flex items-center gap-1">
              <ClockIcon className="w-3 h-3 text-text-secondary" />
              {grandTotals.hours}h
            </span>
          </div>
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono transition-all border ${
            showFilters
              ? 'bg-accent-sky/15 border-accent-sky/30 text-accent-sky font-semibold'
              : 'bg-white/5 border-white/10 text-text-secondary hover:text-white hover:bg-white/10'
          }`}
        >
          <FilterIcon className="w-3.5 h-3.5" />
          <span>{showFilters ? 'Hide Filters' : 'Filter Destinations'}</span>
        </button>

        {/* Collapsible Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <GlobeFilters />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Scrollable Days & Activities List ─── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {days.map((day) => (
            <DayColumn
              key={day.id}
              day={day}
              isExpanded={expandedDays.has(day.id)}
              onToggle={() => toggleDay(day.id)}
              onRemoveActivity={removeActivity}
            />
          ))}
        </DndContext>

        {/* Add Custom Activity Button */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full py-2.5 border border-dashed border-white/15 text-text-secondary hover:text-accent-sky hover:border-accent-sky/40 rounded-2xl text-xs font-mono transition-all flex items-center justify-center gap-2 hover:bg-accent-sky/[0.04]"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Custom Activity</span>
          </button>
        ) : (
          <AddActivityForm
            onAdd={handleAddCustomActivity}
            onClose={() => setShowAddForm(false)}
          />
        )}
      </div>

      {/* ─── Sticky Footer ─── */}
      <div className="sticky bottom-0 bg-[#07090E]/95 backdrop-blur-xl border-t border-white/10 p-4">
        <button
          type="button"
          onClick={clearItinerary}
          className="w-full py-2.5 border border-accent-rose/30 text-accent-rose/90 hover:text-accent-rose hover:bg-accent-rose/10 hover:border-accent-rose/50 rounded-xl text-xs font-mono font-semibold transition-colors"
        >
          Clear Itinerary
        </button>
      </div>
    </motion.div>
  );
}

function formatHour(hour) {
  if (hour === undefined || hour === null) return '--:--';
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

