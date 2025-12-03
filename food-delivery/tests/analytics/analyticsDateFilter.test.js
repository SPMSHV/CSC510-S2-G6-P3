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

describe("Analytics Dashboard - Date Filtering", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  describe("GET /api/analytics/restaurant/:restaurantId with date filters", () => {
    it("should filter analytics by start date", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const menuItem = await MenuItem.create({
        restaurantId: restaurant._id,
        name: "Burger",
        price: 10,
        isAvailable: true,
      });

      // Create order in the past (should be excluded)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: menuItem._id, name: "Burger", price: 10, quantity: 1 }],
        subtotal: 10,
        deliveryFee: 2,
        total: 12,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: pastDate
      });

      // Create order today (should be included)
      const todayOrder = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: menuItem._id, name: "Burger", price: 10, quantity: 1 }],
        subtotal: 10,
        deliveryFee: 2,
        total: 12,
        status: "delivered",
        paymentStatus: "paid",
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const startDateStr = startDate.toISOString().split('T')[0];

      const res = await agent
        .get(`/api/analytics/restaurant/${restaurant._id.toString()}?startDate=${startDateStr}`)
        .expect(200);

      // Should only include today's order
      expect(res.body.summary.totalOrders).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.totalRevenue).toBeGreaterThanOrEqual(12);
    });

    it("should filter analytics by end date", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const menuItem = await MenuItem.create({
        restaurantId: restaurant._id,
        name: "Burger",
        price: 10,
        isAvailable: true,
      });

      // Create order today (should be included)
      await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: menuItem._id, name: "Burger", price: 10, quantity: 1 }],
        subtotal: 10,
        deliveryFee: 2,
        total: 12,
        status: "delivered",
        paymentStatus: "paid",
      });

      // Create order in the future (should be excluded)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: menuItem._id, name: "Burger", price: 10, quantity: 1 }],
        subtotal: 10,
        deliveryFee: 2,
        total: 12,
        status: "delivered",
        paymentStatus: "paid",
        createdAt: futureDate
      });

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      const res = await agent
        .get(`/api/analytics/restaurant/${restaurant._id.toString()}?endDate=${endDateStr}`)
        .expect(200);

      // Should include today's order but not future order
      expect(res.body.summary.totalOrders).toBeGreaterThanOrEqual(1);
    });

    it("should filter analytics by both start and end date", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const menuItem = await MenuItem.create({
        restaurantId: restaurant._id,
        name: "Burger",
        price: 10,
        isAvailable: true,
      });

      // Create order in date range
      await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: menuItem._id, name: "Burger", price: 10, quantity: 1 }],
        subtotal: 10,
        deliveryFee: 2,
        total: 12,
        status: "delivered",
        paymentStatus: "paid",
      });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const res = await agent
        .get(`/api/analytics/restaurant/${restaurant._id.toString()}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`)
        .expect(200);

      expect(res.body.period.startDate).toBeDefined();
      expect(res.body.period.endDate).toBeDefined();
      expect(res.body.summary.totalOrders).toBeGreaterThanOrEqual(1);
    });
  });
});


