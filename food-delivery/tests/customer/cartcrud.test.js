import { setupTestDB, closeTestDB, registerAndLoginCustomer, registerAndLoginRestaurant } from "../helpers/testUtils.js";
import mongoose from "mongoose";

let agent;
let restaurant;
let customer;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
  // create a restaurant and a menu item
  const { restaurant: rest } = await registerAndLoginRestaurant(agent);
  restaurant = rest;
  await agent.post("/api/restaurant-dashboard/menu")
    .send({ name: "Paneer Tikka", description: "Yum", price: 12.5, imageUrl: null, isAvailable: true })
    .expect(201);
  // logout admin so we can login customer
  await agent.post("/api/restaurant-auth/logout").expect(200);
  // create customer
  customer = await registerAndLoginCustomer(agent, { email: "t@e.com", password: "pass1234" });
});

afterAll(async () => {
  await closeTestDB();
});

describe("Cart CRUD", () => {
  test("add item, get cart, update qty, delete item", async () => {
    // fetch menu to get ids
    const menuRes = await agent.get(`/api/menu?restaurantId=${restaurant._id}`).expect(200);
    const mi = menuRes.body[0];
    expect(mi).toBeTruthy();

    // add to cart
    const addRes = await agent.post("/api/cart")
      .send({ menuItemId: mi._id, restaurantId: restaurant._id, quantity: 1 })
      .expect(201);
    const cartItemId = addRes.body._id;

    // get cart
    const cartRes = await agent.get("/api/cart").expect(200);
    expect(Array.isArray(cartRes.body)).toBe(true);
    expect(cartRes.body[0].menuItemId.name).toMatch(/paneer/i);

    // update qty
    await agent.patch(`/api/cart/${cartItemId}`).send({ quantity: 3 }).expect(200);
    const cartRes2 = await agent.get("/api/cart").expect(200);
    expect(cartRes2.body[0].quantity).toBe(3);

    // delete item
    await agent.delete(`/api/cart/${cartItemId}`).expect(200);
    const cartRes3 = await agent.get("/api/cart").expect(200);
    expect(cartRes3.body.length).toBe(0);
  });

  test("guard: 401 when not logged in", async () => {
    await agent.post("/api/customer-auth/logout").expect(200);
    await agent.get("/api/cart").expect(401);
    await agent.post("/api/cart").send({}).expect(401);
    await agent.patch("/api/cart/xyz").send({ quantity: 1 }).expect(401);
    await agent.delete("/api/cart/xyz").expect(401);
    await agent.delete("/api/cart").expect(401);
  });
});
