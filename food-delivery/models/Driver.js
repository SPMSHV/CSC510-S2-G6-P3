// === Updated for Driver ===
import mongoose from "mongoose";

const driverSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  vehicleType: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  licenseNumber: { type: String, required: true },
  // 🗺️ GEOLOCATION: Optional location tracking fields
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  lastLocationUpdate: { type: Date, default: null }
});

// 🚀 PERFORMANCE: Add indexes
driverSchema.index({ isActive: 1 }); // Active drivers query
driverSchema.index({ lastLocationUpdate: -1 }); // Recent location updates

export default mongoose.model("Driver", driverSchema);
