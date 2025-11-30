// tests/customer/orderplace_multirestaurant.test.js
import {
  setupTestDB,
  closeTestDB,
  registerAndLoginCustomer,
} from "../helpers/testUtils.js";

import mongoose from "mongoose";
import CartItem from "../../models/CartItem.js";
import MenuItem from "../../models/MenuItem.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /api/orders (Multi-Restaurant Cart)", () => {
  it("should return 400 if cart has items from multiple restaurants", async () => {
    console.log("🚀 Starting Multi-Restaurant Cart test");

    // 1️⃣ Register + login real customer (via helper)
    const { customer } = await registerAndLoginCustomer(agent);
    const customerId = customer._id.toString();
    console.log("👤 Logged-in customer:", customerId);

    // 2️⃣ Create two different restaurants (ObjectIds only — not needed in DB)
    const restaurant1 = new mongoose.Types.ObjectId();
    const restaurant2 = new mongoose.Types.ObjectId();

    // 3️⃣ Create menu items linked to each restaurant
    const menuItem1 = await MenuItem.create({
      name: "Pizza",
      price: 12,
      restaurantId: restaurant1,
    });
    const menuItem2 = await MenuItem.create({
      name: "Burger",
      price: 10,
      restaurantId: restaurant2,
    });

    // 4️⃣ Add both to the customer’s cart
    await CartItem.create([
      {
        userId: customerId,
        restaurantId: restaurant1,
        menuItemId: menuItem1._id,
        quantity: 1,
      },
      {
        userId: customerId,
        restaurantId: restaurant2,
        menuItemId: menuItem2._id,
        quantity: 2,
      },
    ]);

    const cartCount = await CartItem.countDocuments({ userId: customerId });
    console.log("🛒 Cart items inserted:", cartCount);

    // 5️⃣ Place order — should fail (400) since multiple restaurants
    const res = await agent.post("/api/orders").send({});
    console.log("📨 Response status:", res.status);
    console.log("📨 Response body:", res.body);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/single restaurant/i);
  });
});
