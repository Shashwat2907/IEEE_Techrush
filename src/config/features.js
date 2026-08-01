// Feature flags — disable a broken module in one line before a demo
const features = {
  'globe-home': true,
  'discovery-quiz': true,
  'flight-transition': true,
  'destination-map': true,
  'itinerary': true,
  'budget': true,
  'packing': true,
  'compare': true,
  'theme': true,
  'ai-assistant': true,
};

export function isFeatureEnabled(featureName) {
  return features[featureName] ?? false;
}

export default features;
