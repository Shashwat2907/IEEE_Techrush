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

const FOOD_TEMPLATES = [
  { name: 'Old Town Vegetarian Thali', dietary: 'Vegetarian', specialty: 'regional seasonal platter', cost: 10 },
  { name: 'Smoky Chicken Kitchen', dietary: 'Non-vegetarian', specialty: 'charcoal chicken and local spices', cost: 18 },
  { name: 'Market Mutton House', dietary: 'Non-vegetarian', specialty: 'slow-cooked mutton and flatbreads', cost: 24 },
  { name: 'Garden Cafe', dietary: 'Vegetarian friendly', specialty: 'fresh bowls and local coffee', cost: 14 },
  { name: 'Riverside Street Bites', dietary: 'Mixed menu', specialty: 'classic local snacks', cost: 8 },
];

const STAY_TEMPLATES = [
  { name: 'Trailhead Hostel', tier: 'budget', cost: 22, rating: 4.5 },
  { name: 'Heritage Courtyard', tier: 'mid', cost: 68, rating: 4.7 },
  { name: 'Vista Boutique Hotel', tier: 'mid', cost: 92, rating: 4.8 },
  { name: 'Grand Horizon Retreat', tier: 'premium', cost: 185, rating: 4.9 },
  { name: 'The Local House', tier: 'budget', cost: 38, rating: 4.6 },
];

/**
 * Local, offline-ready recommendations. Coordinates are deliberately offset a
 * little from the destination so they can become real route waypoints.
 */
export function getDestinationHotspots(destination, budgetTier = destination?.budgetTier || 'mid') {
  const baseLat = Number(destination?.lat) || 0;
  const baseLng = Number(destination?.lng) || 0;
  const place = destination?.name?.split(',')[0] || 'Local';
  const offset = (index) => ({
    lat: baseLat + Math.sin(index * 1.9) * 0.018,
    lng: baseLng + Math.cos(index * 1.6) * 0.024,
  });

  const stays = STAY_TEMPLATES
    .map((stay, index) => ({
      ...stay,
      ...offset(index + 1),
      name: `${place} ${stay.name}`,
      type: 'stay',
      durationHrs: 8,
      budgetMatch: stay.tier === budgetTier,
    }))
    .sort((a, b) => Number(b.budgetMatch) - Number(a.budgetMatch));

  const foods = FOOD_TEMPLATES.map((food, index) => ({
    ...food,
    ...offset(index + 7),
    name: `${place} ${food.name}`,
    type: 'food',
    durationHrs: 1.5,
  }));

  return { stays, foods };
}
