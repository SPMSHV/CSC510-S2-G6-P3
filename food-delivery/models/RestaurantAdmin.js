import mongoose from 'mongoose';
const restaurantAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }
}, { timestamps: true });
export default mongoose.model('RestaurantAdmin', restaurantAdminSchema);