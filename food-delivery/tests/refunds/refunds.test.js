import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import mongoose from "mongoose";
import Order from "../../models/Order.js";
import Refund from "../../models/Refund.js";
import RestaurantAdmin from "../../models/RestaurantAdmin.js";
import Restaurant from "../../models/Restaurant.js";
import bcrypt from "bcrypt";

describe("Refund Management System", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await Refund.deleteMany({});
    await Order.deleteMany({});
    await RestaurantAdmin.deleteMany({});
  });

  describe("POST /api/refunds/request", () => {
    it("should create a refund request for a valid order", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        deliveryFee: 2,
        total: 12,
        status: "delivered",
        paymentStatus: "paid",
      });

      const res = await agent
        .post("/api/refunds/request")
        .send({
          orderId: order._id.toString(),
          reason: "Food was cold"
        })
        .expect(201);

      expect(res.body.ok).toBe(true);
      expect(res.body.refundId).toBeDefined();
      expect(res.body.status).toBe("pending");

      // Verify refund was created
      const refund = await Refund.findById(res.body.refundId);
      expect(refund).toBeTruthy();
      expect(refund.amount).toBe(12);
      expect(refund.reason).toBe("Food was cold");
      expect(refund.status).toBe("pending");
    });

    it("should return 401 when not logged in", async () => {
      const unauthAgent = await newAgent();
      await unauthAgent
        .post("/api/refunds/request")
        .send({
          orderId: "64b000000000000000000000",
          reason: "Test reason"
        })
        .expect(401);
    });

    it("should return 400 when orderId or reason is missing", async () => {
      await registerAndLoginCustomer(agent);

      await agent
        .post("/api/refunds/request")
        .send({
          reason: "Test reason"
        })
        .expect(400);

      await agent
        .post("/api/refunds/request")
        .send({
          orderId: "64b000000000000000000000"
        })
        .expect(400);
    });

    it("should return 404 when order not found", async () => {
      await registerAndLoginCustomer(agent);

      await agent
        .post("/api/refunds/request")
        .send({
          orderId: "64b000000000000000000000",
          reason: "Test reason"
        })
        .expect(404);
    });

    it("should return 403 when order doesn't belong to user", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: "64b000000000000000000001", // Different user
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      await agent
        .post("/api/refunds/request")
        .send({
          orderId: order._id.toString(),
          reason: "Test reason"
        })
        .expect(403);
    });

    it("should return 400 when refund already exists", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      // Create first refund
      await agent
        .post("/api/refunds/request")
        .send({
          orderId: order._id.toString(),
          reason: "First reason"
        })
        .expect(201);

      // Try to create duplicate
      const res = await agent
        .post("/api/refunds/request")
        .send({
          orderId: order._id.toString(),
          reason: "Second reason"
        })
        .expect(400);

      expect(res.body.error).toContain("already exists");
    });

    it("should allow refund for order within 24 hours", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      });

      const res = await agent
        .post("/api/refunds/request")
        .send({
          orderId: order._id.toString(),
          reason: "Test reason"
        })
        .expect(201);

      expect(res.body.ok).toBe(true);
    });
  });

  describe("GET /api/refunds", () => {
    it("should return user's refund requests", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order1 = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Item 1", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      const order2 = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Item 2", price: 15, quantity: 1 }],
        subtotal: 15,
        total: 15,
        status: "delivered",
        paymentStatus: "paid",
      });

      const refund1 = await Refund.create({
        orderId: order1._id,
        userId: customer._id,
        amount: 10,
        reason: "Reason 1",
        status: "pending",
        requestedAt: new Date(Date.now() - 1000) // Older
      });

      const refund2 = await Refund.create({
        orderId: order2._id,
        userId: customer._id,
        amount: 15,
        reason: "Reason 2",
        status: "approved",
        requestedAt: new Date() // Newer
      });

      const res = await agent
        .get("/api/refunds")
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // Should be sorted by requestedAt desc (newest first)
      const reasons = res.body.map(r => r.reason);
      expect(reasons).toContain("Reason 1");
      expect(reasons).toContain("Reason 2");
      expect(res.body[0].reason).toBe("Reason 2"); // Newer one first
    });

    it("should return 401 when not logged in", async () => {
      const unauthAgent = await newAgent();
      await unauthAgent
        .get("/api/refunds")
        .expect(401);
    });
  });

  describe("GET /api/refunds/:id", () => {
    it("should return refund details for owner", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      const refund = await Refund.create({
        orderId: order._id,
        userId: customer._id,
        amount: 10,
        reason: "Test reason",
        status: "pending"
      });

      const res = await agent
        .get(`/api/refunds/${refund._id.toString()}`)
        .expect(200);

      expect(res.body._id).toBe(refund._id.toString());
      expect(res.body.reason).toBe("Test reason");
      expect(res.body.amount).toBe(10);
    });

    it("should return 404 when refund not found", async () => {
      await registerAndLoginCustomer(agent);
      await agent
        .get("/api/refunds/64b000000000000000000000")
        .expect(404);
    });

    it("should return 403 when user is not owner or admin", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: "64b000000000000000000001", // Different user
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      const refund = await Refund.create({
        orderId: order._id,
        userId: "64b000000000000000000001",
        amount: 10,
        reason: "Test reason",
        status: "pending"
      });

      await agent
        .get(`/api/refunds/${refund._id.toString()}`)
        .expect(403);
    });
  });

  describe("POST /api/refunds/:id/approve", () => {
    it("should approve a pending refund", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();
      const passwordHash = await bcrypt.hash("testpass123", 10);

      const admin = await RestaurantAdmin.create({
        email: `admin-${Date.now()}@restaurant.com`, // Unique email
        passwordHash,
        restaurantId: restaurant._id
      });

      // Login as restaurant admin
      const loginRes = await agent
        .post("/api/restaurant-auth/login")
        .send({
          email: admin.email,
          password: "testpass123"
        })
        .expect(200);
      
      // Ensure session is saved
      await agent.get("/api/restaurant-auth/me").expect(200);

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      const refund = await Refund.create({
        orderId: order._id,
        userId: customer._id,
        amount: 10,
        reason: "Test reason",
        status: "pending"
      });

      const res = await agent
        .post(`/api/refunds/${refund._id.toString()}/approve`)
        .send({ notes: "Approved by admin" })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.message).toContain("approved");

      // Verify refund status updated
      const updatedRefund = await Refund.findById(refund._id);
      expect(updatedRefund.status).toBe("approved");
      expect(updatedRefund.processedAt).toBeDefined();
      expect(updatedRefund.notes).toBe("Approved by admin");

      // Verify order payment status updated
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.paymentStatus).toBe("refunded");
      expect(updatedOrder.refundedAt).toBeDefined();
    });

    it("should return 401 when not logged in as admin", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      const refund = await Refund.create({
        orderId: order._id,
        userId: customer._id,
        amount: 10,
        reason: "Test reason",
        status: "pending"
      });

      // Customer cannot approve refunds - use new agent without restaurant session
      const customerAgent = await newAgent();
      await registerAndLoginCustomer(customerAgent); // Login as customer only
      
      await customerAgent
        .post(`/api/refunds/${refund._id.toString()}/approve`)
        .expect(401);
    });

    it("should return 400 when refund is already processed", async () => {
      const restaurant = await createRestaurant();
      const passwordHash = await bcrypt.hash("testpass123", 10);

      const admin = await RestaurantAdmin.create({
        email: `admin-${Date.now()}@restaurant.com`, // Unique email
        passwordHash,
        restaurantId: restaurant._id
      });

      await agent
        .post("/api/restaurant-auth/login")
        .send({
          email: admin.email,
          password: "testpass123"
        })
        .expect(200);
      
      // Ensure session is saved
      await agent.get("/api/restaurant-auth/me").expect(200);

      const refund = await Refund.create({
        orderId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        amount: 10,
        reason: "Test reason",
        status: "approved" // Already approved
      });

      await agent
        .post(`/api/refunds/${refund._id.toString()}/approve`)
        .expect(400);
    });
  });

  describe("POST /api/refunds/:id/reject", () => {
    it("should reject a pending refund", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();
      const passwordHash = await bcrypt.hash("testpass123", 10);

      const admin = await RestaurantAdmin.create({
        email: `admin-${Date.now()}@restaurant.com`, // Unique email
        passwordHash,
        restaurantId: restaurant._id
      });

      await agent
        .post("/api/restaurant-auth/login")
        .send({
          email: admin.email,
          password: "testpass123"
        })
        .expect(200);
      
      // Ensure session is saved
      await agent.get("/api/restaurant-auth/me").expect(200);

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      const refund = await Refund.create({
        orderId: order._id,
        userId: customer._id,
        amount: 10,
        reason: "Test reason",
        status: "pending"
      });

      const res = await agent
        .post(`/api/refunds/${refund._id.toString()}/reject`)
        .send({ notes: "Rejected: Invalid reason" })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.message).toContain("rejected");

      // Verify refund status updated
      const updatedRefund = await Refund.findById(refund._id);
      expect(updatedRefund.status).toBe("rejected");
      expect(updatedRefund.processedAt).toBeDefined();
      expect(updatedRefund.notes).toBe("Rejected: Invalid reason");
    });
  });
});

