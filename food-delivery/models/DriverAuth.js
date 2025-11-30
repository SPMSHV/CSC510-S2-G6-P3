// === Added for DriverAuth ===
import mongoose from "mongoose";

const driverAuthSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
});

export default mongoose.model("DriverAuth", driverAuthSchema);
