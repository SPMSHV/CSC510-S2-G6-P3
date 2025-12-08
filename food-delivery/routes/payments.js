// routes/payments.js
import express from "express";
import Cart from "../models/CartItem.js";
import Order from "../models/Order.js";
import Coupon from "../models/Coupon.js";
import { auditLog } from "../middleware/audit.js";
import { logger } from "../config/logger.js";

const router = express.Router();

/**
 * POST /api/payments/mock-checkout
 * Simulates a successful payment and creates a paid order
 */
router.post("/mock-checkout", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    //Fetch the user's cart and populate both menuItem and restaurant
    const items = await Cart.find({ userId: customerId })
      .populate({
        path: "menuItemId",
        populate: { path: "restaurantId", select: "name deliveryFee etaMins" }
      });

    if (!items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, i) => sum + i.menuItemId.price * i.quantity, 0);
    const deliveryFee = 0;

    let appliedCode = null;
    let discount = 0;
    const { couponCode } = req.body || {};
    
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        userId: customerId,
        applied: false,
        expiresAt: { $gt: new Date() },
      });
      if (coupon) {
        appliedCode = coupon.code;
        // Apply % discount on subtotal with proper decimal precision (round to 2 decimal places)
        discount = Math.round((subtotal * (coupon.discountPct || 0) / 100) * 100) / 100;
      }
    }

    const finalTotal = Math.max(subtotal + deliveryFee - discount, 0);

    // Create an order: "placed" + "paid"
    const order = await Order.create({
      userId: customerId,
      restaurantId: items[0].menuItemId.restaurantId._id, // ensure it's the ID
      items: items.map((i) => ({
        menuItemId: i.menuItemId._id,
        name: i.menuItemId.name,
        price: i.menuItemId.price,
        quantity: i.quantity
      })),
      subtotal,
      deliveryFee,
      discount,
      appliedCode,
      total: finalTotal,
      status: "placed",         // valid enum
      paymentStatus: "paid"     // now tracked separately
    });

    //Clear the cart after successful order
    await Cart.deleteMany({ userId: customerId });

    // Mark coupon as applied if one was used
    if (appliedCode) {
      await Coupon.updateOne(
        { code: appliedCode, userId: customerId },
        { $set: { applied: true } }
      );
    }

    // 🔒 SECURITY: Audit log and secure logging
    await auditLog("PAYMENT_COMPLETED", {
      userId: customerId,
      orderId: order._id,
      amount: finalTotal,
      discount: discount,
      couponCode: appliedCode
    }, req);

    logger.payment("Payment completed successfully", {
      userId: customerId,
      orderId: order._id,
      amount: finalTotal
    });

    return res.json({
      ok: true,
      message: "Payment successful! Your order has been placed.",
      orderId: order._id,
      discountApplied: appliedCode
        ? `Coupon ${appliedCode} applied: -$${discount}`
        : null,
    });
  } catch (err) {
    logger.error("Payment error", { error: err.message, stack: err.stack });
    console.error("Payment error:", err);
    return res.status(500).json({ error: err.message || "Payment failed" });
  }
});

/**
 * POST /api/payments/verify/:orderId
 * Verify payment status for an order
 */
router.post("/verify/:orderId", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (String(order.userId) !== String(customerId)) {
      return res.status(403).json({ error: "Unauthorized to verify this order" });
    }

    // Verify payment status
    const isPaid = order.paymentStatus === 'paid';
    const amountMatches = order.total > 0;

    const verification = {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      isPaid,
      amount: order.total,
      amountMatches,
      verified: isPaid && amountMatches,
      paidAt: order.createdAt // In a real system, this would be a separate payment timestamp
    };

    // Audit log
    await auditLog("PAYMENT_VERIFIED", {
      userId: customerId,
      orderId: order._id,
      verified: verification.verified
    }, req);

    res.json({
      ok: true,
      verification
    });
  } catch (err) {
    logger.error("Payment verification error", { error: err.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/payments/status/:orderId
 * Get payment status for an order
 */
router.get("/status/:orderId", async (req, res) => {
  try {
    const customerId = req.session.customerId;
    if (!customerId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { orderId } = req.params;
    const order = await Order.findById(orderId).select('paymentStatus total userId');

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (String(order.userId) !== String(customerId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json({
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      amount: order.total,
      paid: order.paymentStatus === 'paid'
    });
  } catch (err) {
    logger.error("Error fetching payment status", { error: err.message });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
