import mongoose from "mongoose";

const refundSchema = new mongoose.Schema({
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CustomerAuth', 
    required: true,
    index: true 
  },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    index: true
  },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
  processedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'RestaurantAdmin',
    default: null 
  },
  notes: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model("Refund", refundSchema);

