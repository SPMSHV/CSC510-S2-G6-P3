import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, required: true, index: true },
  code: { type: String, required: true, unique: true },
  label: { type: String, default: "" },
  discountPct: { type: Number, default: 0 },
  applied: { type: Boolean, default: false },
  expiresAt: { type: Date, index: true }
}, { timestamps: true });

export default mongoose.model("Coupon", CouponSchema);
