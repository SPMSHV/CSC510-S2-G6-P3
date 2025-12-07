import express from "express";
import Refund from "../models/Refund.js";
import Order from "../models/Order.js";
import { auditLog } from "../middleware/audit.js";

const router = express.Router();

/**
 * POST /api/refunds/request
 * Request a refund for an order
 */
router.post("/request", async (req, res) => {
  try {
    const userId = req.session.customerId;
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { orderId, reason } = req.body;
    if (!orderId || !reason) {
      return res.status(400).json({ error: "orderId and reason are required" });
    }

    // Verify order belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({ error: "Unauthorized to request refund for this order" });
    }

    // Check if order is eligible for refund (not delivered too long ago, or within 24 hours)
    const orderAge = Date.now() - new Date(order.createdAt).getTime();
    const maxRefundTime = 24 * 60 * 60 * 1000; // 24 hours
    if (orderAge > maxRefundTime && order.status === 'delivered') {
      return res.status(400).json({ 
        error: "Refund can only be requested within 24 hours of order placement" 
      });
    }

    // Check if refund already exists
    const existingRefund = await Refund.findOne({ orderId, userId });
    if (existingRefund) {
      return res.status(400).json({ 
        error: "Refund request already exists for this order",
        refundId: existingRefund._id
      });
    }

    // Create refund request
    const refund = await Refund.create({
      orderId,
      userId,
      amount: order.total,
      reason,
      status: 'pending'
    });

    // Audit log
    await auditLog("REFUND_REQUESTED", {
      userId,
      orderId,
      refundId: refund._id,
      amount: order.total
    });

    res.status(201).json({
      ok: true,
      message: "Refund request submitted successfully",
      refundId: refund._id,
      status: refund.status
    });
  } catch (err) {
    console.error("Error creating refund request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/refunds
 * Get user's refund requests
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.session.customerId;
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const refunds = await Refund.find({ userId })
      .populate('orderId', 'status total createdAt')
      .sort({ requestedAt: -1 })
      .lean();

    res.json(refunds);
  } catch (err) {
    console.error("Error fetching refunds:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/refunds/:id
 * Get specific refund status
 */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.session.customerId;
    const restaurantAdminId = req.session.restaurantAdminId;
    const { id } = req.params;

    const refund = await Refund.findById(id)
      .populate('orderId')
      .populate('processedBy', 'email')
      .lean();

    if (!refund) {
      return res.status(404).json({ error: "Refund not found" });
    }

    // Check authorization
    const isOwner = userId && String(refund.userId) === String(userId);
    const isAdmin = restaurantAdminId || req.session.restaurantId; // Restaurant admin can view refunds for their orders

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(refund);
  } catch (err) {
    console.error("Error fetching refund:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/refunds/:id/approve
 * Approve refund (admin/restaurant only)
 */
router.post("/:id/approve", async (req, res) => {
  try {
    // Check for restaurant admin session (can be restaurantId or restaurantAdminId)
    const restaurantAdminId = req.session.restaurantAdminId || req.session.restaurantId;
    if (!restaurantAdminId) {
      return res.status(401).json({ error: "Not authorized. Restaurant admin access required." });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const refund = await Refund.findById(id).populate('orderId');
    if (!refund) {
      return res.status(404).json({ error: "Refund not found" });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund is already ${refund.status}` });
    }

    // Update refund status
    refund.status = 'approved';
    refund.processedAt = new Date();
    refund.processedBy = restaurantAdminId;
    if (notes) refund.notes = notes;
    await refund.save();

    // Update order payment status (add refund flag)
    await Order.findByIdAndUpdate(refund.orderId._id, {
      $set: { 
        paymentStatus: 'refunded',
        refundedAt: new Date()
      }
    });

    // Audit log
    await auditLog("REFUND_APPROVED", {
      refundId: refund._id,
      orderId: refund.orderId._id,
      amount: refund.amount,
      processedBy: restaurantAdminId
    });

    res.json({
      ok: true,
      message: "Refund approved successfully",
      refund
    });
  } catch (err) {
    console.error("Error approving refund:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/refunds/:id/reject
 * Reject refund (admin/restaurant only)
 */
router.post("/:id/reject", async (req, res) => {
  try {
    // Check for restaurant admin session (can be restaurantId or restaurantAdminId)
    const restaurantAdminId = req.session.restaurantAdminId || req.session.restaurantId;
    if (!restaurantAdminId) {
      return res.status(401).json({ error: "Not authorized. Restaurant admin access required." });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ error: "Refund not found" });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund is already ${refund.status}` });
    }

    // Update refund status
    refund.status = 'rejected';
    refund.processedAt = new Date();
    refund.processedBy = restaurantAdminId;
    if (notes) refund.notes = notes;
    await refund.save();

    // Audit log
    await auditLog("REFUND_REJECTED", {
      refundId: refund._id,
      orderId: refund.orderId,
      amount: refund.amount,
      processedBy: restaurantAdminId
    });

    res.json({
      ok: true,
      message: "Refund rejected",
      refund
    });
  } catch (err) {
    console.error("Error rejecting refund:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

