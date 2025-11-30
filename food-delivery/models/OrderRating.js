import mongoose from "mongoose";

const orderRatingSchema = new mongoose.Schema({
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true,
    unique: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CustomerAuth', 
    required: true,
    index: true 
  },
  restaurantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Restaurant', 
    required: true,
    index: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5,
    index: true 
  },
  foodRating: { type: Number, min: 1, max: 5, default: null },
  deliveryRating: { type: Number, min: 1, max: 5, default: null },
  comment: { type: String, maxlength: 500, default: null }
}, { timestamps: true });

// Index for restaurant ratings
orderRatingSchema.index({ restaurantId: 1, rating: -1 });

export default mongoose.model("OrderRating", orderRatingSchema);

