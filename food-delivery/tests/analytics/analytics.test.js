import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import Restaurant from "../../models/Restaurant.js";
import Order from "../../models/Order.js";
import OrderRating from "../../models/OrderRating.js";
import MenuItem from "../../models/MenuItem.js";

describe("Analytics Dashboard", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("GET /api/analytics/restaurant/:restaurantId", () => {
    it("should return restaurant analytics", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      // Create menu items
      const menuItem1 = await MenuItem.create({
        restaurantId: restaurant._id,
        name: "Burger",
        price: 10,
        isAvailable: true,
      });

      const menuItem2 = await MenuItem.create({
        restaurantId: restaurant._id,
        name: "Pizza",
        price: 15,
        isAvailable: true,
      });

      // Create orders
      const order1 = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [
          { menuItemId: menuItem1._id, name: "Burger", price: 10, quantity: 2 },
          { menuItemId: menuItem2._id, name: "Pizza", price: 15, quantity: 1 },
        ],
        subtotal: 35,
        deliveryFee: 2,
        total: 37,
        status: "delivered",
        paymentStatus: "paid",
      });

      const order2 = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: menuItem1._id, name: "Burger", price: 10, quantity: 1 }],
        subtotal: 10,
        deliveryFee: 2,
        total: 12,
        status: "preparing",
        paymentStatus: "paid",
      });

      // Create rating
      await OrderRating.create({
        orderId: order1._id,
        userId: customer._id,
        restaurantId: restaurant._id,
        rating: 5,
      });

      const res = await agent
        .get(`/api/analytics/restaurant/${restaurant._id.toString()}`)
        .expect(200);

      expect(res.body.restaurantId).toBe(restaurant._id.toString());
      expect(res.body.summary.totalOrders).toBe(2);
      expect(res.body.summary.totalRevenue).toBeGreaterThanOrEqual(37); // Only paid orders count
      expect(res.body.summary.averageRating).toBe(5);
      expect(res.body.summary.totalRatings).toBe(1);
      expect(res.body.popularItems.length).toBeGreaterThan(0);
    });

    it("should handle restaurant with no orders", async () => {
      const restaurant = await createRestaurant();

      const res = await agent
        .get(`/api/analytics/restaurant/${restaurant._id.toString()}`)
        .expect(200);

      expect(res.body.summary.totalOrders).toBe(0);
      expect(res.body.summary.totalRevenue).toBe(0);
    });
  });

  describe("GET /api/analytics/dashboard", () => {
    it("should return system-wide analytics", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant1 = await createRestaurant();
      const restaurant2 = await createRestaurant();

      // Create orders for different restaurants
      await Order.create({
        userId: customer._id,
        restaurantId: restaurant1._id,
        items: [{ menuItemId: restaurant1._id, name: "Item 1", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "delivered",
        paymentStatus: "paid",
      });

      await Order.create({
        userId: customer._id,
        restaurantId: restaurant2._id,
        items: [{ menuItemId: restaurant2._id, name: "Item 2", price: 20, quantity: 1 }],
        subtotal: 20,
        total: 20,
        status: "delivered",
        paymentStatus: "paid",
      });

      const res = await agent
        .get("/api/analytics/dashboard")
        .expect(200);

      expect(res.body.summary.totalRestaurants).toBeGreaterThanOrEqual(2);
      expect(res.body.summary.totalOrders).toBeGreaterThanOrEqual(2);
      expect(res.body.summary.totalRevenue).toBeGreaterThanOrEqual(30);
      expect(res.body.topRestaurants).toBeDefined();
    });
  });
});

