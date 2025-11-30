import express from 'express';
import Order from '../models/Order.js';
import Driver from '../models/Driver.js';
import ChallengeSession from "../models/ChallengeSession.js";
const router = express.Router();

// PATCH /api/driver/active
router.patch("/active", async (req, res) => {
  try {
    const driverId = req.session.driverId;
    if (!driverId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive (boolean) required" });
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { isActive },
      { new: true }
    );

    res.json({ ok: true, isActive: driver.isActive });
  } catch (err) {
    console.error("❌ Error updating driver active state:", err);
    res.status(500).json({ error: err.message });
  }
});
// GET /api/driver/status → returns active state
router.get("/status", async (req, res) => {
  try {
    const driverId = req.session.driverId;
    if (!driverId) return res.status(401).json({ ok: false });

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ ok: false });

    res.json({ ok: true, isActive: driver.isActive });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/orders/new', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    if (!driverId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    //Fetch driver record to check active state
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    //If driver inactive, return empty list
    if (!driver.isActive) {
      return res.json([]); // no new orders shown
    }

    //If active, show available orders
    const orders = await Order.find({
      status: { $in: ["preparing", "ready_for_pickup"] },
      driverId: null
    })
      .populate('restaurantId', 'name address') // pickup location
      .populate('userId', 'name address');

    const updated = orders.map(o => ({
      ...o.toObject(),
      deliveryPayment: (o.deliveryPayment || 0) + 5, // default $5 per delivery
      restaurantLocation: o.restaurantId?.address || 'N/A',
      customerLocation: o.userId?.address || o.deliveryLocation || 'N/A'
    }));

    console.log('📦 Sending orders to driver dashboard:', updated);
    res.json(updated);
  } catch (err) {
    console.error("❌ Error fetching new orders:", err);
    res.status(500).send('Error fetching new orders');
  }
});


router.post('/orders/accept/:id', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, driverId: null },   // only if still unassigned
      { driverId, deliveryPayment: 5 },
      { new: true }
    );

    if (!order) {
      return res.status(400).json({ error: 'Order already taken by another driver' });
    }

    res.json({ message: 'Order accepted', order });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error accepting order');
  }
});



router.get('/orders/pending', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const orders = await Order.find({
      driverId,
      status: { $in: ['preparing', 'ready_for_pickup', 'out_for_delivery'] }
    })
      .populate('restaurantId', 'name address')
      .populate('userId', 'name address');
    const updated = orders.map(o => ({
      ...o.toObject(),
      deliveryPayment: o.deliveryPayment || 5,
      restaurantLocation: o.restaurantId?.address || 'N/A',
      customerLocation: o.userId?.address || o.deliveryLocation || 'N/A'
    }));
    res.json(updated);
  } catch (err) {
    res.status(500).send('Error fetching pending deliveries');
  }
});


// Mark order as delivered and sync with restaurant dashboard
router.post('/orders/delivered/:id', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    if (!driverId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Relax restriction — allow marking delivered even if restaurant missed "Out for Delivery"
    if (order.status === 'delivered') {
      return res.json({ message: 'Order already delivered', order });
    }

    // if it's still "preparing" or "ready_for_pickup", gently bump to "delivered"
    const allowedStatuses = ['preparing', 'ready_for_pickup', 'out_for_delivery'];
    if (!allowedStatuses.includes(order.status)) {
      console.warn(`⚠️ Order ${order._id} status ${order.status} force-updated to delivered`);
    }

    order.status = 'delivered';
    order.driverId = driverId;
    order.deliveredAt = new Date();

    await order.save();

    // Also expire any linked challenge session (Judge0 side)
    await ChallengeSession.updateMany(
      { orderId: order._id, status: "ACTIVE" },
      { $set: { status: "EXPIRED", expiresAt: new Date() } }
    );

    console.log(`✅ Order ${order._id} marked delivered by driver ${driverId}`);
    res.json({ ok: true, message: 'Order marked as delivered', order });
  } catch (err) {
    console.error("❌ Error marking delivered:", err);
    res.status(500).json({ error: 'Server error marking delivered' });
  }
});




router.get('/payments', async (req, res) => {
  try {
    const driverId = req.session.driverId;
    const { start, end } = req.query;
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() + 1);

    const payments = await Order.find({
      driverId,
      status: 'delivered',
      updatedAt: { $gte: startDate, $lt: endDate }
    }).select('deliveryPayment updatedAt');

    const total = payments.reduce((sum, o) => sum + o.deliveryPayment, 0);
    res.json({ total, payments });
  } catch (err) {
    res.status(500).send('Error fetching payments');
  }
});

// GET /api/driver/me  → returns driver info from session
router.get("/me", (req, res) => {
  if (!req.session.driverId) {
    return res.status(401).json({ ok: false, error: "Not logged in" });
  }

  res.json({
    ok: true,
    driverName: req.session.driverName,
    driverId: req.session.driverId,
  });
});


export default router;
