import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: String,
  price: Number,
  quantity: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerAuth', required: true, index: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  items: [orderItemSchema],
  discount:{ type: Number, default:0 },
  appliedCode: { type: String, default:null },
  subtotal: Number,
  deliveryFee: Number,
  deliveryLocation: String,
  deliveryPayment: Number,
  total: Number,
  deliveredAt: {type: Date},
  status: {
    type: String,
    enum: ['placed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'refunded'],
    default: 'placed'
  },
  // separate payment tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  refundedAt: { type: Date, default: null },
  
  challengeStatus: {
    type: String,
    enum: ["NOT_STARTED", "COMPLETED", "FAILED"],
    default: "NOT_STARTED"
  },
  appliedCode: { type: String, default: null },
  // 🗺️ GEOLOCATION: Optional location tracking fields
  estimatedDeliveryTime: { type: Date, default: null },
  driverLocationHistory: [{
    lat: { type: Number },
    lng: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }]

}, { timestamps: true });

// 🚀 PERFORMANCE: Add indexes for common queries
orderSchema.index({ userId: 1, createdAt: -1 }); // User's order history
orderSchema.index({ driverId: 1, status: 1 }); // Driver's active orders
orderSchema.index({ restaurantId: 1, status: 1 }); // Restaurant's orders by status
orderSchema.index({ status: 1, driverId: 1 }); // Available orders for drivers

export default mongoose.model('Order', orderSchema);
