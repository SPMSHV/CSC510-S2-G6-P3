import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cuisine: { type: String, required: true },
  imageUrl: { type: String },
  rating: { type: Number, default: 4.5 },
  deliveryFee: { type: Number, default: 0 },
  etaMins: { type: Number, default: 30 },
  address: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Restaurant', restaurantSchema);
