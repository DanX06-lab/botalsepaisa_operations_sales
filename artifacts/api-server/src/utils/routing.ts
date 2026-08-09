/**
 * Route planning utilities using nearest-neighbor algorithm
 */

import { calculateDistanceKm, estimateTravelTime, type Coordinates } from './geo';

export interface Shop {
  id: number;
  shopId: string;
  shopName: string;
  ownerName: string;
  mobile: string;
  latitude: number;
  longitude: number;
}

export interface RouteStop {
  sequence: number;
  shopId: number;
  shopName: string;
  latitude: number;
  longitude: number;
  distanceFromPreviousKm: number;
  estimatedArrivalMinutes: number;
  status: 'PENDING' | 'VISITED' | 'SKIPPED';
  visitedAt?: Date;
  collectionId?: number;
  skipReason?: string;
}

export interface GeneratedRoute {
  stops: RouteStop[];
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
}

/**
 * Generate optimal route using nearest-neighbor algorithm
 * Starts and ends at home location
 * @param homeLocation Home/base coordinates
 * @param shops Array of shops to visit
 * @returns Generated route with ordered stops
 */
export function generateRoute(homeLocation: Coordinates, shops: Shop[]): GeneratedRoute {
  if (shops.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      estimatedDurationMinutes: 0,
    };
  }

  // Filter shops with valid GPS coordinates
  const validShops = shops.filter(
    (shop) =>
      shop.latitude !== null &&
      shop.longitude !== null &&
      !isNaN(shop.latitude) &&
      !isNaN(shop.longitude)
  );

  if (validShops.length === 0) {
    return {
      stops: [],
      totalDistanceKm: 0,
      estimatedDurationMinutes: 0,
    };
  }

  const stops: RouteStop[] = [];
  const unvisited = [...validShops];
  let currentLocation = homeLocation;
  let totalDistance = 0;
  let totalTime = 0;

  let sequence = 1;

  while (unvisited.length > 0) {
    // Find nearest unvisited shop
    let nearestIndex = 0;
    let nearestDistance = calculateDistanceKm(currentLocation, {
      latitude: unvisited[0].latitude,
      longitude: unvisited[0].longitude,
    });

    for (let i = 1; i < unvisited.length; i++) {
      const distance = calculateDistanceKm(currentLocation, {
        latitude: unvisited[i].latitude,
        longitude: unvisited[i].longitude,
      });
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    const nearestShop = unvisited.splice(nearestIndex, 1)[0];
    const travelTime = estimateTravelTime(nearestDistance);

    stops.push({
      sequence: sequence++,
      shopId: nearestShop.id,
      shopName: nearestShop.shopName,
      latitude: nearestShop.latitude,
      longitude: nearestShop.longitude,
      distanceFromPreviousKm: nearestDistance,
      estimatedArrivalMinutes: totalTime + travelTime,
      status: 'PENDING',
    });

    totalDistance += nearestDistance;
    totalTime += travelTime;
    currentLocation = {
      latitude: nearestShop.latitude,
      longitude: nearestShop.longitude,
    };
  }

  // Add return to home
  const distanceToHome = calculateDistanceKm(currentLocation, homeLocation);
  const timeToHome = estimateTravelTime(distanceToHome);
  totalDistance += distanceToHome;
  totalTime += timeToHome;

  return {
    stops,
    totalDistanceKm: totalDistance,
    estimatedDurationMinutes: totalTime,
  };
}

/**
 * Check if a shop has valid GPS coordinates
 */
export function hasValidGPS(shop: Shop): boolean {
  return (
    shop.latitude !== null &&
    shop.longitude !== null &&
    shop.latitude >= -90 &&
    shop.latitude <= 90 &&
    shop.longitude >= -180 &&
    shop.longitude <= 180 &&
    !isNaN(shop.latitude) &&
    !isNaN(shop.longitude)
  );
}

/**
 * Get eligible shops for route planning
 * @param shops All shops
 * @returns Shops with valid GPS coordinates
 */
export function getEligibleShops(shops: Shop[]): Shop[] {
  return shops.filter(hasValidGPS);
}
