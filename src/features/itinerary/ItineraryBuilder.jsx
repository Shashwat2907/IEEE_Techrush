import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
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
  DollarIcon,
  CloseIcon,
  WarningIcon,
  OverviewIcon,
  PlusIcon,
  FilterIcon,
} from '../../components/ui/Icons';

function SortableActivity({ activity, dayId, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.uid });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-accent-sky/20 transition-colors ${
        isDragging ? 'shadow-lg shadow-accent-sky/10' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="w-5 sm:w-6 h-5 sm:h-6 flex items-center justify-center text-text-secondary/40 hover:text-accent-sky cursor-grab active:cursor-grabbing flex-shrink-0 font-mono text-xs"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <div className="flex-shrink-0 w-12 sm:w-14 text-center">
        <span className="font-mono text-[10px] sm:text-xs text-accent-sky">{formatHour(activity.startHour)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm text-white font-body font-medium truncate">{activity.name}</div>
        <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
          <span className="text-[10px] text-text-secondary font-mono flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {activity.durationHrs}h
          </span>
          <span className="text-[10px] font-mono" style={{ color: activity.cost === 0 ? '#10B981' : '#F59E0B' }}>
            {activity.cost === 0 ? 'Free' : `$${activity.cost}`}
          </span>
        </div>
      </div>
      <button
        onClick={() => onRemove(dayId, activity.uid)}
        className="w-5 sm:w-6 h-5 sm:h-6 flex items-center justify-center rounded-full text-text-secondary/30 hover:text-accent-rose hover:bg-accent-rose/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        title="Remove"
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
      className={`rounded-xl border transition-all duration-200 ${
        totals.hasConflict ? 'border-accent-rose/30 bg-accent-rose/5' : 'border-white/5 bg-white/[0.02]'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2.5 sm:p-3 hover:bg-white/5 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-white text-xs sm:text-sm">{day.label}</span>
          <span className="text-[10px] text-text-secondary font-mono">{day.activities.length} acts</span>
          {totals.hasConflict && (
            <span className="text-[10px] text-accent-rose font-mono flex items-center gap-1">
              <WarningIcon className="w-3 h-3" /> Conflict
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-mono" style={{ color: totals.cost === 0 ? '#10B981' : '#F59E0B' }}>
            ${totals.cost}
          </span>
          <span className="text-xs font-mono text-text-secondary">{totals.hours}h</span>
          <span className="text-text-secondary text-xs">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-2.5 sm:p-3 pt-0 space-y-1.5 sm:space-y-2">
          {day.activities.length === 0 ? (
            <div className="text-center py-3 sm:py-4 text-text-secondary/40 text-xs font-mono">
              No activities yet — add from map or suggestions
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

function AddActivityForm({ onAdd }) {
  const [name, setName] = useState('');
  const [durationHrs, setDurationHrs] = useState(1);
  const [cost, setCost] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), durationHrs: Number(durationHrs), cost: Number(cost) });
    setName('');
    setDurationHrs(1);
    setCost(0);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/5 space-y-2">
      <input
        type="text"
        placeholder="Activity name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-surface px-3 py-1.5 rounded-lg text-white font-body text-xs outline-none border border-white/10 focus:border-accent-sky"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-text-secondary font-mono">Duration (hrs)</label>
          <input
            type="number"
            min="0.5"
            max="12"
            step="0.5"
            value={durationHrs}
            onChange={(e) => setDurationHrs(e.target.value)}
            className="w-full bg-surface px-2 py-1 rounded-lg text-white font-mono text-xs outline-none border border-white/10"
          />
        </div>
        <div>
          <label className="text-[10px] text-text-secondary font-mono">Cost ($)</label>
          <input
            type="number"
            min="0"
            step="5"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full bg-surface px-2 py-1 rounded-lg text-white font-mono text-xs outline-none border border-white/10"
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full py-1.5 bg-accent-sky/20 text-accent-sky rounded-lg text-xs font-mono hover:bg-accent-sky/30 transition-colors"
      >
        Add Activity
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

  const [expandedDays, setExpandedDays] = useState(new Set([days[0]?.id]));
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeId, setActiveId] = useState(null);

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
      setActiveId(null);
    },
    [days, reorderActivities]
  );

  const handleAddCustomActivity = (act) => {
    const targetDayId = Array.from(expandedDays)[0] || days[0]?.id;
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
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="absolute top-0 right-0 h-full w-full sm:w-[420px] sm:max-w-[92vw] z-[1002] bg-surface/95 backdrop-blur-2xl border-l border-white/10 overflow-y-auto shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-white/5 p-4 sm:p-5 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">Itinerary</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        {destinationName && <p className="text-text-secondary text-xs font-mono">{destinationName}</p>}

        {/* Days control */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-text-secondary font-body">Trip Duration:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTripDays(tripDays - 1)}
              disabled={tripDays <= 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-text-secondary hover:text-white disabled:opacity-30 text-sm font-bold"
            >
              −
            </button>
            <span className="w-12 text-center font-mono text-xs text-white bg-surface-raised py-1 rounded-lg">
              {tripDays} {tripDays === 1 ? 'day' : 'days'}
            </span>
            <button
              onClick={() => setTripDays(tripDays + 1)}
              disabled={tripDays >= 14}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-text-secondary hover:text-white disabled:opacity-30 text-sm font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Grand totals */}
        <div className="flex items-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-white/5">
          <span className="text-xs font-mono text-text-secondary flex items-center gap-1">
            <OverviewIcon className="w-3.5 h-3.5 text-accent-sky" />
            {grandTotals.activities} acts
          </span>
          <span className="text-xs font-mono text-accent-amber font-semibold">
            ${grandTotals.cost}
          </span>
          <span className="text-xs font-mono text-text-secondary flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {grandTotals.hours}h
          </span>
          {grandTotals.conflicts > 0 && (
            <span className="text-xs font-mono text-accent-rose flex items-center gap-1">
              <WarningIcon className="w-3.5 h-3.5" />
              {grandTotals.conflicts}
            </span>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono transition-all border ${
            showFilters
              ? 'bg-accent-sky/15 border-accent-sky/30 text-accent-sky'
              : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'
          }`}
        >
          <FilterIcon className="w-3.5 h-3.5" />
          <span>{showFilters ? 'Hide Filters' : 'Filter Destinations'}</span>
        </button>

        {/* Collapsible filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 overflow-hidden"
            >
              <GlobeFilters />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Days list */}
      <div className="flex-1 p-4 sm:p-5 space-y-2 sm:space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(e.active.id)}
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

        {/* Add custom activity */}
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full py-2 sm:py-2.5 border border-dashed border-white/10 text-text-secondary rounded-xl text-xs font-mono hover:border-accent-sky/30 hover:text-accent-sky transition-all flex items-center justify-center gap-1.5"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Hide Form' : 'Add Custom Activity'}</span>
        </button>
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AddActivityForm onAdd={handleAddCustomActivity} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-surface/90 backdrop-blur-md border-t border-white/5 p-3 sm:p-4">
        <button
          onClick={clearItinerary}
          className="w-full py-2 sm:py-2.5 border border-accent-rose/20 text-accent-rose rounded-xl text-xs font-mono hover:bg-accent-rose/10 transition-colors"
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
