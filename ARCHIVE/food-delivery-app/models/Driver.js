import { Schema, model } from "mongoose";

const driverSchema = new Schema({
  loginId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // links to User
  name: { type: String, required: true },
  phone: { type: String, required: true },
  vehicleType: { type: String, enum: ["bike", "car", "scooter"], required: true },
  vehicleNumber: { type: String, required: true },
  licenseNumber: { type: String },
  currentLocation: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  isAvailable: { type: Boolean, default: true },
  ratings: { type: Number, default: 5 },
//   completedOrders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
  vehicleCapacity: { type: Number, default: 1 },
});

driverSchema.index({ currentLocation: "2dsphere" });

export default model("Driver", driverSchema);
