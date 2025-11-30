import { setupTestDB, closeTestDB, registerAndLoginRestaurant } from "../helpers/testUtils.js";

let agent;
beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => { await closeTestDB(); });

test("GET /api/restaurant-dashboard/data requires auth and returns menu+orders", async () => {
  // unauth
  await agent.get("/api/restaurant-dashboard/data").expect(401);

  // login & seed
  await registerAndLoginRestaurant(agent, { name: "Dash Diner" });
  await agent.post("/api/restaurant-dashboard/menu").send({ name: "Poha", price: 6.5, isAvailable: true }).expect(201);
  const data = await agent.get("/api/restaurant-dashboard/data").expect(200);
  expect(data.body.ok).toBe(true);
  expect(Array.isArray(data.body.menuItems)).toBe(true);
  expect(Array.isArray(data.body.orders)).toBe(true);
});
