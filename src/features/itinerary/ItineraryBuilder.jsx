import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useItinerary, getDayTotals } from '../../context/ItineraryContext';

function SortableActivity({ activity, dayId, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.uid });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 p-3 bg-white/5 rounded-card
        border border-white/5 group hover:border-accent-sky/20
        transition-colors ${isDragging ? 'shadow-lg shadow-accent-sky/10' : ''}`}>
      <button {...attributes} {...listeners}
        className="w-6 h-6 flex items-center justify-center text-text-secondary/40
          hover:text-accent-sky cursor-grab active:cursor-grabbing flex-shrink-0"
        title="Drag to reorder">⋮⋮</button>
      <div className="flex-shrink-0 w-14 text-center">
        <span className="font-mono text-xs text-accent-sky">{formatHour(activity.startHour)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-body font-medium truncate">{activity.name}</div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-text-secondary font-mono">⏱ {activity.durationHrs}h</span>
          <span className="text-[10px] font-mono" style={{ color: activity.cost === 0 ? '#10B981' : '#F59E0B' }}>
            {activity.cost === 0 ? 'Free' : `$${activity.cost}`}
          </span>
        </div>
      </div>
      <button onClick={() => onRemove(dayId, activity.uid)}
        className="w-6 h-6 flex items-center justify-center rounded-full
          text-text-secondary/20 hover:text-accent-rose hover:bg-accent-rose/10
          opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        title="Remove">✕</button>
    </div>
  );
}

function DayColumn({ day, isExpanded, onToggle, onRemoveActivity }) {
  const totals = useMemo(() => getDayTotals(day), [day]);

  return (
    <div className={`rounded-card border transition-all duration-200 ${
      totals.hasConflict ? 'border-accent-rose/30 bg-accent-rose/5' : 'border-white/5 bg-white/[0.02]'
    }`}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors rounded-t-card">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-white text-sm">{day.label}</span>
          <span className="text-[10px] text-text-secondary font-mono">{day.activities.length} activities</span>
          {totals.hasConflict && <span className="text-[10px] text-accent-rose font-mono">⚠ conflict</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-text-secondary font-mono">⏱ {totals.totalHours}h</span>
          <span className="text-[10px] font-mono" style={{ color: totals.totalCost > 200 ? '#F43F5E' : '#F59E0B' }}>
            ${totals.totalCost}
          </span>
          <span className={`text-text-secondary text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden">
            <div className="p-3 pt-0 space-y-2">
              {day.activities.length === 0 ? (
                <div className="text-center py-4 text-text-secondary/40 text-xs font-mono bg-white/[0.02] rounded-card border border-dashed border-white/5">
                  Drop activities here
                </div>
              ) : (
                <SortableContext items={day.activities.map(a => a.uid)} strategy={verticalListSortingStrategy}>
                  {day.activities.map(activity => (
                    <SortableActivity key={activity.uid} activity={activity} dayId={day.id} onRemove={onRemoveActivity} />
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

/* Custom activity form */
function AddActivityForm({ onAdd }) {
  const [name, setName] = useState('');
  const [hours, setHours] = useState('2');
  const [cost, setCost] = useState('0');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), durationHrs: parseFloat(hours) || 2, cost: parseFloat(cost) || 0 });
    setName(''); setHours('2'); setCost('0');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 bg-white/[0.03] rounded-card border border-white/5">
      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Activity name"
        className="w-full bg-white/5 text-white text-sm px-3 py-2 rounded-lg border border-white/10
          focus:border-accent-sky/40 outline-none font-body placeholder:text-text-secondary/50" />
      <div className="flex gap-2">
        <input type="number" value={hours} onChange={e => setHours(e.target.value)} placeholder="Hours"
          className="flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-lg border border-white/10
            focus:border-accent-sky/40 outline-none font-mono" min="0.5" step="0.5" />
        <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost $"
          className="flex-1 bg-white/5 text-white text-xs px-3 py-2 rounded-lg border border-white/10
            focus:border-accent-sky/40 outline-none font-mono" min="0" />
        <button type="submit"
          className="px-4 py-2 bg-accent-sky/20 text-accent-sky rounded-lg text-xs font-semibold
            hover:bg-accent-sky/30 transition-colors">Add</button>
      </div>
    </form>
  );
}

export default function ItineraryBuilder({ isOpen, onClose }) {
  const { days, tripDays, destinationName, setTripDays, addActivity, removeActivity, reorderActivities, moveActivity, clearItinerary } = useItinerary();
  const [expandedDays, setExpandedDays] = useState(new Set(['day-1']));
  const [activeId, setActiveId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleDay = useCallback((dayId) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId); else next.add(dayId);
      return next;
    });
  }, []);

  const grandTotals = useMemo(() => {
    return days.reduce((acc, day) => {
      const t = getDayTotals(day);
      return { cost: acc.cost + t.totalCost, hours: acc.hours + t.totalHours,
        activities: acc.activities + day.activities.length, conflicts: acc.conflicts + (t.hasConflict ? 1 : 0) };
    }, { cost: 0, hours: 0, activities: 0, conflicts: 0 });
  }, [days]);

  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeDayIdx = days.findIndex(d => d.activities.some(a => a.uid === active.id));
    const overDayIdx = days.findIndex(d => d.activities.some(a => a.uid === over.id));
    if (activeDayIdx === -1) return;
    if (activeDayIdx === overDayIdx) {
      const day = days[activeDayIdx];
      const oldIndex = day.activities.findIndex(a => a.uid === active.id);
      const newIndex = day.activities.findIndex(a => a.uid === over.id);
      reorderActivities(day.id, arrayMove(day.activities, oldIndex, newIndex));
    } else if (overDayIdx !== -1) {
      moveActivity(days[activeDayIdx].id, days[overDayIdx].id, active.id);
    }
  };

  const handleAddCustomActivity = useCallback((activity) => {
    const firstExpandedDay = [...expandedDays][0] || 'day-1';
    addActivity(firstExpandedDay, activity);
  }, [expandedDays, addActivity]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="absolute top-0 right-0 h-full w-[420px] max-w-[92vw] z-[1002]
        glass overflow-y-auto shadow-2xl shadow-black/60 flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 glass border-b border-white/5 p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-xl font-bold text-white">Itinerary</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
              hover:bg-white/10 text-text-secondary hover:text-white transition-colors">✕</button>
        </div>
        {destinationName && <p className="text-text-secondary text-xs font-mono">{destinationName}</p>}

        {/* Days control */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-text-secondary">Days:</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setTripDays(tripDays - 1)} disabled={tripDays <= 1}
              className="w-7 h-7 flex items-center justify-center rounded bg-white/5
                text-text-secondary hover:text-white disabled:opacity-30 text-sm">−</button>
            <span className="w-8 text-center font-mono text-sm text-white">{tripDays}</span>
            <button onClick={() => setTripDays(tripDays + 1)} disabled={tripDays >= 14}
              className="w-7 h-7 flex items-center justify-center rounded bg-white/5
                text-text-secondary hover:text-white disabled:opacity-30 text-sm">+</button>
          </div>
        </div>

        {/* Grand totals */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
          <span className="text-xs font-mono text-text-secondary">📋 {grandTotals.activities}</span>
          <span className="text-xs font-mono text-accent-amber">💰 ${grandTotals.cost}</span>
          <span className="text-xs font-mono text-text-secondary">⏱ {grandTotals.hours}h</span>
          {grandTotals.conflicts > 0 && <span className="text-xs font-mono text-accent-rose">⚠ {grandTotals.conflicts}</span>}
        </div>
      </div>

      {/* Days list */}
      <div className="flex-1 p-4 space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd}>
          {days.map(day => (
            <DayColumn key={day.id} day={day} isExpanded={expandedDays.has(day.id)}
              onToggle={() => toggleDay(day.id)} onRemoveActivity={removeActivity} />
          ))}
        </DndContext>

        {/* Add custom activity */}
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="w-full py-2.5 border border-dashed border-white/10 text-text-secondary rounded-card
            text-xs font-mono hover:border-accent-sky/30 hover:text-accent-sky transition-all">
          {showAddForm ? '− Hide' : '+ Add Custom Activity'}
        </button>
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}>
              <AddActivityForm onAdd={handleAddCustomActivity} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 glass border-t border-white/5 p-4">
        <button onClick={clearItinerary}
          className="w-full py-2 border border-accent-rose/20 text-accent-rose rounded-card
            text-xs font-mono hover:bg-accent-rose/10 transition-colors">
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
