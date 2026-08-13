// Activity types for visual differentiation
export const ACTIVITY_TYPES = {
  activity: { label: 'Activity', color: '#38BDF8', icon: 'compass' },
  stay: { label: 'Stay', color: '#F59E0B', icon: 'bed' },
  food: { label: 'Food & Drink', color: '#10B981', icon: 'utensils' },
  transport: { label: 'Transport', color: '#94A3B8', icon: 'car' },
  rest: { label: 'Rest', color: '#A78BFA', icon: 'moon' },
};

/**
 * Check if activities in a day overlap
 */
export function checkConflicts(activities) {
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

export function getTripBudget(days) {
  if (!days || !Array.isArray(days)) return 0;
  return days.reduce((total, day) => {
    return total + (day.activities || []).reduce((sum, a) => sum + (parseFloat(a.cost) || 0), 0);
  }, 0);
}
