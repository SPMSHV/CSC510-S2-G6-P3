import { Schema, model } from "mongoose";

const restaurantSchema = new Schema({
  loginId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // link to login
  restaurantName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String, required: true },
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  cuisine: { type: [String] }, // e.g., ["Italian", "Chinese"]
//   menu: [{
//     name: { type: String, required: true },
//     description: { type: String },
//     price: { type: Number, required: true },
//     category: { type: String }, // e.g., "Pizza", "Beverage"
//     image: { type: String } // URL to image
//   }],
  ratings: { type: Number, default: 5 },
  isOpen: { type: Boolean, default: true }, // open/closed status
//   orders: [{ type: Schema.Types.ObjectId, ref: "Order" }], // restaurant's order history
});

// Add geospatial index for location queries
restaurantSchema.index({ location: "2dsphere" });

export default model("Restaurant", restaurantSchema);
