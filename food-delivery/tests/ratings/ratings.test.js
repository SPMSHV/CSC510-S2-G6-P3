import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import Order from "../../models/Order.js";
import OrderRating from "../../models/OrderRating.js";
import CustomerAuth from "../../models/CustomerAuth.js";

describe("Order Rating System", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  afterEach(async () => {
    await OrderRating.deleteMany({});
  });

  describe("POST /api/ratings", () => {
    it("should submit a rating for a delivered order", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      // Create a delivered order
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
        .post("/api/ratings")
        .send({
          orderId: order._id.toString(),
          rating: 5,
          foodRating: 5,
          deliveryRating: 4,
          comment: "Great food and fast delivery!",
        })
        .expect(201);

      expect(res.body.ok).toBe(true);
      expect(res.body.rating.rating).toBe(5);
      expect(res.body.rating.foodRating).toBe(5);
      expect(res.body.rating.deliveryRating).toBe(4);
      expect(res.body.rating.comment).toBe("Great food and fast delivery!");

      // Verify rating was saved
      const savedRating = await OrderRating.findOne({ orderId: order._id });
      expect(savedRating).toBeTruthy();
      expect(savedRating.rating).toBe(5);
    });

    it("should reject rating for non-delivered order", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "preparing",
        paymentStatus: "paid",
      });

      await agent
        .post("/api/ratings")
        .send({
          orderId: order._id.toString(),
          rating: 5,
        })
        .expect(400);
    });

    it("should reject duplicate ratings for the same order", async () => {
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

      // First rating
      await agent
        .post("/api/ratings")
        .send({
          orderId: order._id.toString(),
          rating: 5,
        })
        .expect(201);

      // Duplicate rating
      await agent
        .post("/api/ratings")
        .send({
          orderId: order._id.toString(),
          rating: 4,
        })
        .expect(400);
    });

    it("should reject rating without required fields", async () => {
      await agent
        .post("/api/ratings")
        .send({
          rating: 5,
        })
        .expect(400);
    });

    it("should reject invalid rating values", async () => {
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

      await agent
        .post("/api/ratings")
        .send({
          orderId: order._id.toString(),
          rating: 6, // Invalid: > 5
        })
        .expect(400);
    });
  });

  describe("GET /api/ratings/order/:orderId", () => {
    it("should get rating for a specific order", async () => {
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

      const rating = await OrderRating.create({
        orderId: order._id,
        userId: customer._id,
        restaurantId: restaurant._id,
        rating: 5,
        comment: "Excellent!",
      });

      const res = await agent
        .get(`/api/ratings/order/${order._id.toString()}`)
        .expect(200);

      expect(res.body.rating).toBe(5);
      expect(res.body.comment).toBe("Excellent!");
    });

    it("should return 404 for non-existent rating", async () => {
      const fakeOrderId = "64b000000000000000000000";
      await agent
        .get(`/api/ratings/order/${fakeOrderId}`)
        .expect(404);
    });
  });

  describe("GET /api/ratings/restaurant/:restaurantId", () => {
    it("should get all ratings for a restaurant", async () => {
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

      await OrderRating.create({
        orderId: order1._id,
        userId: customer._id,
        restaurantId: restaurant._id,
        rating: 5,
      });

      await OrderRating.create({
        orderId: order2._id,
        userId: customer._id,
        restaurantId: restaurant._id,
        rating: 4,
      });

      const res = await agent
        .get(`/api/ratings/restaurant/${restaurant._id.toString()}`)
        .expect(200);

      expect(res.body.ratings).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.average).toBe(4.5);
    });
  });
});

