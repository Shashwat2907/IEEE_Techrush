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

/**
 * A single sortable activity card
 */
function SortableActivity({ activity, dayId, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-surface-raised/40 rounded-card
        border border-surface-raised/60 group hover:border-accent-trail/30
        transition-colors ${isDragging ? 'shadow-lg shadow-accent-trail/20' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="w-6 h-6 flex items-center justify-center text-text-secondary/50
          hover:text-accent-trail cursor-grab active:cursor-grabbing flex-shrink-0"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>

      {/* Time slot */}
      <div className="flex-shrink-0 w-14 text-center">
        <span className="font-mono text-xs text-accent-trail">
          {formatHour(activity.startHour)}
        </span>
      </div>

      {/* Activity info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary font-body font-medium truncate">
          {activity.name}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-text-secondary font-mono">
            ⏱ {activity.durationHrs}h
          </span>
          <span className="text-[10px] font-mono" style={{
            color: activity.cost === 0 ? '#5B8A5A' : '#C9A227'
          }}>
            {activity.cost === 0 ? 'Free' : `$${activity.cost}`}
          </span>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(dayId, activity.uid)}
        className="w-6 h-6 flex items-center justify-center rounded-full
          text-text-secondary/30 hover:text-accent-rust hover:bg-accent-rust/10
          opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * A single day column
 */
function DayColumn({ day, isExpanded, onToggle, onRemoveActivity }) {
  const totals = useMemo(() => getDayTotals(day), [day]);

  return (
    <div className={`rounded-card border transition-all duration-200 ${
      totals.hasConflict
        ? 'border-accent-rust/50 bg-accent-rust/5'
        : 'border-surface-raised bg-surface-raised/20'
    }`}>
      {/* Day header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-raised/30
          transition-colors rounded-t-card"
      >
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-text-primary text-sm">
            {day.label}
          </span>
          <span className="text-[10px] text-text-secondary font-mono">
            {day.activities.length} activities
          </span>
          {totals.hasConflict && (
            <span className="text-[10px] text-accent-rust font-mono flex items-center gap-1">
              ⚠ time conflict
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-text-secondary font-mono">
            ⏱ {totals.totalHours}h
          </span>
          <span className="text-[10px] font-mono" style={{
            color: totals.totalCost > 200 ? '#A34530' : '#C9A227'
          }}>
            ${totals.totalCost}
          </span>
          <span className={`text-text-secondary text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Activities list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2">
              {day.activities.length === 0 ? (
                <div className="text-center py-4 text-text-secondary/50 text-xs font-mono topo-bg rounded-card">
                  <div className="relative z-10">
                    Drop activities here or add from the detail panel
                  </div>
                </div>
              ) : (
                <SortableContext
                  items={day.activities.map(a => a.uid)}
                  strategy={verticalListSortingStrategy}
                >
                  {day.activities.map(activity => (
                    <SortableActivity
                      key={activity.uid}
                      activity={activity}
                      dayId={day.id}
                      onRemove={onRemoveActivity}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Main Itinerary Builder — side drawer with day-by-day drag-and-drop timeline
 */
export default function ItineraryBuilder({ isOpen, onClose }) {
  const {
    days,
    tripDays,
    destinationName,
    setTripDays,
    removeActivity,
    reorderActivities,
    moveActivity,
    clearItinerary,
  } = useItinerary();

  const [expandedDays, setExpandedDays] = useState(new Set(['day-1']));
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleDay = useCallback((dayId) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }, []);

  // Grand totals
  const grandTotals = useMemo(() => {
    return days.reduce(
      (acc, day) => {
        const t = getDayTotals(day);
        return {
          cost: acc.cost + t.totalCost,
          hours: acc.hours + t.totalHours,
          activities: acc.activities + day.activities.length,
          conflicts: acc.conflicts + (t.hasConflict ? 1 : 0),
        };
      },
      { cost: 0, hours: 0, activities: 0, conflicts: 0 }
    );
  }, [days]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which days contain the active and over items
    const activeDayIdx = days.findIndex(d => d.activities.some(a => a.uid === active.id));
    const overDayIdx = days.findIndex(d => d.activities.some(a => a.uid === over.id));

    if (activeDayIdx === -1) return;

    if (activeDayIdx === overDayIdx) {
      // Reorder within same day
      const day = days[activeDayIdx];
      const oldIndex = day.activities.findIndex(a => a.uid === active.id);
      const newIndex = day.activities.findIndex(a => a.uid === over.id);
      const newActivities = arrayMove(day.activities, oldIndex, newIndex);
      reorderActivities(day.id, newActivities);
    } else if (overDayIdx !== -1) {
      // Move to different day
      moveActivity(days[activeDayIdx].id, days[overDayIdx].id, active.id);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="absolute top-0 right-0 h-full w-[400px] max-w-[90vw] z-[1002]
        bg-surface/95 backdrop-blur-xl border-l border-surface-raised
        overflow-y-auto shadow-2xl shadow-black/40 flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 bg-surface/95 backdrop-blur-xl border-b border-surface-raised p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-xl font-bold text-text-primary">
            Itinerary
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
              hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        </div>
        {destinationName && (
          <p className="text-text-secondary text-xs font-mono">{destinationName}</p>
        )}

        {/* Trip days control */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-text-secondary">Days:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTripDays(tripDays - 1)}
              disabled={tripDays <= 1}
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-raised
                text-text-secondary hover:text-text-primary disabled:opacity-30 text-sm"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-sm text-text-primary">
              {tripDays}
            </span>
            <button
              onClick={() => setTripDays(tripDays + 1)}
              disabled={tripDays >= 14}
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-raised
                text-text-secondary hover:text-text-primary disabled:opacity-30 text-sm"
            >
              +
            </button>
          </div>
        </div>

        {/* Grand totals */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-surface-raised">
          <span className="text-xs font-mono text-text-secondary">
            📋 {grandTotals.activities} activities
          </span>
          <span className="text-xs font-mono text-accent-ochre">
            💰 ${grandTotals.cost}
          </span>
          <span className="text-xs font-mono text-text-secondary">
            ⏱ {grandTotals.hours}h
          </span>
          {grandTotals.conflicts > 0 && (
            <span className="text-xs font-mono text-accent-rust">
              ⚠ {grandTotals.conflicts} conflicts
            </span>
          )}
        </div>
      </div>

      {/* Days list */}
      <div className="flex-1 p-4 space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {days.map(day => (
            <DayColumn
              key={day.id}
              day={day}
              isExpanded={expandedDays.has(day.id)}
              onToggle={() => toggleDay(day.id)}
              onRemoveActivity={removeActivity}
            />
          ))}
        </DndContext>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-surface/95 backdrop-blur-xl border-t border-surface-raised p-4">
        <button
          onClick={clearItinerary}
          className="w-full py-2 border border-accent-rust/30 text-accent-rust rounded-card
            text-xs font-mono hover:bg-accent-rust/10 transition-colors"
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
