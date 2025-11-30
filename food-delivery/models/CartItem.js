import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, default: 1, min: 1 }
}, { timestamps: true });

export default mongoose.model('CartItem', cartItemSchema);
