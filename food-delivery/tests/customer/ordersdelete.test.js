import { setupTestDB, closeTestDB, registerAndLoginCustomer, registerAndLoginRestaurant } from "../helpers/testUtils.js";

let agent;
let restaurant;
beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
  const { restaurant: rest } = await registerAndLoginRestaurant(agent);
  restaurant = rest;
  await agent.post("/api/restaurant-dashboard/menu").send({ name: "Idli", price: 7, isAvailable: true }).expect(201);
  await agent.post("/api/restaurant-auth/logout").expect(200);
});

afterAll(async () => { await closeTestDB(); });

test("delete one order and all orders", async () => {
  await registerAndLoginCustomer(agent, { email: "t@e.com", password: "pass1234" });
  const menu = await agent.get(`/api/menu?restaurantId=${restaurant._id}`).expect(200);
  const mi = menu.body[0];
  await agent.post("/api/cart").send({ menuItemId: mi._id, restaurantId: restaurant._id, quantity: 2 }).expect(201);
  const orderRes = await agent.post("/api/orders").send({}).expect(201);
  const orderId = orderRes.body._id;

  // delete one
  await agent.delete(`/api/orders/${orderId}`).expect(200);
  // deleting again should 404
  await agent.delete(`/api/orders/${orderId}`).expect(404);

  // create second order
  await agent.post("/api/cart").send({ menuItemId: mi._id, restaurantId: restaurant._id, quantity: 1 }).expect(201);
  await agent.post("/api/orders").send({}).expect(201);

  // delete all
  const delAll = await agent.delete(`/api/orders`).expect(200);
  expect(delAll.body.ok).toBe(true);
});
