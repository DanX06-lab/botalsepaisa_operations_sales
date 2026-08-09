/**
 * Geolocation utility functions for route planning
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Validate coordinates
 * @param coord Coordinates to validate
 * @returns true if valid, false otherwise
 */
export function isValidCoordinates(coord: Coordinates): boolean {
  return (
    typeof coord.latitude === 'number' &&
    typeof coord.longitude === 'number' &&
    coord.latitude >= -90 &&
    coord.latitude <= 90 &&
    coord.longitude >= -180 &&
    coord.longitude <= 180 &&
    !isNaN(coord.latitude) &&
    !isNaN(coord.longitude)
  );
}

/**
 * Calculate estimated travel time based on distance
 * Assumes average speed of 30 km/h in urban areas
 * @param distanceKm Distance in kilometers
 * @returns Estimated time in minutes
 */
export function estimateTravelTime(distanceKm: number): number {
  const avgSpeedKmPerHour = 30; // Urban driving speed
  const timeHours = distanceKm / avgSpeedKmPerHour;
  return Math.round(timeHours * 60); // Convert to minutes
}
