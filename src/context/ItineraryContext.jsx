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

const initialState = {
  destinationId: null,
  destinationName: '',
  days: [
    { id: 'day-1', label: 'Day 1', activities: [] },
    { id: 'day-2', label: 'Day 2', activities: [] },
    { id: 'day-3', label: 'Day 3', activities: [] },
  ],
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
        days: state.days.map(d => ({ ...d, activities: [] })),
      };
    }

    case 'LOAD_PREMADE': {
      const { id, name, days } = action.payload;
      return {
        ...state,
        destinationId: id,
        destinationName: name,
        days: days || [],
        tripDays: days?.length || 3,
      };
    }

    case 'SET_TRIP_DAYS': {
      const count = Math.max(1, Math.min(14, action.payload));
      const days = [];
      for (let i = 0; i < count; i++) {
        days.push(
          state.days[i] || { id: `day-${i + 1}`, label: `Day ${i + 1}`, activities: [] }
        );
      }
      return { ...state, days, tripDays: count };
    }

    case 'ADD_ACTIVITY': {
      const { dayId, activity } = action.payload;
      return {
        ...state,
        days: state.days.map(day =>
          day.id === dayId
            ? {
                ...day,
                activities: [
                  ...day.activities,
                  {
                    ...activity,
                    uid: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    startHour: getNextAvailableHour(day.activities),
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
        days: state.days.map(day =>
          day.id === dayId
            ? {
                ...day,
                activities: day.activities.map(a =>
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
        days: state.days.map(day =>
          day.id === removeDayId
            ? { ...day, activities: day.activities.filter(a => a.uid !== activityUid) }
            : day
        ),
      };
    }

    case 'MOVE_ACTIVITY': {
      const { fromDayId, toDayId, activityUid: moveUid } = action.payload;
      let movedActivity = null;

      const daysAfterRemove = state.days.map(day => {
        if (day.id === fromDayId) {
          const activity = day.activities.find(a => a.uid === moveUid);
          if (activity) movedActivity = activity;
          return { ...day, activities: day.activities.filter(a => a.uid !== moveUid) };
        }
        return day;
      });

      if (!movedActivity) return state;

      return {
        ...state,
        days: daysAfterRemove.map(day =>
          day.id === toDayId
            ? {
                ...day,
                activities: [
                  ...day.activities,
                  { ...movedActivity, startHour: getNextAvailableHour(day.activities) },
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
        days: state.days.map(day =>
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
  if (activities.length === 0) return 9;
  const lastActivity = activities[activities.length - 1];
  return (lastActivity.startHour || 9) + (lastActivity.durationHrs || 2);
}

/**
 * Calculate day totals
 */
export function getDayTotals(day) {
  const cost = day.activities.reduce((sum, a) => sum + (a.cost || 0), 0);
  const hours = day.activities.reduce((sum, a) => sum + (a.durationHrs || 0), 0);
  const hasConflict = checkConflicts(day.activities);
  return { cost, hours, hasConflict };
}

/**
 * Get full trip totals broken down by activity type
 */
export function getTripBudget(days) {
  const breakdown = { stay: 0, food: 0, activity: 0, transport: 0, rest: 0 };
  let total = 0;
  const perDay = [];

  (days || []).forEach((day) => {
    let dayTotal = 0;
    (day.activities || []).forEach((a) => {
      const cost = a.cost || 0;
      const type = a.type || 'activity';
      breakdown[type] = (breakdown[type] || 0) + cost;
      total += cost;
      dayTotal += cost;
    });
    perDay.push({ dayId: day.id, label: day.label, total: dayTotal });
  });

  return { total, breakdown, perDay };
}

/**
 * Check for overlapping time slots
 */
function checkConflicts(activities) {
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const a = activities[i];
      const b = activities[j];
      const aEnd = (a.startHour || 0) + (a.durationHrs || 0);
      const bEnd = (b.startHour || 0) + (b.durationHrs || 0);
      if ((a.startHour || 0) < bEnd && (b.startHour || 0) < aEnd) {
        return true;
      }
    }
  }
  return false;
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

  const setTripDays = useCallback((count) => {
    dispatch({ type: 'SET_TRIP_DAYS', payload: count });
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

  return (
    <ItineraryContext.Provider
      value={{
        ...state,
        setDestination,
        setTripDays,
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
