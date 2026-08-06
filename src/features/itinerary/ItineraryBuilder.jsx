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
import { useItinerary, getDayTotals, ACTIVITY_TYPES } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { getDestinationById, getDestinations } from '../../services/destinations';
import {
  ClockIcon,
  CloseIcon,
  WarningIcon,
  PlusIcon,
  SearchIcon,
  BedIcon,
  UtensilsIcon,
  CompassIcon,
  CarIcon,
  MoonIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  EditIcon,
} from '../../components/ui/Icons';

function formatHour(hour) {
  if (hour === undefined || hour === null) return '--:--';
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const TYPE_CONFIG = {
  stay: { label: 'Stay / Hotel', color: '#F59E0B', icon: <BedIcon className="w-3.5 h-3.5" /> },
  food: { label: 'Dining / Food', color: '#10B981', icon: <UtensilsIcon className="w-3.5 h-3.5" /> },
  activity: { label: 'Activity', color: '#38BDF8', icon: <CompassIcon className="w-3.5 h-3.5" /> },
  transport: { label: 'Transit', color: '#94A3B8', icon: <CarIcon className="w-3.5 h-3.5" /> },
  rest: { label: 'Rest / Leisure', color: '#A78BFA', icon: <MoonIcon className="w-3.5 h-3.5" /> },
};

function SortableActivity({ activity, dayId, onRemove, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(activity.notes || '');
  const [cost, setCost] = useState(activity.cost || 0);
  const [type, setType] = useState(activity.type || 'activity');
  const { formatPrice } = useCurrency();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.uid,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const currentType = TYPE_CONFIG[activity.type || 'activity'] || TYPE_CONFIG.activity;

  const handleSaveDetails = () => {
    onUpdate(dayId, activity.uid, {
      notes,
      cost: parseFloat(cost) || 0,
      type,
    });
    setIsExpanded(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden ${
        isDragging ? 'shadow-2xl border-accent-sky/30' : ''
      }`}
    >
      {/* Card Header Row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="w-4 h-4 flex items-center justify-center text-text-secondary/40 hover:text-white cursor-grab active:cursor-grabbing flex-shrink-0 font-mono text-[10px] select-none"
          title="Drag to reorder"
        >
          ⋮⋮
        </button>

        {/* Category Visual Pill */}
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${currentType.color}15`, color: currentType.color }}
          title={currentType.label}
        >
          {currentType.icon}
        </div>

        {/* Timing */}
        <div className="flex-shrink-0 w-14 text-left">
          <span className="font-mono text-[11px] font-semibold text-accent-sky">
            {formatHour(activity.startHour)}
          </span>
        </div>

        {/* Title and details summary */}
        <div
          className="flex-1 min-w-0 pr-1 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="text-xs font-body font-medium text-white truncate flex items-center gap-1.5">
            <span>{activity.name}</span>
            {activity.notes && (
              <span className="w-1.5 h-1.5 rounded-full bg-accent-sky/60" title="Has notes" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-secondary font-mono flex items-center gap-0.5">
              <ClockIcon className="w-2.5 h-2.5" />
              {activity.durationHrs}h
            </span>
            <span className="text-[10px] font-mono font-semibold text-accent-emerald">
              {formatPrice(activity.cost)}
            </span>
            <span
              className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded"
              style={{ color: currentType.color, backgroundColor: `${currentType.color}10` }}
            >
              {currentType.label.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Expand / Details Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-text-secondary/50 hover:text-white transition-colors"
          title="Add details & notes"
        >
          {isExpanded ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onRemove(dayId, activity.uid)}
          className="w-5 h-5 flex items-center justify-center rounded-lg text-text-secondary/40 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
          title="Remove activity"
        >
          <CloseIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Expandable Details Accordion */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/[0.04] p-3 bg-black/20 space-y-2.5 text-left"
          >
            {/* Category Type Selector */}
            <div>
              <label className="text-[10px] font-mono uppercase text-text-secondary">Type</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(TYPE_CONFIG).map(([tKey, tConf]) => (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => setType(tKey)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition-all ${
                      type === tKey
                        ? 'bg-white/10 text-white border border-white/20 font-semibold'
                        : 'text-text-secondary hover:text-white bg-white/[0.02]'
                    }`}
                  >
                    <span style={{ color: tConf.color }}>{tConf.icon}</span>
                    <span>{tConf.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Details */}
            <div>
              <label className="text-[10px] font-mono uppercase text-text-secondary">
                Details & Notes (Hotel check-in, confirmation #, tips)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Check-in at 2 PM, voucher code #1234..."
                rows={2}
                className="w-full mt-1 bg-white/[0.03] border border-white/[0.06] focus:border-accent-sky/40 rounded-lg p-2 text-xs text-white placeholder:text-text-secondary/40 outline-none resize-none font-body"
              />
            </div>

            {/* Cost & Save */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-mono uppercase text-text-secondary">Est. Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-20 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1 text-xs font-mono text-white outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveDetails}
                className="px-3 py-1 bg-accent-sky text-slate-950 rounded-lg text-xs font-semibold hover:bg-sky-400 transition-colors"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DayColumn({ day, isExpanded, onToggle, onRemoveActivity, onUpdateActivity }) {
  const totals = useMemo(() => getDayTotals(day), [day]);
  const { formatPrice } = useCurrency();

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        totals.hasConflict
          ? 'border-accent-rose/30 bg-accent-rose/5'
          : 'border-white/[0.05] bg-white/[0.02]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wide">
            {day.label}
          </span>
          <span className="text-[10px] font-mono text-text-secondary bg-white/[0.05] px-2 py-0.5 rounded-full">
            {day.activities.length} {day.activities.length === 1 ? 'event' : 'events'}
          </span>
          {totals.hasConflict && (
            <span
              className="text-[10px] font-mono text-accent-rose flex items-center gap-1"
              title="Time overlap conflict detected"
            >
              <WarningIcon className="w-3 h-3" />
              Conflict
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-accent-emerald font-semibold">
            {formatPrice(totals.cost)}
          </span>
          <span className="text-[11px] font-mono text-text-secondary">
            {totals.hours}h
          </span>
          <span className="text-text-secondary text-xs">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3 pb-3 space-y-2"
          >
            {day.activities.length === 0 ? (
              <div className="text-center py-4 text-xs font-mono text-text-secondary/50 border border-dashed border-white/5 rounded-xl">
                No activities yet. Add experiences below.
              </div>
            ) : (
              <SortableContext
                items={day.activities.map((a) => a.uid)}
                strategy={verticalListSortingStrategy}
              >
                {day.activities.map((activity) => (
                  <SortableActivity
                    key={activity.uid}
                    activity={activity}
                    dayId={day.id}
                    onRemove={onRemoveActivity}
                    onUpdate={onUpdateActivity}
                  />
                ))}
              </SortableContext>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ItineraryBuilder({ isOpen, onClose }) {
  const {
    days,
    tripDays,
    destinationName,
    destinationId,
    setTripDays,
    addActivity,
    updateActivity,
    removeActivity,
    reorderActivities,
  } = useItinerary();

  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'discover'
  const [expandedDays, setExpandedDays] = useState({ 'day-1': true, 'day-2': true, 'day-3': true });
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCost, setCustomCost] = useState('0');
  const [customDuration, setCustomDuration] = useState('2');
  const [customType, setCustomType] = useState('activity');
  const [customDayId, setCustomDayId] = useState('day-1');
  const [customNotes, setCustomNotes] = useState('');

  const { formatPrice } = useCurrency();

  const currentDest = useMemo(() => {
    return destinationId ? getDestinationById(destinationId) : null;
  }, [destinationId]);

  const allDestinations = useMemo(() => getDestinations(), []);

  // Discover pool of experiences
  const discoverActivities = useMemo(() => {
    let pool = [];
    if (currentDest?.activities) {
      pool = currentDest.activities.map((a) => ({ ...a, source: currentDest.name }));
    } else {
      pool = allDestinations.flatMap((d) =>
        (d.activities || []).map((a) => ({ ...a, source: d.name }))
      );
    }

    return pool.filter((a) => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        if (!a.name.toLowerCase().includes(q)) return false;
      }
      if (selectedCategory !== 'all') {
        const actType = a.type || 'activity';
        if (actType !== selectedCategory) return false;
      }
      return true;
    });
  }, [currentDest, allDestinations, searchFilter, selectedCategory]);

  const toggleDay = (dayId) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleAddCustomActivity = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;

    addActivity(customDayId, {
      name: customName.trim(),
      cost: parseFloat(customCost) || 0,
      durationHrs: parseFloat(customDuration) || 2,
      type: customType,
      notes: customNotes.trim(),
    });

    setCustomName('');
    setCustomNotes('');
    setCustomCost('0');
    setShowAddCustom(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event, dayId) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const day = days.find((d) => d.id === dayId);
      if (!day) return;

      const oldIndex = day.activities.findIndex((a) => a.uid === active.id);
      const newIndex = day.activities.findIndex((a) => a.uid === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(day.activities, oldIndex, newIndex);
        reorderActivities(dayId, reordered);
      }
    },
    [days, reorderActivities]
  );

  if (!isOpen) return null;

  return (
    <div className="h-full w-full flex flex-col bg-[#0B101B]/95 backdrop-blur-2xl text-text-primary overflow-hidden select-none">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-accent-sky uppercase tracking-widest bg-accent-sky/10 px-2 py-0.5 rounded-full border border-accent-sky/20">
              Trip Planner
            </span>
            <h3 className="font-display text-base font-bold text-white tracking-wide mt-1">
              {destinationName || 'Personalized Itinerary'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Trip Days Controller */}
            <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setTripDays(Math.max(1, tripDays - 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-text-secondary hover:text-white hover:bg-white/10 text-xs font-mono"
              >
                -
              </button>
              <span className="px-2 text-xs font-mono text-white font-semibold">
                {tripDays}d
              </span>
              <button
                type="button"
                onClick={() => setTripDays(Math.min(14, tripDays + 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-text-secondary hover:text-white hover:bg-white/10 text-xs font-mono"
              >
                +
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1.5 mt-3.5 p-1 bg-white/[0.03] rounded-xl border border-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold font-body transition-all ${
              activeTab === 'schedule'
                ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            My Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold font-body transition-all ${
              activeTab === 'discover'
                ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Discover & Filter
          </button>
        </div>
      </div>

      {/* Tab: My Schedule */}
      {activeTab === 'schedule' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Add Custom Activity CTA */}
          <button
            type="button"
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="w-full py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-white transition-all flex items-center justify-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5 text-accent-sky" />
            <span>{showAddCustom ? 'Close Activity Form' : '+ Add Custom Event / Stay / Food'}</span>
          </button>

          {/* Add Custom Activity Inline Form */}
          <AnimatePresence>
            {showAddCustom && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddCustomActivity}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3"
              >
                <div>
                  <label className="text-[10px] font-mono uppercase text-text-secondary">
                    Event / Stay Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Hotel Check-in, Ramen Dinner, Museum Tour"
                    className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder:text-text-secondary/40 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-secondary">Type</label>
                    <select
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className="w-full mt-1 bg-[#0B101B] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono outline-none"
                    >
                      <option value="activity">Activity</option>
                      <option value="stay">Stay / Hotel</option>
                      <option value="food">Dining / Food</option>
                      <option value="transport">Transit</option>
                      <option value="rest">Rest</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-secondary">Day</label>
                    <select
                      value={customDayId}
                      onChange={(e) => setCustomDayId(e.target.value)}
                      className="w-full mt-1 bg-[#0B101B] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white font-mono outline-none"
                    >
                      {days.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-secondary">Duration (hrs)</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                      className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-text-secondary">Cost ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={customCost}
                      onChange={(e) => setCustomCost(e.target.value)}
                      className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-text-secondary">Notes (Optional)</label>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Confirmation numbers, meeting points, addresses..."
                    rows={2}
                    className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder:text-text-secondary/40 outline-none resize-none font-body"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-accent-sky text-slate-950 rounded-xl text-xs font-bold font-body hover:bg-sky-400 transition-colors shadow-md cursor-pointer"
                >
                  Add to Schedule
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Days Schedule Columns */}
          {days.map((day) => (
            <DndContext
              key={day.id}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleDragEnd(event, day.id)}
            >
              <DayColumn
                day={day}
                isExpanded={!!expandedDays[day.id]}
                onToggle={() => toggleDay(day.id)}
                onRemoveActivity={removeActivity}
                onUpdateActivity={updateActivity}
              />
            </DndContext>
          ))}
        </div>
      )}

      {/* Tab: Discover & Filter */}
      {activeTab === 'discover' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <SearchIcon className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search experiences, food, sights..."
              className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white placeholder:text-text-secondary/50 outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'activity', label: 'Activities' },
              { key: 'food', label: 'Dining' },
              { key: 'stay', label: 'Stays' },
              { key: 'transport', label: 'Transit' },
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-accent-sky/20 text-accent-sky border border-accent-sky/30'
                    : 'text-text-secondary hover:text-white bg-white/[0.02]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Discover Cards List */}
          <div className="space-y-2">
            {discoverActivities.map((act, index) => {
              const actType = TYPE_CONFIG[act.type || 'activity'] || TYPE_CONFIG.activity;

              return (
                <div
                  key={`${act.name}-${index}`}
                  className="p-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/[0.04] flex items-center justify-between group transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: actType.color }}>{actType.icon}</span>
                      <span className="text-xs text-white font-medium truncate">{act.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-1">
                      <span className="text-[10px] text-text-secondary font-mono">
                        {act.durationHrs}h
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-accent-emerald">
                        {formatPrice(act.cost)}
                      </span>
                      {act.source && (
                        <span className="text-[9px] font-mono text-text-secondary/60 truncate">
                          · {act.source}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Add to specific day dropdown/button */}
                  <button
                    type="button"
                    onClick={() =>
                      addActivity(days[0]?.id || 'day-1', {
                        name: act.name,
                        cost: act.cost || 0,
                        durationHrs: act.durationHrs || 2,
                        type: act.type || 'activity',
                      })
                    }
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-accent-sky/15 text-accent-sky hover:bg-accent-sky/25 transition-all text-xs flex-shrink-0"
                    title="Add to Day 1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
