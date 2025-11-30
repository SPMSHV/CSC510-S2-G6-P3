// tests/customer/orderplace.test.js
import {
  setupTestDB,
  closeTestDB,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";

import mongoose from "mongoose";
import CartItem from "../../models/CartItem.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /api/orders (Customer places order)", () => {
  it("should place an order successfully using real register + login flow", async () => {
    console.log("🚀 Starting test for /api/orders");

    // 1️⃣ Register + login
    const { customer } = await registerAndLoginCustomer(agent);
    console.log("👤 Registered customer:", customer._id.toString());

    // Check session is alive
    const meRes = await agent.get("/api/customer-auth/me");
    console.log("🧾 /me response:", meRes.body);

    // 2️⃣ Create restaurant + menu item
    const restaurant = await createRestaurant();
    console.log("🏢 Created restaurant:", restaurant._id.toString());

    const menuRes = await agent
      .post("/api/menu")
      .send({
        name: "Margherita Pizza",
        price: 10.99,
        restaurantId: restaurant._id,
        description: "Classic pizza with cheese and tomato sauce",
      })
      .expect(201);

    const createdItem = menuRes.body.item;
    console.log("🍕 Created menu item:", createdItem._id);

    // 3️⃣ Add menu item to customer’s cart
    await CartItem.create({
      userId: customer._id.toString(),
      restaurantId: restaurant._id,
      menuItemId: createdItem._id,
      quantity: 2,
    });

    // Verify cart contents before placing order
    const cartItems = await CartItem.find({ userId: customer._id.toString() });
    console.log("🛒 Cart items found:", cartItems.length);
    cartItems.forEach((it, i) => {
      console.log(`   ${i + 1}. menuItemId=${it.menuItemId}, restaurantId=${it.restaurantId}`);
    });

    // 4️⃣ Place an order
    console.log("📦 Calling POST /api/orders now...");
    const res = await agent.post("/api/orders").send({});

    console.log("📨 Response status:", res.status);
    console.log("📨 Response body:", res.body);

    // 5️⃣ Validate order
    expect(res.status).toBe(201); // ✅ this will fail but print logs above
    expect(res.body).toHaveProperty("_id");
    expect(res.body.status).toBe("placed");
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.userId).toBe(customer._id.toString());
    expect(res.body.restaurantId).toBe(restaurant._id.toString());
  });
});
