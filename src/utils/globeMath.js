/**
 * Utility functions for 3D globe math
 */

/**
 * Convert lat/lng to 3D position on a sphere
 * Three.js uses Y-up coordinate system
 */
export function latLngToVector3(lat, lng, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

/**
 * Calculate angular distance between two lat/lng points (in radians)
 * Used to scale flight transition duration
 */
export function angularDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Spherical linear interpolation between two points on a sphere
 * Returns an array of intermediate lat/lng points
 */
export function greatCircleInterpolation(lat1, lng1, lat2, lng2, steps = 50) {
  const toRad = (d) => d * (Math.PI / 180);
  const toDeg = (r) => r * (180 / Math.PI);

  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);

  const d = angularDistance(lat1, lng1, lat2, lng2);
  if (d < 0.0001) return [{ lat: lat2, lng: lng2 }];

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lng = toDeg(Math.atan2(y, x));
    points.push({ lat, lng });
  }

  return points;
}

/**
 * Calculate camera position for looking at a point on the globe
 */
export function getCameraPositionForLatLng(lat, lng, altitude = 2.5) {
  return latLngToVector3(lat, lng, altitude);
}

/**
 * Get the current month's season name
 */
export function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}
