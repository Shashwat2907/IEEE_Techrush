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
import { getDestinationById, getDestinations } from '../../services/destinations';
import {
  ClockIcon,
  CloseIcon,
  WarningIcon,
  OverviewIcon,
  PlusIcon,
  FilterIcon,
  SearchIcon,
  CheckIcon,
} from '../../components/ui/Icons';

function formatHour(hour) {
  if (hour === undefined || hour === null) return '--:--';
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function SortableActivity({ activity, dayId, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.uid,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

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
              No activities yet — discover attractions below or drop pins on map
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
    <form
      onSubmit={handleSubmit}
      className="bg-surface-raised/90 rounded-2xl p-3.5 border border-white/10 space-y-2.5 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-display font-semibold text-white">Add Custom Activity</span>
        <button type="button" onClick={onClose} className="text-text-secondary hover:text-white p-0.5">
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="text"
        placeholder="e.g. Traditional Tea Ceremony"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-surface px-3 py-2 rounded-xl text-white font-body text-xs outline-none border border-white/10 focus:border-accent-sky transition-colors"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-text-secondary font-mono uppercase tracking-wider">
            Duration
          </label>
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
          <label className="text-[10px] text-text-secondary font-mono uppercase tracking-wider">
            Cost ($)
          </label>
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
    destinationId,
    days,
    tripDays,
    setTripDays,
    destinationName,
    removeActivity,
    reorderActivities,
    addActivity,
    clearItinerary,
  } = useItinerary();

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'explore'
  const [expandedDays, setExpandedDays] = useState(new Set([days[0]?.id || 'day-1']));
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTargetDay, setSelectedTargetDay] = useState(days[0]?.id || 'day-1');

  // Attraction Catalog Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [addedAnimationId, setAddedAnimationId] = useState(null);

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

  // Grand totals
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

  // Curated activity catalog for current destination
  const availableActivities = useMemo(() => {
    const dest = getDestinationById(destinationId);
    let acts = [];
    if (dest?.activities && dest.activities.length > 0) {
      acts = dest.activities.map((a, i) => ({
        id: `dest-act-${i}`,
        name: a.name,
        cost: a.cost || 0,
        durationHrs: a.durationHrs || 2,
        category: a.category || (a.cost === 0 ? 'nature' : 'culture'),
      }));
    } else {
      // Fallback curated set for custom places
      acts = [
        { id: 'act-1', name: 'Historic Old Town Walking Tour', cost: 0, durationHrs: 2.5, category: 'culture' },
        { id: 'act-2', name: 'Panoramic Viewpoint & Sunset Spot', cost: 0, durationHrs: 1.5, category: 'nature' },
        { id: 'act-3', name: 'Local Food & Night Market Experience', cost: 25, durationHrs: 2, category: 'food' },
        { id: 'act-4', name: 'Premier Art & History Museum', cost: 18, durationHrs: 3, category: 'culture' },
        { id: 'act-5', name: 'Scenic Coastal / River Cruise', cost: 35, durationHrs: 2, category: 'adventure' },
        { id: 'act-6', name: 'Botanical Gardens & Tea House', cost: 10, durationHrs: 2, category: 'nature' },
        { id: 'act-7', name: 'Fine Dining Sunset Tasting Menu', cost: 85, durationHrs: 2.5, category: 'food' },
      ];
    }
    return acts;
  }, [destinationId]);

  // Filtered activity catalog
  const filteredCatalog = useMemo(() => {
    return availableActivities.filter((act) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!act.name.toLowerCase().includes(q)) return false;
      }
      if (selectedCategory !== 'all' && act.category !== selectedCategory) {
        return false;
      }
      if (selectedBudget === 'free' && act.cost > 0) return false;
      if (selectedBudget === 'budget' && (act.cost === 0 || act.cost > 25)) return false;
      if (selectedBudget === 'luxury' && act.cost < 50) return false;

      if (selectedDuration === 'short' && act.durationHrs > 2) return false;
      if (selectedDuration === 'long' && act.durationHrs < 3) return false;

      return true;
    });
  }, [availableActivities, searchQuery, selectedCategory, selectedBudget, selectedDuration]);

  // Quick add from catalog to specific day
  const handleQuickAdd = (act, targetDayId) => {
    addActivity(targetDayId, {
      name: act.name,
      cost: act.cost,
      durationHrs: act.durationHrs,
    });
    setAddedAnimationId(act.id);
    setTimeout(() => setAddedAnimationId(null), 1200);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 right-0 h-full w-full sm:w-[460px] sm:max-w-[94vw] z-[1030] bg-[#07090E]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col select-none overflow-hidden"
    >
      {/* ─── Header Section ─── */}
      <div className="sticky top-0 bg-[#0A0E17]/95 backdrop-blur-xl border-b border-white/10 p-4 sm:p-5 z-20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">
              Itinerary Planner
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

        {/* Navigation Mode Tabs: Schedule vs Discover */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-raised/80 border border-white/5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium font-body transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'bg-accent-sky text-bg-base font-bold shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <span>My Schedule</span>
            <span className="text-[10px] font-mono opacity-80">({grandTotals.activities})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium font-body transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'explore'
                ? 'bg-accent-sky text-bg-base font-bold shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <FilterIcon className="w-3.5 h-3.5" />
            <span>Discover & Filter</span>
          </button>
        </div>

        {/* Trip Duration Controls & Summary (Always Visible) */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 px-3 py-2 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-mono">Trip:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTripDays(tripDays - 1)}
                disabled={tripDays <= 1}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white disabled:opacity-20 text-xs font-bold"
              >
                −
              </button>
              <span className="font-mono text-xs font-bold text-white px-1.5">
                {tripDays} {tripDays === 1 ? 'day' : 'days'}
              </span>
              <button
                type="button"
                onClick={() => setTripDays(tripDays + 1)}
                disabled={tripDays >= 14}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white disabled:opacity-20 text-xs font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-accent-amber font-bold">${grandTotals.cost}</span>
            <span className="text-text-secondary">·</span>
            <span className="text-accent-sky font-bold">{grandTotals.hours}h</span>
          </div>
        </div>
      </div>

      {/* ─── TAB 1: DAILY SCHEDULE TIMELINE ─── */}
      {activeTab === 'schedule' && (
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
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full py-2.5 border border-dashed border-white/15 text-text-secondary hover:text-accent-sky hover:border-accent-sky/40 rounded-2xl text-xs font-mono transition-all flex items-center justify-center gap-2 hover:bg-accent-sky/[0.04]"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Custom Activity</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className="w-full py-2.5 bg-accent-sky/15 hover:bg-accent-sky/25 border border-accent-sky/30 text-accent-sky rounded-2xl text-xs font-medium font-body transition-all flex items-center justify-center gap-2"
              >
                <FilterIcon className="w-3.5 h-3.5" />
                <span>Browse Curated Attractions to Add</span>
              </button>
            </div>
          ) : (
            <AddActivityForm
              onAdd={handleAddCustomActivity}
              onClose={() => setShowAddForm(false)}
            />
          )}
        </div>
      )}

      {/* ─── TAB 2: EXPLORE & FILTER ATTRACTIONS ─── */}
      {activeTab === 'explore' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Target Day Selector */}
          <div className="bg-surface-raised/80 border border-white/10 p-3 rounded-2xl space-y-2">
            <label className="text-[11px] font-mono text-text-secondary uppercase tracking-wider block">
              Add selected activities to:
            </label>
            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar">
              {days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedTargetDay(day.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 ${
                    selectedTargetDay === day.id
                      ? 'bg-accent-sky text-bg-base font-bold shadow-md'
                      : 'bg-white/5 text-text-secondary hover:text-white border border-white/5'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter sights & attractions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-white/10 focus:border-accent-sky rounded-xl text-xs text-white outline-none"
            />
          </div>

          {/* Filter Pills: Category, Budget, Duration */}
          <div className="space-y-2 text-xs">
            {/* Categories */}
            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {[
                { key: 'all', label: 'All Sights' },
                { key: 'culture', label: '🏛️ Culture' },
                { key: 'nature', label: '🌿 Nature' },
                { key: 'food', label: '🍜 Food' },
                { key: 'adventure', label: '🏄 Adventure' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelectedCategory(c.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all ${
                    selectedCategory === c.key
                      ? 'bg-accent-sky text-bg-base font-bold'
                      : 'bg-white/5 text-text-secondary hover:text-white border border-white/5'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Budget Filters */}
            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
              {[
                { key: 'all', label: 'Any Budget' },
                { key: 'free', label: 'Free ($0)' },
                { key: 'budget', label: 'Budget (<$25)' },
                { key: 'luxury', label: 'Luxury ($50+)' },
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setSelectedBudget(b.key)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono whitespace-nowrap transition-all ${
                    selectedBudget === b.key
                      ? 'bg-accent-amber text-bg-base font-bold'
                      : 'bg-white/5 text-text-secondary hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attraction Cards Grid */}
          <div className="space-y-2.5 pt-1">
            {filteredCatalog.length === 0 ? (
              <div className="text-center py-8 text-text-secondary/60 text-xs font-mono bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                No attractions matched your filter. Try broadening your search!
              </div>
            ) : (
              filteredCatalog.map((act) => {
                const isJustAdded = addedAnimationId === act.id;
                const targetDayLabel = days.find((d) => d.id === selectedTargetDay)?.label || 'Day';

                return (
                  <div
                    key={act.id}
                    className="p-3 bg-surface/80 hover:bg-surface-raised rounded-2xl border border-white/10 hover:border-accent-sky/30 transition-all flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-body font-semibold text-white truncate">
                        {act.name}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] font-mono">
                        <span className="text-text-secondary flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 text-accent-sky" />
                          {act.durationHrs}h
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: act.cost === 0 ? '#10B981' : '#F59E0B' }}
                        >
                          {act.cost === 0 ? 'Free' : `$${act.cost}`}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/5 text-text-secondary">
                          {act.category}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickAdd(act, selectedTargetDay)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium font-body flex items-center gap-1.5 transition-all shrink-0 ${
                        isJustAdded
                          ? 'bg-accent-emerald text-bg-base font-bold'
                          : 'bg-accent-sky/20 hover:bg-accent-sky/30 text-accent-sky border border-accent-sky/30'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon className="w-3 h-3" />
                          <span>+ {targetDayLabel}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─── Sticky Footer ─── */}
      <div className="sticky bottom-0 bg-[#0A0E17]/95 backdrop-blur-xl border-t border-white/10 p-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={clearItinerary}
          className="py-2 px-3 border border-accent-rose/30 text-accent-rose/90 hover:text-accent-rose hover:bg-accent-rose/10 rounded-xl text-xs font-mono font-semibold transition-colors"
        >
          Clear Itinerary
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 px-4 bg-accent-sky text-bg-base font-bold text-xs rounded-xl hover:bg-accent-sky-dark transition-colors text-center"
        >
          Done Planning
        </button>
      </div>
    </motion.div>
  );
}
