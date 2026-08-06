/**
 * Mock crowd level service
 * Structured like a real endpoint — only this file changes when a real API is integrated
 */

const CROWD_DESCRIPTIONS = {
  low: { label: 'Low Crowd', description: 'Peaceful and uncrowded — enjoy the space', color: '#10B981' },
  medium: { label: 'Moderate', description: 'Comfortably busy — expect some queues', color: '#F59E0B' },
  high: { label: 'High Crowd', description: 'Very popular right now — plan ahead', color: '#F43F5E' },
};

/**
 * Get crowd level for a destination
 * @param {string} id - destination ID
 * @returns {Promise<Object>}
 */
export async function getCrowdLevel(id) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // Pull from destination data
  const destinations = await import('../data/destinations.json');
  const dest = destinations.default.find(d => d.id === id);

  if (!dest) {
    return { ...CROWD_DESCRIPTIONS.medium, level: 'medium', isMock: true };
  }

  const level = dest.crowdLevel || 'medium';
  return {
    ...CROWD_DESCRIPTIONS[level],
    level,
    isMock: true,
  };
}

/**
 * Get crowd level color for map markers
 */
export function getCrowdColor(level) {
  return CROWD_DESCRIPTIONS[level]?.color || CROWD_DESCRIPTIONS.medium.color;
}

/**
 * Get all crowd level options
 */
export function getCrowdLevels() {
  return Object.entries(CROWD_DESCRIPTIONS).map(([key, val]) => ({
    value: key,
    ...val,
  }));
}
