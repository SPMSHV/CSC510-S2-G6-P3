import { setupTestDB, closeTestDB, registerAndLoginRestaurant, registerAndLoginCustomer } from "../helpers/testUtils.js";

let adminEmail, adminPassword;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
  const restRes = await registerAndLoginRestaurant(agent);
restaurant = restRes.restaurant;
   adminEmail = restRes.email;
   adminPassword = restRes.password;
  await agent.post("/api/restaurant-dashboard/menu").send({ name: "Vada", price: 5, isAvailable: true }).expect(201);
  await agent.post("/api/restaurant-auth/logout").expect(200);
  await registerAndLoginCustomer(agent, { email: "t@e.com", password: "pass1234" });
  const menu = await agent.get(`/api/menu?restaurantId=${restaurant._id}`).expect(200);
  const mi = menu.body[0];
  await agent.post("/api/cart").send({ menuItemId: mi._id, restaurantId: restaurant._id, quantity: 1 }).expect(201);
  const order = await agent.post("/api/orders").send({}).expect(201);
  orderId = order.body._id;
  await agent.post("/api/customer-auth/logout").expect(200);
});

afterAll(async () => { await closeTestDB(); });

test("allowed statuses succeed; forbidden rejected", async () => {
  // login admin again
  await agent.post("/api/restaurant-auth/login").send({ email: adminEmail, password: adminPassword }).expect(200);
  // allowed
  for (const s of ["preparing", "ready_for_pickup", "out_for_delivery"]) {
    const r = await agent.patch(`/api/restaurant-dashboard/orders/${orderId}/status`).send({ status: s });
    expect([200,201]).toContain(r.statusCode);
    expect(r.body.status).toBe(s);
  }
  // forbidden
  await agent.patch(`/api/restaurant-dashboard/orders/${orderId}/status`).send({ status: "delivered" }).expect(403);
});
