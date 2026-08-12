/**
 * Give every planned activity a stable, usable map position.  Providers can
 * supply real coordinates; until then this produces a deterministic nearby
 * waypoint instead of leaving an activity invisible or un-routable.
 */
function hash(value) {
  return String(value || 'waypoint').split('').reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 7);
}

export function hasCoordinates(activity) {
  return Number.isFinite(Number(activity?.lat)) && Number.isFinite(Number(activity?.lng));
}

export function getActivityCoordinates(activity, destination, index = 0) {
  if (hasCoordinates(activity)) return { lat: Number(activity.lat), lng: Number(activity.lng) };
  const lat = Number(destination?.lat);
  const lng = Number(destination?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const seed = hash(`${destination?.id || destination?.name}-${activity?.uid || activity?.name}-${index}`);
  const angle = (seed % 360) * (Math.PI / 180);
  // Around 0.8–3.5 km from the destination centre; longitude is adjusted so
  // pins remain sensibly spaced at different latitudes.
  const radius = 0.008 + ((seed >>> 9) % 28) / 1000;
  return {
    lat: lat + Math.sin(angle) * radius,
    lng: lng + (Math.cos(angle) * radius) / Math.max(0.35, Math.cos(lat * Math.PI / 180)),
  };
}

export function addWaypoint(activity, destination, index = 0) {
  const coordinates = getActivityCoordinates(activity, destination, index);
  return coordinates ? { ...activity, ...coordinates } : { ...activity };
}
