import express from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import OrderRating from "../models/OrderRating.js";

const router = express.Router();

/**
 * GET /api/analytics/restaurant/:restaurantId
 * Get analytics for a restaurant
 */
router.get("/restaurant/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { startDate, endDate } = req.query;

    // Convert restaurantId to ObjectId if needed
    const restaurantObjectId = mongoose.Types.ObjectId.isValid(restaurantId) 
      ? new mongoose.Types.ObjectId(restaurantId) 
      : restaurantId;

    // Date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Total orders
    const totalOrders = await Order.countDocuments({
      restaurantId: restaurantObjectId,
      ...dateFilter
    });

    // Total revenue
      
    const revenueResult = await Order.aggregate([
      {
        $match: {
          restaurantId: restaurantObjectId,
          paymentStatus: 'paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          averageOrderValue: { $avg: "$total" }
        }
      }
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    const averageOrderValue = revenueResult[0]?.averageOrderValue || 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $match: { restaurantId: restaurantObjectId, ...dateFilter }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Popular menu items
    const popularItems = await Order.aggregate([
      {
        $match: { restaurantId: restaurantObjectId, ...dateFilter }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.menuItemId",
          name: { $first: "$items.name" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    // Average rating
    const ratingResult = await OrderRating.aggregate([
      {
        $match: { restaurantId: restaurantObjectId }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    res.json({
      restaurantId: restaurantId.toString(),
      period: { startDate, endDate },
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        averageRating: ratingResult[0]?.averageRating || 0,
        totalRatings: ratingResult[0]?.totalRatings || 0
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      popularItems
    });
  } catch (err) {
    console.error("Error fetching restaurant analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get overall dashboard analytics (admin view)
 */
router.get("/dashboard", async (req, res) => {
  try {
    // Total restaurants
    const totalRestaurants = await Restaurant.countDocuments();

    // Total orders
    const totalOrders = await Order.countDocuments();

    // Total revenue
    const revenueResult = await Order.aggregate([
      {
        $match: { paymentStatus: 'paid' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" }
        }
      }
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Top restaurants by revenue
    const topRestaurants = await Order.aggregate([
      {
        $match: { paymentStatus: 'paid' }
      },
      {
        $group: {
          _id: "$restaurantId",
          totalRevenue: { $sum: "$total" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          restaurantId: '$_id',
          restaurantName: '$restaurant.name',
          totalRevenue: 1,
          orderCount: 1
        }
      }
    ]);

    res.json({
      summary: {
        totalRestaurants,
        totalOrders,
        totalRevenue: revenueResult[0]?.totalRevenue || 0
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topRestaurants
    });
  } catch (err) {
    console.error("Error fetching dashboard analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

