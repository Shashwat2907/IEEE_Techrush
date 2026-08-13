import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { decompressFromEncodedURIComponent } from 'lz-string';
import { addWaypoint } from '../services/waypoints';

const ItineraryContext = createContext(null);

const STORAGE_KEY = 'tripnest_itinerary';
const STORAGE_KEY_LIST = 'tripnest_itinerary_list';

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

function getSharedItinerary() {
  try {
    const payload = new URLSearchParams(window.location.search).get('trip');
    if (!payload) return null;
    const decoded = decompressFromEncodedURIComponent(payload);
    const parsed = decoded ? JSON.parse(decoded) : null;
    return parsed && Array.isArray(parsed.days) ? parsed : null;
  } catch {
    return null;
  }
}

const DEFAULT_DAYS = [];

const initialState = {
  destinationId: null,
  destinationName: '',
  destinationLat: null,
  destinationLng: null,
  startDate: null, // 'YYYY-MM-DD'
  endDate: null,   // 'YYYY-MM-DD'
  days: DEFAULT_DAYS,
  tripDays: 3,
};

import { ACTIVITY_TYPES, getDayTotals, getTripBudget } from '../utils/itineraryUtils';


function formatDayDate(startDateStr, dayIndex) {
  if (!startDateStr) return null;
  const [year, month, day] = startDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
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
      if (state.destinationId === action.payload.id && state.days.some((day) => (day.activities || []).length > 0)) {
        return state;
      }
      const destination = action.payload;
      return {
        ...state,
        destinationId: action.payload.id,
        destinationName: action.payload.name,
        destinationLat: Number.isFinite(Number(destination.lat)) ? Number(destination.lat) : null,
        destinationLng: Number.isFinite(Number(destination.lng)) ? Number(destination.lng) : null,
        days: [],
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
      const activityUid = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const destination = { id: state.destinationId, name: state.destinationName, lat: state.destinationLat, lng: state.destinationLng };
      return {
        ...state,
        days: state.days.map((day) =>
          day.id === dayId
            ? {
                ...day,
                activities: [
                  ...(day.activities || []),
                  addWaypoint({
                    ...activity,
                    uid: activityUid,
                    startHour: getNextAvailableHour(day.activities || []),
                    type: activity.type || 'activity',
                    notes: activity.notes || '',
                    location: activity.location || '',
                  }, destination, (day.activities || []).length),
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

    case 'IMPORT_SHARED': {
      const incoming = action.payload;
      if (!incoming || !Array.isArray(incoming.days)) return state;
      const days = incoming.days.slice(0, 14).map((day, index) => ({
        id: day.id || `day-import-${Date.now()}-${index}`,
        dayNumber: index + 1,
        label: `Day ${index + 1}`,
        dateStr: day.dateStr,
        formattedDate: day.formattedDate,
        dayOfWeek: day.dayOfWeek,
        activities: (day.activities || []).map((activity) => ({
          ...activity,
          uid: activity.uid || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: activity.type || 'activity',
          durationHrs: Number(activity.durationHrs) || 2,
          cost: Number(activity.cost) || 0,
          startHour: Number(activity.startHour) || 9,
        })),
      }));
      return {
        ...initialState,
        destinationId: incoming.destinationId || null,
        destinationName: incoming.destinationName || '',
        startDate: incoming.startDate || null,
        endDate: incoming.endDate || null,
        days: days.length ? days : DEFAULT_DAYS,
        tripDays: days.length || DEFAULT_DAYS.length,
      };
    }

    case 'LOAD_STATE':
      return { ...action.payload };

    case 'IMPORT_PLAN': {
      const { planDays, destination } = action.payload;
      const formattedDays = planDays.map((d, i) => ({
        id: `day-${Date.now()}-${i}`,
        dayNumber: i + 1,
        label: `Day ${i + 1}`,
        activities: (d.activities || []).map((act, actIdx) => 
          addWaypoint({
            name: act.name,
            durationHrs: act.durationHrs || 2,
            cost: act.cost || 0,
            type: act.type || 'activity',
            notes: act.notes || '',
            location: act.location || '',
            lat: act.lat,
            lng: act.lng,
            startHour: act.startHour || (9 + actIdx * 2),
            uid: `imported-${Date.now()}-${i}-${actIdx}`
          }, destination, actIdx)
        )
      }));
      return {
        ...state,
        days: formattedDays,
        tripDays: formattedDays.length,
      };
    }

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


export function ItineraryProvider({ children }) {
  const stored = getSharedItinerary() || loadFromStorage();
  const [state, dispatch] = useReducer(itineraryReducer, stored || initialState);

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // A shared URL is a one-time, backend-free handoff. Remove the payload after
  // it has been persisted locally so refreshes continue from localStorage.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('trip')) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }, []);

  const setDestination = useCallback((idOrDest, name) => {
    if (typeof idOrDest === 'object' && idOrDest !== null) {
      dispatch({ type: 'SET_DESTINATION', payload: idOrDest });
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

  const importAiPlan = useCallback((planDays) => {
    dispatch({ type: 'IMPORT_PLAN', payload: { planDays, destination: { id: state.destinationId, name: state.destinationName, lat: state.destinationLat, lng: state.destinationLng } } });
  }, [state.destinationId, state.destinationName, state.destinationLat, state.destinationLng]);

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

  const importSharedItinerary = useCallback((sharedState) => {
    dispatch({ type: 'IMPORT_SHARED', payload: sharedState });
  }, []);

  const exportItinerary = useCallback(() => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `tripnest-${state.destinationName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'itinerary'}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [state]);

  const importItinerary = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedState = JSON.parse(e.target.result);
          dispatch({ type: 'IMPORT_SHARED', payload: importedState });
          resolve();
        } catch {
          reject(new Error('Invalid itinerary file format'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  const getSavedItineraries = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_LIST)) || [];
    } catch {
      return [];
    }
  }, []);

  const saveAsNewItinerary = useCallback((name) => {
    const currentList = getSavedItineraries();
    const newItinerary = {
      id: `saved-${Date.now()}`,
      name: name || state.destinationName || 'My Trip',
      date: new Date().toISOString(),
      state: state,
    };
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify([newItinerary, ...currentList]));
  }, [state, getSavedItineraries]);

  const loadItinerary = useCallback((id) => {
    const currentList = getSavedItineraries();
    const target = currentList.find(i => i.id === id);
    if (target && target.state) {
      dispatch({ type: 'IMPORT_SHARED', payload: target.state });
    }
  }, [getSavedItineraries]);

  const deleteItinerary = useCallback((id) => {
    const currentList = getSavedItineraries();
    const filtered = currentList.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(filtered));
  }, [getSavedItineraries]);

  const destination = {
    id: state.destinationId,
    name: state.destinationName,
    lat: state.destinationLat,
    lng: state.destinationLng,
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
        importAiPlan,
        addActivity,
        updateActivity,
        removeActivity,
        moveActivity,
        reorderActivities,
        clearItinerary,
        loadPremadeItinerary,
        importSharedItinerary,
        exportItinerary,
        importItinerary,
        getSavedItineraries,
        saveAsNewItinerary,
        loadItinerary,
        deleteItinerary,
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
