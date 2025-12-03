import { calculateETA, formatETA } from "../../utils/etaCalculator.js";

describe("ETA Calculator", () => {
  describe("calculateETA", () => {
    it("should return null when driver location is missing", () => {
      const result = calculateETA(null, { lat: 35.7796, lng: -78.6382 });
      expect(result).toBeNull();
    });

    it("should return null when driver location has no lat/lng", () => {
      const result = calculateETA({}, { lat: 35.7796, lng: -78.6382 });
      expect(result).toBeNull();
    });

    it("should return default 15 minutes when customer location is a string", () => {
      const driverLocation = { lat: 35.7796, lng: -78.6382 };
      const customerLocation = "123 Main Street, Raleigh, NC";
      
      const result = calculateETA(driverLocation, customerLocation);
      expect(result).toBe(15);
    });

    it("should return null when customer location is missing", () => {
      const driverLocation = { lat: 35.7796, lng: -78.6382 };
      const result = calculateETA(driverLocation, null);
      expect(result).toBeNull();
    });

    it("should return null when customer location has no lat/lng", () => {
      const driverLocation = { lat: 35.7796, lng: -78.6382 };
      const result = calculateETA(driverLocation, {});
      expect(result).toBeNull();
    });

    it("should calculate ETA for nearby locations", () => {
      // Raleigh, NC coordinates
      const driverLocation = { lat: 35.7796, lng: -78.6382 };
      const customerLocation = { lat: 35.7847, lng: -78.6441 }; // ~1 km away
      
      const result = calculateETA(driverLocation, customerLocation);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(60);
    });

    it("should calculate ETA for distant locations", () => {
      // Raleigh, NC to Durham, NC (~25 km)
      const driverLocation = { lat: 35.7796, lng: -78.6382 }; // Raleigh
      const customerLocation = { lat: 35.9940, lng: -78.8986 }; // Durham
      
      const result = calculateETA(driverLocation, customerLocation);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(60); // Capped at 60 minutes
    });

    it("should return minimum 5 minutes", () => {
      // Very close locations (same building)
      const driverLocation = { lat: 35.7796, lng: -78.6382 };
      const customerLocation = { lat: 35.7797, lng: -78.6383 }; // ~100 meters
      
      const result = calculateETA(driverLocation, customerLocation);
      expect(result).toBeGreaterThanOrEqual(5);
    });

    it("should return maximum 60 minutes", () => {
      // Very far locations
      const driverLocation = { lat: 35.7796, lng: -78.6382 }; // Raleigh
      const customerLocation = { lat: 36.1627, lng: -86.7816 }; // Nashville (~600 km)
      
      const result = calculateETA(driverLocation, customerLocation);
      expect(result).toBeLessThanOrEqual(60);
    });

    it("should handle same location", () => {
      const driverLocation = { lat: 35.7796, lng: -78.6382 };
      const customerLocation = { lat: 35.7796, lng: -78.6382 };
      
      const result = calculateETA(driverLocation, customerLocation);
      expect(result).toBe(5); // Minimum 5 minutes
    });
  });

  describe("formatETA", () => {
    it("should return 'Calculating...' for null/undefined", () => {
      expect(formatETA(null)).toBe("Calculating...");
      expect(formatETA(undefined)).toBe("Calculating...");
    });

    it("should format single minute correctly", () => {
      expect(formatETA(1)).toBe("1 minute");
    });

    it("should format multiple minutes correctly", () => {
      expect(formatETA(15)).toBe("15 minutes");
      expect(formatETA(30)).toBe("30 minutes");
      expect(formatETA(45)).toBe("45 minutes");
    });

    it("should format exactly 1 hour correctly", () => {
      expect(formatETA(60)).toBe("1 hour");
    });

    it("should format hours with minutes correctly", () => {
      expect(formatETA(90)).toBe("1 hour 30 minutes");
      expect(formatETA(125)).toBe("2 hours 5 minutes");
    });

    it("should format multiple hours correctly", () => {
      expect(formatETA(120)).toBe("2 hours");
      expect(formatETA(180)).toBe("3 hours");
    });

    it("should handle edge cases", () => {
      expect(formatETA(0)).toBe("0 minutes");
      expect(formatETA(59)).toBe("59 minutes");
      expect(formatETA(61)).toBe("1 hour 1 minute");
    });
  });
});


