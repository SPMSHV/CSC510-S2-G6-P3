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

describe("PATCH /api/restaurant-dashboard/orders/:id/status (Restaurant updates order)", () => {
  it("should update an order status successfully", async () => {
    console.log("🚀 Starting Restaurant Order Update test");

    // 1️⃣ Register + Login a real restaurant to get ID
    const { restaurant } = await registerAndLoginRestaurant(agent);
    console.log("🏢 Logged in restaurant:", restaurant);

    // 2️⃣ Create a dummy customer + order
    const userId = new mongoose.Types.ObjectId();
    const menuItemId = new mongoose.Types.ObjectId();

    const order = await Order.create({
      userId,
      restaurantId: restaurant._id,
      items: [{ menuItemId, name: "Burger", price: 9.99, quantity: 1 }],
      subtotal: 9.99,
      total: 9.99,
      status: "placed",
    });
    console.log("📦 Created order:", order._id.toString());

    // 3️⃣ Send PATCH request to update order status
    const res = await agent
      .patch(`/api/restaurant-dashboard/orders/${order._id}/status`)
      .send({ status: "preparing" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "preparing");

  });
});
