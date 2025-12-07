import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import MenuItem from "../../models/MenuItem.js";
import CartItem from "../../models/CartItem.js";
import Coupon from "../../models/Coupon.js";
import Order from "../../models/Order.js";

describe("Payments Extended Tests", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await CartItem.deleteMany({});
    await Order.deleteMany({});
    await Coupon.deleteMany({});
  });

  describe("POST /api/payments/mock-checkout", () => {
    it("should require deliveryAddress", async () => {
      await registerAndLoginCustomer(agent);
      const customerId = await agent.get("/api/customer-auth/me").then(r => r.body.customerId);
      const rest = await createRestaurant();

      const item = await MenuItem.create({
        restaurantId: rest._id,
        name: "Burger",
        price: 10,
        isAvailable: true
      });

      await CartItem.create({
        userId: customerId,
        restaurantId: rest._id,
        menuItemId: item._id,
        quantity: 1
      });

      await agent
        .post("/api/payments/mock-checkout")
        .send({})
        .expect(400);
    });

    it("should create order with deliveryAddress", async () => {
      await registerAndLoginCustomer(agent);
      const customerId = await agent.get("/api/customer-auth/me").then(r => r.body.customerId);
      const rest = await createRestaurant();

      const item = await MenuItem.create({
        restaurantId: rest._id,
        name: "Burger",
        price: 10,
        isAvailable: true
      });

      await CartItem.create({
        userId: customerId,
        restaurantId: rest._id,
        menuItemId: item._id,
        quantity: 1
      });

      const res = await agent
        .post("/api/payments/mock-checkout")
        .send({
          deliveryAddress: "123 Main Street, Raleigh, NC 27601"
        })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.orderId).toBeDefined();

      // Verify order has deliveryLocation
      const order = await Order.findById(res.body.orderId);
      expect(order.deliveryLocation).toBe("123 Main Street, Raleigh, NC 27601");
    });

    it("should apply coupon discount correctly", async () => {
      await registerAndLoginCustomer(agent);
      const customerId = await agent.get("/api/customer-auth/me").then(r => r.body.customerId);
      const rest = await createRestaurant();

      const item = await MenuItem.create({
        restaurantId: rest._id,
        name: "Burger",
        price: 100, // $100 for easier calculation
        isAvailable: true
      });

      await CartItem.create({
        userId: customerId,
        restaurantId: rest._id,
        menuItemId: item._id,
        quantity: 1
      });

      await Coupon.create({
        userId: customerId,
        code: "TWENTYOFF",
        discountPct: 20,
        applied: false,
        expiresAt: new Date(Date.now() + 3600e3)
      });

      const res = await agent
        .post("/api/payments/mock-checkout")
        .send({
          couponCode: "TWENTYOFF",
          deliveryAddress: "123 Test St"
        })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.discountApplied).toContain("TWENTYOFF");
      expect(res.body.discountApplied).toContain("20"); // 20% of $100 = $20

      // Verify order has correct discount
      const order = await Order.findById(res.body.orderId);
      expect(order.discount).toBe(20);
      expect(order.appliedCode).toBe("TWENTYOFF");
    });

    it("should handle empty deliveryAddress", async () => {
      await registerAndLoginCustomer(agent);
      const customerId = await agent.get("/api/customer-auth/me").then(r => r.body.customerId);
      const rest = await createRestaurant();

      const item = await MenuItem.create({
        restaurantId: rest._id,
        name: "Burger",
        price: 10,
        isAvailable: true
      });

      await CartItem.create({
        userId: customerId,
        restaurantId: rest._id,
        menuItemId: item._id,
        quantity: 1
      });

      await agent
        .post("/api/payments/mock-checkout")
        .send({
          deliveryAddress: "   " // Only whitespace
        })
        .expect(400);
    });
  });

  describe("POST /api/payments/verify/:orderId", () => {
    it("should verify payment status for an order", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "placed",
        paymentStatus: "paid",
      });

      const res = await agent
        .post(`/api/payments/verify/${order._id.toString()}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.verification.verified).toBe(true);
      expect(res.body.verification.paymentStatus).toBe("paid");
    });

    it("should return 401 when not logged in", async () => {
      const unauthAgent = await newAgent();
      await unauthAgent
        .post("/api/payments/verify/64b000000000000000000000")
        .expect(401);
    });
  });

  describe("GET /api/payments/status/:orderId", () => {
    it("should return payment status for an order", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "placed",
        paymentStatus: "paid",
      });

      const res = await agent
        .get(`/api/payments/status/${order._id.toString()}`)
        .expect(200);

      expect(res.body.paymentStatus).toBe("paid");
      expect(res.body.orderId).toBe(order._id.toString());
    });

    it("should return 404 when order not found", async () => {
      await registerAndLoginCustomer(agent);
      await agent
        .get("/api/payments/status/64b000000000000000000000")
        .expect(404);
    });
  });
});

