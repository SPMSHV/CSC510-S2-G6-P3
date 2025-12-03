import express from "express";
import mongoose from "mongoose";

import Order from "../models/Order.js";
import CartItem from "../models/CartItem.js";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";   // correct relative path
import Coupon from "../models/Coupon.js";
import Driver from "../models/Driver.js";
import CustomerAuth from "../models/CustomerAuth.js";
import { calculateETA, formatETA } from "../utils/etaCalculator.js";
import { sendOrderConfirmationEmail } from "../utils/emailService.js";

const router = express.Router();

/**
 * GET /api/orders
 * Fetch all orders for the logged-in customer
 */
router.get("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const orders = await Order.find({ userId: customerId })
      .populate("items.menuItemId")
      .sort({ createdAt: -1 })
      .lean();

    const enriched = orders.map((o) => ({
      ...o,
      challengeStatus: o.challengeStatus || "NOT_STARTED",
      appliedCode: o.appliedCode || null,
      discount: o.discount ?? 0,     // ✅ Ensure always included
      deliveryFee: o.deliveryFee ?? 0,
      subtotal: o.subtotal ?? 0,
      total: o.total ?? 0,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/orders
 * Place a new order (optionally for selected cart items via { itemIds })
 */
router.post("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ error: "Customer not logged in" });
    }

    // Optional subset: { itemIds: [...] }
    let itemIds = Array.isArray(req.body?.itemIds) ? req.body.itemIds : null;
    if (itemIds && itemIds.length) {
      // safely cast to ObjectIds
      itemIds = itemIds
        .filter(Boolean)
        .map((id) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (!itemIds.length) {
        return res.status(400).json({ error: "No matching items found to checkout" });
      }
    }

    // Build query: all items vs only selected ones
    const cartQuery = itemIds?.length
      ? { userId: customerId, _id: { $in: itemIds } }
      : { userId: customerId };

    const cartItems = await CartItem.find(cartQuery).lean();
    if (!cartItems.length) {
      return res.status(400).json({
        error: itemIds?.length ? "No matching items found to checkout" : "Cart is empty",
      });
    }

    // 🧩 Fetch authoritative menu data (both available & unavailable)
    const menuIds = cartItems.map((ci) => ci.menuItemId);
    const allMenuItems = await MenuItem.find({ _id: { $in: menuIds } }).lean();

    // 🛑 Detect unavailable/out-of-stock items (support both flags)
    const unavailableItems = allMenuItems.filter(
      (m) => m?.isAvailable === false || m?.inStock === false
    );
    if (unavailableItems.length) {
      const names = unavailableItems.map((m) => m?.name || "Unknown item");
      return res.status(400).json({
        error: "Some selected items are unavailable and were removed from your cart.",
        unavailableItems: names,
      });
    }

    // ✅ Only keep available items
    const menuItems = allMenuItems.filter((m) => m?.isAvailable !== false && m?.inStock !== false);
    const menuMap = new Map(menuItems.map((m) => [String(m._id), m]));

    // Derive restaurant IDs from menu items
    const restIdSet = new Set(
      cartItems
        .map((ci) => {
          const mi = menuMap.get(String(ci.menuItemId));
          return mi?.restaurantId ? String(mi.restaurantId) : undefined;
        })
        .filter(Boolean)
    );

    if (!restIdSet.size) {
      return res.status(400).json({ error: "Unable to determine restaurant for selected items" });
    }
    if (restIdSet.size > 1) {
      return res.status(400).json({ error: "Selected items must be from a single restaurant" });
    }

    const restaurantId = [...restIdSet][0];
    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    // ✅ Build order lines and compute totals
    let subtotal = 0;
    const items = cartItems.map((ci) => {
      const mi = menuMap.get(String(ci.menuItemId));
      const price = Number(mi?.price ?? 0);
      const qty = Number(ci.quantity ?? 1);
      subtotal += price * qty;

      return {
        menuItemId: ci.menuItemId,
        name: mi?.name || "Item",
        price,
        quantity: qty,
      };
    });

    const deliveryFee = Number(restaurant.deliveryFee ?? 0);

    let discount = 0;
    let appliedCode = null;
    try {
      const coupons = await Coupon.find({
        userId: customerId,
        applied: false,
        expiresAt: { $gt: new Date() },
      });
      if (coupons.length) {
        coupons.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
        const best = coupons[0];
        // Calculate discount with proper decimal precision (round to 2 decimal places)
        discount = Math.round((subtotal * (best.discountPct / 100)) * 100) / 100;
        appliedCode = best.code;
        best.applied = true;
        await best.save();
      }
    } catch (e) {
      console.warn("⚠️ Coupon lookup failed:", e.message);
    }

    const total = subtotal + deliveryFee - discount;

    // Get delivery address from request body (if provided) or use customer's default address
    const { deliveryAddress } = req.body || {};
    let deliveryLocation = deliveryAddress?.trim();
    
    // If no delivery address provided, try to use customer's registered address as fallback
    if (!deliveryLocation) {
      const customer = await CustomerAuth.findById(customerId).lean();
      deliveryLocation = customer?.address || null;
    }
    
    // If still no address, return error (delivery address is required)
    if (!deliveryLocation) {
      return res.status(400).json({ error: "Delivery address is required. Please provide a delivery address when placing your order." });
    }

    // ✅ Create order document
    const order = await Order.create({
      userId: customerId,
      restaurantId,
      items,
      subtotal,
      deliveryFee,
      discount,
      appliedCode,
      deliveryLocation, // Store customer's delivery address
      total,
      status: "placed",
      paymentStatus: "paid",
    });

    // 🧹 Clear checked-out items from cart
    if (itemIds?.length) {
      await CartItem.deleteMany({ userId: customerId, _id: { $in: itemIds } });
    } else {
      await CartItem.deleteMany({ userId: customerId });
    }

    // 📧 EMAIL: Send order confirmation
    const customer = await CustomerAuth.findById(customerId);
    if (customer?.email) {
      try {
        await sendOrderConfirmationEmail(
          customer.email,
          order._id.toString(),
          { total: order.total, items: items.length }
        );
      } catch (emailErr) {
        console.error("Email confirmation error:", emailErr);
        // Don't fail the request if email fails
      }
    }

    return res.status(201).json(order);
  } catch (err) {
    console.error("❌ Order error:", err);
    res.status(500).json({ error: err.message });
  }
});
// DELETE /api/orders -> delete ALL orders for current customer
router.delete("/", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Not logged in" });

    await Order.deleteMany({ userId: customerId });
    return res.json({ ok: true, message: "Order history cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id -> delete ONE order (owned by current customer)
router.delete("/:id", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) return res.status(401).json({ error: "Not logged in" });

    const { id } = req.params;
    const result = await Order.deleteOne({ _id: id, userId: customerId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({ ok: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗺️ GEOLOCATION: Get real-time order tracking with driver location
router.get("/:id/tracking", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    const driverId = req.session.driverId;
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('driverId', 'fullName currentLocation lastLocationUpdate')
      .populate('userId', 'address')
      .populate('restaurantId', 'name address')
      .lean();

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check authorization: only order owner or assigned driver can view tracking
    const isOwner = customerId && String(order.userId._id || order.userId) === String(customerId);
    const isDriver = driverId && order.driverId && String(order.driverId._id || order.driverId) === String(driverId);

    if (!isOwner && !isDriver) {
      return res.status(403).json({ error: "Unauthorized to view this order" });
    }

    // Get driver location
    let driverLocation = null;
    let eta = null;
    let etaFormatted = "Not available";
    let driverName = null;
    let lastLocationUpdate = null;

    if (order.driverId) {
      // Get the driver ID (handle both populated and non-populated cases)
      const driverIdValue = order.driverId._id || order.driverId;
      const driver = await Driver.findById(driverIdValue).lean();
      
      if (driver) {
        driverName = driver.fullName;
        lastLocationUpdate = driver.lastLocationUpdate;
        
        if (driver.currentLocation) {
          driverLocation = driver.currentLocation;
          
          // Get customer location (try to parse from address or use deliveryLocation)
          let customerLocation = null;
          if (order.userId && order.userId.address) {
            // For now, we'll use a default location or try to geocode
            // In a real implementation, you'd geocode the address
            customerLocation = order.deliveryLocation || order.userId.address;
          }

          // Calculate ETA
          if (customerLocation && typeof customerLocation === 'object' && customerLocation.lat && customerLocation.lng) {
            eta = calculateETA(driverLocation, customerLocation);
            etaFormatted = formatETA(eta);
          } else {
            // If customer location is a string, use default estimate based on order status
            // More accurate defaults based on status
            if (order.status === 'ready_for_pickup') {
              eta = 20; // Driver needs to pick up first
            } else if (order.status === 'out_for_delivery') {
              eta = 15; // Already picked up, on the way
            } else {
              eta = 25; // Still preparing
            }
            etaFormatted = formatETA(eta);
          }

          // Update estimated delivery time in order
          if (eta) {
            const estimatedTime = new Date(Date.now() + eta * 60 * 1000);
            await Order.findByIdAndUpdate(id, {
              $set: { estimatedDeliveryTime: estimatedTime }
            });
          }
        }
      }
    }

    res.json({
      orderId: order._id,
      status: order.status,
      driver: order.driverId ? {
        name: driverName || (order.driverId.fullName || 'Driver'),
        location: driverLocation,
        lastUpdate: lastLocationUpdate,
        hasLocation: !!driverLocation
      } : null,
      customer: {
        address: order.userId?.address || order.deliveryLocation
      },
      restaurant: {
        name: order.restaurantId?.name,
        address: order.restaurantId?.address
      },
      eta: eta,
      etaFormatted: etaFormatted,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      locationHistory: order.driverLocationHistory || [],
      message: !order.driverId 
        ? "No driver assigned yet. Tracking will be available once a driver accepts your order."
        : !driverLocation 
        ? "Driver location not available. Make sure the driver is online and has shared their location."
        : null
    });
  } catch (err) {
    console.error("Error fetching order tracking:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
