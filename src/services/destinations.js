import destinationsData from '../data/destinations.json';

/**
 * Get destinations with optional filters
 * @param {Object} filters - { type, season, budgetTier, crowdLevel, search }
 * @returns {Array} filtered destinations
 */
export function getDestinations(filters = {}) {
  let results = [...destinationsData];

  if (filters.type && filters.type.length > 0) {
    results = results.filter(d =>
      filters.type.some(t => d.type.includes(t))
    );
  }

  if (filters.season && filters.season.length > 0) {
    results = results.filter(d =>
      filters.season.some(s => d.season.includes(s))
    );
  }

  if (filters.budgetTier) {
    results = results.filter(d => d.budgetTier === filters.budgetTier);
  }

  if (filters.crowdLevel) {
    results = results.filter(d => d.crowdLevel === filters.crowdLevel);
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    results = results.filter(d =>
      d.name.toLowerCase().includes(query) ||
      d.type.some(t => t.toLowerCase().includes(query))
    );
  }

  return results;
}

/**
 * Get a single destination by ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getDestinationById(id) {
  return destinationsData.find(d => d.id === id) || null;
}

/**
 * Get currently trending destinations based on current month/season
 * @returns {Array}
 */
export function getTrendingDestinations() {
  const month = new Date().getMonth(); // 0-11
  const currentSeason = getSeasonFromMonth(month);

  return destinationsData.filter(d =>
    d.season.includes(currentSeason)
  );
}

/**
 * Map month number to season
 */
function getSeasonFromMonth(month) {
  // Northern hemisphere seasons
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Get all unique types across destinations
 */
export function getAllTypes() {
  const types = new Set();
  destinationsData.forEach(d => d.type.forEach(t => types.add(t)));
  return Array.from(types).sort();
}

/**
 * Get all unique seasons
 */
export function getAllSeasons() {
  return ['spring', 'summer', 'monsoon', 'autumn', 'winter'];
}

/**
 * Get all budget tiers
 */
export function getBudgetTiers() {
  return ['budget', 'mid', 'premium'];
}
