/**
 * Rule-based packing list generator
 * Structured so it can be swapped for an AI-generated list later
 */

const BASE_ITEMS = [
  { name: 'Passport & copies', category: 'documents', essential: true },
  { name: 'Travel insurance docs', category: 'documents', essential: true },
  { name: 'Phone charger & adapter', category: 'electronics', essential: true },
  { name: 'Power bank', category: 'electronics', essential: false },
  { name: 'Toiletries bag', category: 'personal', essential: true },
  { name: 'First aid kit', category: 'health', essential: true },
  { name: 'Reusable water bottle', category: 'essentials', essential: true },
  { name: 'Day backpack', category: 'bags', essential: true },
];

const WEATHER_ITEMS = {
  hot: [
    { name: 'Sunscreen SPF 50+', category: 'protection', essential: true },
    { name: 'Sunglasses', category: 'accessories', essential: true },
    { name: 'Light breathable clothes', category: 'clothing', essential: true },
    { name: 'Wide-brim hat', category: 'accessories', essential: false },
    { name: 'Shorts (3-4 pairs)', category: 'clothing', essential: true },
    { name: 'Sandals / flip flops', category: 'footwear', essential: true },
  ],
  cold: [
    { name: 'Thermal base layers', category: 'clothing', essential: true },
    { name: 'Down jacket / parka', category: 'clothing', essential: true },
    { name: 'Warm hat & gloves', category: 'accessories', essential: true },
    { name: 'Scarf / neck gaiter', category: 'accessories', essential: false },
    { name: 'Waterproof boots', category: 'footwear', essential: true },
    { name: 'Wool socks (4+ pairs)', category: 'clothing', essential: true },
  ],
  mild: [
    { name: 'Light jacket / layers', category: 'clothing', essential: true },
    { name: 'Comfortable walking shoes', category: 'footwear', essential: true },
    { name: 'Mix of short & long sleeves', category: 'clothing', essential: true },
    { name: 'Light rain jacket', category: 'clothing', essential: false },
    { name: 'Jeans / casual pants', category: 'clothing', essential: true },
  ],
  rainy: [
    { name: 'Waterproof rain jacket', category: 'clothing', essential: true },
    { name: 'Umbrella (compact)', category: 'accessories', essential: true },
    { name: 'Waterproof bag cover', category: 'bags', essential: true },
    { name: 'Quick-dry clothing', category: 'clothing', essential: true },
    { name: 'Waterproof shoes', category: 'footwear', essential: true },
  ],
};

const TYPE_ITEMS = {
  beach: [
    { name: 'Swimsuit (2)', category: 'clothing', essential: true },
    { name: 'Beach towel', category: 'essentials', essential: true },
    { name: 'Reef-safe sunscreen', category: 'protection', essential: true },
    { name: 'Snorkel gear', category: 'activities', essential: false },
    { name: 'Waterproof phone case', category: 'electronics', essential: false },
  ],
  adventure: [
    { name: 'Hiking boots', category: 'footwear', essential: true },
    { name: 'Moisture-wicking clothes', category: 'clothing', essential: true },
    { name: 'Headlamp', category: 'gear', essential: true },
    { name: 'Insect repellent', category: 'protection', essential: true },
    { name: 'Trekking poles', category: 'gear', essential: false },
    { name: 'Dry bags', category: 'bags', essential: false },
  ],
  culture: [
    { name: 'Modest clothing for temples', category: 'clothing', essential: true },
    { name: 'Comfortable walking shoes', category: 'footwear', essential: true },
    { name: 'Small crossbody bag', category: 'bags', essential: true },
    { name: 'Guidebook or downloaded maps', category: 'essentials', essential: false },
    { name: 'Notebook & pen', category: 'essentials', essential: false },
  ],
  heritage: [
    { name: 'Comfortable walking shoes', category: 'footwear', essential: true },
    { name: 'Camera / binoculars', category: 'electronics', essential: false },
    { name: 'Small crossbody bag', category: 'bags', essential: true },
  ],
  nature: [
    { name: 'Binoculars', category: 'gear', essential: false },
    { name: 'Insect repellent', category: 'protection', essential: true },
    { name: 'Trail snacks', category: 'food', essential: true },
    { name: 'Layers for temperature changes', category: 'clothing', essential: true },
  ],
  urban: [
    { name: 'Comfortable walking shoes', category: 'footwear', essential: true },
    { name: 'Smart casual outfit', category: 'clothing', essential: false },
    { name: 'City map / transit card', category: 'essentials', essential: true },
  ],
};

const CROWD_ITEMS = {
  high: [
    { name: 'Small anti-theft day bag', category: 'bags', essential: true },
    { name: 'Refillable water bottle for queue time', category: 'essentials', essential: true },
    { name: 'Offline maps and timed-entry tickets', category: 'electronics', essential: true },
  ],
  low: [
    { name: 'Camera / binoculars for quieter exploration', category: 'electronics', essential: false },
  ],
};

/**
 * Generate packing list based on destination type, weather, and trip length
 * @param {Object} params - { types: string[], weather: string, tripDays: number }
 * @returns {Array<{name: string, category: string, essential: boolean, packed: boolean}>}
 */
export function generatePackingList({ types = [], weather = 'mild', temperature, crowdLevel = 'medium', tripDays = 5 }) {
  const items = new Map();

  // Add base items
  BASE_ITEMS.forEach(item => items.set(item.name, { ...item, packed: false }));

  // Add weather-specific items
  const weatherKey = getWeatherCategory(weather, temperature);
  (WEATHER_ITEMS[weatherKey] || WEATHER_ITEMS.mild).forEach(item =>
    items.set(item.name, { ...item, packed: false })
  );

  // Add type-specific items
  types.forEach(type => {
    (TYPE_ITEMS[type] || []).forEach(item =>
      items.set(item.name, { ...item, packed: false })
    );
  });

  (CROWD_ITEMS[crowdLevel] || []).forEach(item =>
    items.set(item.name, { ...item, packed: false })
  );

  // Add extra clothing for longer trips
  if (tripDays > 7) {
    items.set('Laundry detergent sheets', { name: 'Laundry detergent sheets', category: 'essentials', essential: true, packed: false });
    items.set('Extra underwear & socks', { name: 'Extra underwear & socks', category: 'clothing', essential: true, packed: false });
  }

  return Array.from(items.values()).sort((a, b) => {
    // Essential items first, then alphabetical
    if (a.essential !== b.essential) return b.essential - a.essential;
    return a.name.localeCompare(b.name);
  });
}

function getWeatherCategory(weatherDesc, temperature) {
  if (Number.isFinite(Number(temperature))) {
    if (Number(temperature) <= 12) return 'cold';
    if (Number(temperature) >= 27) return 'hot';
  }
  if (!weatherDesc) return 'mild';
  const w = weatherDesc.toLowerCase();
  if (w.includes('hot') || w.includes('warm') || w.includes('tropical')) return 'hot';
  if (w.includes('cold') || w.includes('snow') || w.includes('freez')) return 'cold';
  if (w.includes('rain') || w.includes('monsoon') || w.includes('storm')) return 'rainy';
  return 'mild';
}
