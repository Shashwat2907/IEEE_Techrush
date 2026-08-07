import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const ItineraryContext = createContext(null);

const STORAGE_KEY = 'tripnest_itinerary';

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save itinerary to localStorage:', err);
  }
}

const DEFAULT_DAYS = [
  { id: 'day-1', dayNumber: 1, label: 'Day 1', activities: [] },
  { id: 'day-2', dayNumber: 2, label: 'Day 2', activities: [] },
  { id: 'day-3', dayNumber: 3, label: 'Day 3', activities: [] },
];

const initialState = {
  destinationId: null,
  destinationName: '',
  startDate: null, // 'YYYY-MM-DD'
  endDate: null,   // 'YYYY-MM-DD'
  days: DEFAULT_DAYS,
  tripDays: 3,
};

// Activity types for visual differentiation
export const ACTIVITY_TYPES = {
  activity: { label: 'Activity', color: '#38BDF8', icon: 'compass' },
  stay: { label: 'Stay', color: '#F59E0B', icon: 'bed' },
  food: { label: 'Food & Drink', color: '#10B981', icon: 'utensils' },
  transport: { label: 'Transport', color: '#94A3B8', icon: 'car' },
  rest: { label: 'Rest', color: '#A78BFA', icon: 'moon' },
};

function formatDayDate(startDateStr, dayIndex) {
  if (!startDateStr) return null;
  const d = new Date(startDateStr);
  d.setDate(d.getDate() + dayIndex);
  return {
    dateStr: d.toISOString().split('T')[0],
    formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
  };
}

function itineraryReducer(state, action) {
  switch (action.type) {
    case 'SET_DESTINATION': {
      if (state.destinationId === action.payload.id) {
        return state;
      }
      return {
        ...state,
        destinationId: action.payload.id,
        destinationName: action.payload.name,
        days: state.days.map((d, i) => ({ ...d, dayNumber: i + 1, activities: [] })),
      };
    }

    case 'SET_DATE_RANGE': {
      const { startDate, endDate } = action.payload;
      if (!startDate || !endDate) {
        return { ...state, startDate, endDate };
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.max(1, Math.min(14, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1));

      const newDays = [];
      for (let i = 0; i < diffDays; i++) {
        const existing = state.days[i];
        const dateMeta = formatDayDate(startDate, i);
        newDays.push({
          id: existing ? existing.id : `day-${Date.now()}-${i}`,
          dayNumber: i + 1,
          label: `Day ${i + 1}`,
          dateStr: dateMeta?.dateStr,
          formattedDate: dateMeta?.formattedDate,
          dayOfWeek: dateMeta?.dayOfWeek,
          activities: existing ? existing.activities : [],
        });
      }

      return {
        ...state,
        startDate,
        endDate,
        days: newDays,
        tripDays: diffDays,
      };
    }

    case 'LOAD_PREMADE': {
      const { id, name, days } = action.payload;
      const formattedDays = (days || []).map((d, i) => ({
        ...d,
        id: d.id || `day-${i + 1}`,
        dayNumber: d.dayNumber || i + 1,
        activities: d.activities || [],
      }));
      return {
        ...state,
        destinationId: id,
        destinationName: name,
        days: formattedDays.length > 0 ? formattedDays : DEFAULT_DAYS,
        tripDays: formattedDays.length || 3,
      };
    }

    case 'SET_TRIP_DAYS': {
      const count = Math.max(1, Math.min(14, action.payload));
      const days = [];
      for (let i = 0; i < count; i++) {
        const dateMeta = state.startDate ? formatDayDate(state.startDate, i) : null;
        days.push(
          state.days[i] || {
            id: `day-${Date.now()}-${i}`,
            dayNumber: i + 1,
            label: `Day ${i + 1}`,
            dateStr: dateMeta?.dateStr,
            formattedDate: dateMeta?.formattedDate,
            dayOfWeek: dateMeta?.dayOfWeek,
            activities: [],
          }
        );
      }
      return { ...state, days, tripDays: count };
    }

    case 'ADD_DAY': {
      const nextNum = state.days.length + 1;
      const dateMeta = state.startDate ? formatDayDate(state.startDate, state.days.length) : null;
      const newDay = {
        id: `day-${Date.now()}`,
        dayNumber: nextNum,
        label: `Day ${nextNum}`,
        dateStr: dateMeta?.dateStr,
        formattedDate: dateMeta?.formattedDate,
        dayOfWeek: dateMeta?.dayOfWeek,
        activities: [],
      };
      return {
        ...state,
        days: [...state.days, newDay],
        tripDays: state.days.length + 1,
      };
    }

    case 'REMOVE_DAY': {
      if (state.days.length <= 1) return state;
      const targetId = action.payload;
      const nextDays = state.days
        .filter((d) => d.id !== targetId)
        .map((d, idx) => {
          const dateMeta = state.startDate ? formatDayDate(state.startDate, idx) : null;
          return {
            ...d,
            dayNumber: idx + 1,
            label: `Day ${idx + 1}`,
            dateStr: dateMeta?.dateStr,
            formattedDate: dateMeta?.formattedDate,
            dayOfWeek: dateMeta?.dayOfWeek,
          };
        });
      return {
        ...state,
        days: nextDays,
        tripDays: nextDays.length,
      };
    }

    case 'ADD_ACTIVITY': {
      const { dayId, activity } = action.payload;
      return {
        ...state,
        days: state.days.map((day) =>
          day.id === dayId
            ? {
                ...day,
                activities: [
                  ...(day.activities || []),
                  {
                    ...activity,
                    uid: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    startHour: getNextAvailableHour(day.activities || []),
                    type: activity.type || 'activity',
                    notes: activity.notes || '',
                    location: activity.location || '',
                  },
                ],
              }
            : day
        ),
      };
    }

    case 'UPDATE_ACTIVITY': {
      const { dayId, activityUid, updates } = action.payload;
      return {
        ...state,
        days: state.days.map((day) =>
          day.id === dayId
            ? {
                ...day,
                activities: (day.activities || []).map((a) =>
                  a.uid === activityUid ? { ...a, ...updates } : a
                ),
              }
            : day
        ),
      };
    }

    case 'REMOVE_ACTIVITY': {
      const { dayId: removeDayId, activityUid } = action.payload;
      return {
        ...state,
        days: state.days.map((day) =>
          day.id === removeDayId
            ? { ...day, activities: (day.activities || []).filter((a) => a.uid !== activityUid) }
            : day
        ),
      };
    }

    case 'MOVE_ACTIVITY': {
      const { fromDayId, toDayId, activityUid: moveUid } = action.payload;
      let movedActivity = null;

      const daysAfterRemove = state.days.map((day) => {
        if (day.id === fromDayId) {
          const activity = (day.activities || []).find((a) => a.uid === moveUid);
          if (activity) movedActivity = activity;
          return { ...day, activities: (day.activities || []).filter((a) => a.uid !== moveUid) };
        }
        return day;
      });

      if (!movedActivity) return state;

      return {
        ...state,
        days: daysAfterRemove.map((day) =>
          day.id === toDayId
            ? {
                ...day,
                activities: [
                  ...(day.activities || []),
                  { ...movedActivity, startHour: getNextAvailableHour(day.activities || []) },
                ],
              }
            : day
        ),
      };
    }

    case 'REORDER_ACTIVITIES': {
      const { dayId: reorderDayId, activities: reorderedActivities } = action.payload;
      return {
        ...state,
        days: state.days.map((day) =>
          day.id === reorderDayId ? { ...day, activities: reorderedActivities } : day
        ),
      };
    }

    case 'LOAD_STATE':
      return { ...action.payload };

    case 'CLEAR':
      return { ...initialState };

    default:
      return state;
  }
}

function getNextAvailableHour(activities) {
  if (!activities || activities.length === 0) return 9;
  const lastActivity = activities[activities.length - 1];
  return (lastActivity.startHour || 9) + (lastActivity.durationHrs || 2);
}

/**
 * Calculate day totals safely
 */
export function getDayTotals(day) {
  const acts = day?.activities || [];
  const cost = acts.reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
  const hours = acts.reduce((sum, a) => sum + (parseFloat(a.durationHrs) || 0), 0);
  const hasConflict = checkConflicts(acts);
  return {
    cost,
    hours,
    totalCost: cost,
    totalHours: hours,
    hasConflict,
  };
}

/**
 * Check if activities in a day overlap
 */
function checkConflicts(activities) {
  if (!activities || activities.length < 2) return false;
  for (let i = 0; i < activities.length - 1; i++) {
    const current = activities[i];
    const next = activities[i + 1];
    const currentEnd = (current.startHour || 9) + (current.durationHrs || 2);
    if (currentEnd > (next.startHour || 9)) {
      return true;
    }
  }
  return false;
}

export function getTripBudget(days) {
  if (!days || !Array.isArray(days)) return 0;
  return days.reduce((total, day) => {
    return total + (day.activities || []).reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
  }, 0);
}

export function ItineraryProvider({ children }) {
  const stored = loadFromStorage();
  const [state, dispatch] = useReducer(itineraryReducer, stored || initialState);

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const setDestination = useCallback((idOrDest, name) => {
    if (typeof idOrDest === 'object' && idOrDest !== null) {
      dispatch({ type: 'SET_DESTINATION', payload: { id: idOrDest.id, name: idOrDest.name } });
    } else {
      dispatch({ type: 'SET_DESTINATION', payload: { id: idOrDest, name } });
    }
  }, []);

  const setDateRange = useCallback((startDate, endDate) => {
    dispatch({ type: 'SET_DATE_RANGE', payload: { startDate, endDate } });
  }, []);

  const setTripDays = useCallback((count) => {
    dispatch({ type: 'SET_TRIP_DAYS', payload: count });
  }, []);

  const addDay = useCallback(() => {
    const newId = `day-${Date.now()}`;
    dispatch({ type: 'ADD_DAY' });
    return newId;
  }, []);

  const removeDay = useCallback((dayId) => {
    dispatch({ type: 'REMOVE_DAY', payload: dayId });
  }, []);

  const addActivity = useCallback((dayId, activity) => {
    dispatch({ type: 'ADD_ACTIVITY', payload: { dayId, activity } });
  }, []);

  const updateActivity = useCallback((dayId, activityUid, updates) => {
    dispatch({ type: 'UPDATE_ACTIVITY', payload: { dayId, activityUid, updates } });
  }, []);

  const removeActivity = useCallback((dayId, activityUid) => {
    dispatch({ type: 'REMOVE_ACTIVITY', payload: { dayId, activityUid } });
  }, []);

  const moveActivity = useCallback((fromDayId, toDayId, activityUid) => {
    dispatch({ type: 'MOVE_ACTIVITY', payload: { fromDayId, toDayId, activityUid } });
  }, []);

  const reorderActivities = useCallback((dayId, activities) => {
    dispatch({ type: 'REORDER_ACTIVITIES', payload: { dayId, activities } });
  }, []);

  const clearItinerary = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const loadPremadeItinerary = useCallback((premade) => {
    if (!premade) return;
    dispatch({
      type: 'LOAD_PREMADE',
      payload: {
        id: premade.id,
        name: premade.cityName || premade.name,
        days: premade.days || [],
      },
    });
  }, []);

  const destination = {
    id: state.destinationId,
    name: state.destinationName,
  };

  return (
    <ItineraryContext.Provider
      value={{
        ...state,
        destination,
        setDestination,
        setDateRange,
        setTripDays,
        addDay,
        removeDay,
        addActivity,
        updateActivity,
        removeActivity,
        moveActivity,
        reorderActivities,
        clearItinerary,
        loadPremadeItinerary,
        getDayTotals,
        getTripBudget,
      }}
    >
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error('useItinerary must be used within ItineraryProvider');
  return ctx;
}

export default ItineraryContext;
