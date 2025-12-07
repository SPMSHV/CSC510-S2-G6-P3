import express from "express";
import mongoose from "mongoose";
import OrderRating from "../models/OrderRating.js";
import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";

const router = express.Router();

/**
 * POST /api/ratings
 * Submit a rating for an order
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.session.customerId;
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { orderId, rating, foodRating, deliveryRating, comment } = req.body;
    
    if (!orderId || !rating) {
      return res.status(400).json({ error: "orderId and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Verify order belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({ error: "Unauthorized to rate this order" });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({ error: "Can only rate delivered orders" });
    }

    // Check if already rated
    const existingRating = await OrderRating.findOne({ orderId });
    if (existingRating) {
      return res.status(400).json({ error: "Order already rated" });
    }

    // Create rating
    const orderRating = await OrderRating.create({
      orderId,
      userId,
      restaurantId: order.restaurantId,
      rating,
      foodRating: foodRating || null,
      deliveryRating: deliveryRating || null,
      comment: comment || null
    });

    // Update restaurant average rating
    await updateRestaurantRating(order.restaurantId);

    res.status(201).json({
      ok: true,
      message: "Rating submitted successfully",
      rating: orderRating
    });
  } catch (err) {
    console.error("Error creating rating:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/ratings/order/:orderId
 * Get rating for a specific order
 */
router.get("/order/:orderId", async (req, res) => {
  try {
    const userId = req.session.customerId;
    const { orderId } = req.params;

    const rating = await OrderRating.findOne({ orderId })
      .populate('userId', 'name')
      .lean();

    if (!rating) {
      return res.status(404).json({ error: "Rating not found" });
    }

    // Check authorization
    if (userId && String(rating.userId._id) !== String(userId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(rating);
  } catch (err) {
    console.error("Error fetching rating:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/ratings/restaurant/:restaurantId
 * Get all ratings for a restaurant
 */
router.get("/restaurant/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const ratings = await OrderRating.find({ restaurantId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    const total = await OrderRating.countDocuments({ restaurantId });

    res.json({
      ratings,
      total,
      average: await calculateAverageRating(restaurantId)
    });
  } catch (err) {
    console.error("Error fetching restaurant ratings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/ratings/driver/:driverId
 * Get all delivery ratings for a driver
 */
router.get("/driver/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    console.log(`📊 Fetching ratings for driver: ${driverId}`);

    // Find all orders delivered by this driver
    // Mongoose will automatically convert string IDs to ObjectIds
    const orders = await Order.find({ 
      driverId: driverId,
      status: 'delivered'
    }).select('_id').lean();

    console.log(`📦 Found ${orders.length} delivered orders for driver`);

    if (orders.length === 0) {
      return res.json({
        ratings: [],
        total: 0,
        average: 0
      });
    }

    // Get order IDs - keep them as ObjectIds (they're already ObjectIds from the query)
    const orderIds = orders.map(o => o._id);

    // Find all ratings with delivery ratings for these orders
    const ratings = await OrderRating.find({
      orderId: { $in: orderIds },
      deliveryRating: { $ne: null }
    })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();

    console.log(`⭐ Found ${ratings.length} delivery ratings`);

    const total = await OrderRating.countDocuments({
      orderId: { $in: orderIds },
      deliveryRating: { $ne: null }
    });

    // Calculate average delivery rating using aggregation
    const avgResult = await OrderRating.aggregate([
      { 
        $match: { 
          orderId: { $in: orderIds },
          deliveryRating: { $ne: null }
        } 
      },
      { $group: { _id: null, avgRating: { $avg: "$deliveryRating" } } }
    ]);

    const average = avgResult.length > 0 ? Math.round(avgResult[0].avgRating * 10) / 10 : 0;

    res.json({
      ratings,
      total,
      average
    });
  } catch (err) {
    console.error("❌ Error fetching driver ratings:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/**
 * Helper: Update restaurant average rating
 */
async function updateRestaurantRating(restaurantId) {
  const average = await calculateAverageRating(restaurantId);
  await Restaurant.findByIdAndUpdate(restaurantId, {
    $set: { rating: average }
  });
}

/**
 * Helper: Calculate average rating for restaurant
 */
async function calculateAverageRating(restaurantId) {
  const restaurantObjectId = mongoose.Types.ObjectId.isValid(restaurantId) 
    ? new mongoose.Types.ObjectId(restaurantId) 
    : restaurantId;
    
  const result = await OrderRating.aggregate([
    { $match: { restaurantId: restaurantObjectId } },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } }
  ]);

  return result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
}

export default router;

