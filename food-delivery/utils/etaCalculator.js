/**
 * Calculate Estimated Time of Arrival (ETA) based on driver and customer locations
 * Uses Haversine formula to calculate distance, then estimates time based on average speed
 * 
 * @param {Object} driverLocation - { lat: number, lng: number }
 * @param {Object} customerLocation - { lat: number, lng: number } or address string
 * @returns {number} - Estimated minutes until delivery
 */
export function calculateETA(driverLocation, customerLocation) {
  if (!driverLocation || !driverLocation.lat || !driverLocation.lng) {
    return null; // No driver location available
  }

  // If customerLocation is a string (address), we can't calculate distance
  // Return a default estimate based on order status
  if (typeof customerLocation === 'string') {
    // Default estimates based on typical delivery times
    return 15; // Default 15 minutes
  }

  if (!customerLocation || !customerLocation.lat || !customerLocation.lng) {
    return null; // No customer location available
  }

  // Haversine formula to calculate distance between two points on Earth
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  const distance = haversineDistance(
    driverLocation.lat,
    driverLocation.lng,
    customerLocation.lat,
    customerLocation.lng
  );

  // Average delivery speed: 30 km/h (0.5 km/min)
  const averageSpeedKmPerMin = 0.5;
  const estimatedMinutes = Math.ceil(distance / averageSpeedKmPerMin);

  // Minimum 5 minutes, maximum 60 minutes
  return Math.max(5, Math.min(60, estimatedMinutes));
}

/**
 * Format ETA as a human-readable string
 * @param {number} minutes - Estimated minutes
 * @returns {string} - Formatted ETA string
 */
export function formatETA(minutes) {
  if (minutes === null || minutes === undefined) return "Calculating...";
  if (minutes === 0) return "0 minutes";
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  }
}

