import mongoose from "mongoose";
import {
  setupTestDB,
  closeTestDB,
  registerAndLoginCustomer,
  registerAndLoginRestaurant,
  newAgent,
} from "../helpers/testUtils.js";

let restAgent;
let custAgent;
let restaurantId;
let menuItemId;
let customerId;

beforeAll(async () => {
  ({ agent: restAgent } = await setupTestDB());

  // Create restaurant (to get restaurantId)
  const { restaurant } = await registerAndLoginRestaurant(restAgent, {
    name: "History House",
    cuisine: "Fusion",
  });
  restaurantId = restaurant._id;

  // Create a menu item directly
  const MenuItem = mongoose.model("MenuItem");
  const item = await MenuItem.create({
    restaurantId,
    name: "History Burger",
    description: "Classic",
    price: 9.5,
    stock: true,
  });
  menuItemId = item._id.toString();

  // Customer session + id
  custAgent = newAgent();
  const { customer } = await registerAndLoginCustomer(custAgent, {
    name: "Eve",
    email: "eve@example.com",
    password: "evepass",
    address: "7 Birch Dr",
  });
  customerId = customer._id.toString();
});

afterAll(async () => {
  await closeTestDB();
});

describe("GET /api/orders (customer history)", () => {
  let orderId;

  it("places an order (cart-based)", async () => {
    // Seed cart for this customer (same restaurant)
    const CartItem = mongoose.model("CartItem");
    await CartItem.create({
      userId: customerId,
      restaurantId,
      menuItemId,
      name: "History Burger",
      price: 9.5,
      quantity: 1,
    });

    const res = await custAgent.post("/api/orders").send({}).expect(201);
    orderId = res.body._id;

    expect(res.body).toMatchObject({
      restaurantId,
      items: expect.any(Array),
      status: expect.any(String),
    });
  });

  it("returns the order in history", async () => {
    const list = await custAgent.get("/api/orders").expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    const found = list.body.find((o) => o._id === orderId);
    expect(found).toBeTruthy();
    expect(found.restaurantId).toBe(restaurantId);
  });
});
