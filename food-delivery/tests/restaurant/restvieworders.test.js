import {
  setupTestDB,
  closeTestDB,
  registerAndLoginRestaurant,
} from "../helpers/testUtils.js";

import mongoose from "mongoose";
import Order from "../../models/Order.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("GET /api/restaurant-dashboard/orders (Restaurant views orders)", () => {
  it("should fetch orders for a given restaurant", async () => {
    console.log("🚀 Starting Restaurant View Orders test");

    // 1️⃣ Register + login a restaurant to get a valid restaurantId
    const { restaurant } = await registerAndLoginRestaurant(agent);
    console.log("🏢 Logged in restaurant:", restaurant);

    // 2️⃣ Create dummy order for this restaurant
    const userId = new mongoose.Types.ObjectId();
    const menuItemId = new mongoose.Types.ObjectId();

    await Order.create({
      userId,
      restaurantId: restaurant._id,
      items: [{ menuItemId, name: "Pizza", price: 12.99, quantity: 1 }],
      subtotal: 12.99,
      total: 12.99,
      status: "placed",
    });
    console.log("📦 Created order for restaurant:", restaurant._id.toString());

    // 3️⃣ Fetch orders as the same logged-in restaurant
    const res = await agent
      .get(`/api/restaurant-dashboard/orders?restaurantId=${restaurant._id}`)
      .expect(200);

    console.log("📨 Response:", res.status, res.body.length, "orders found");

    // 4️⃣ Assertions
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("status", "placed");
  });
});
