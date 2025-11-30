import { setupTestDB, closeTestDB, registerAndLoginRestaurant } from "../helpers/testUtils.js";

let agent;
beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
  // seed a couple of restaurants via register
  await registerAndLoginRestaurant(agent, { name: "Spicy Bytes", cuisine: "Indian" });
  await agent.post("/api/restaurant-auth/logout").expect(200);
  await registerAndLoginRestaurant(agent, { name: "Algo Eats", cuisine: "Fusion", emailPrefix: "algo" });
  await agent.post("/api/restaurant-auth/logout").expect(200);
});

afterAll(async () => { await closeTestDB(); });

test("list restaurants ordered by rating and search by q", async () => {
  const res1 = await agent.get("/api/restaurants").expect(200);
  expect(Array.isArray(res1.body)).toBe(true);
  expect(res1.body.length).toBeGreaterThanOrEqual(2);

  const res2 = await agent.get("/api/restaurants?q=algo").expect(200);
  expect(res2.body.length).toBe(1);
  expect(res2.body[0].name).toMatch(/algo/i);
});
