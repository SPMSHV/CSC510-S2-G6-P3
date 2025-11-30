import {
  setupTestDB,
  closeTestDB,
} from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("Restaurant Registration", () => {
  it("should register a restaurant successfully", async () => {
    console.log("🚀 Starting Restaurant Registration test");

    const restaurant = {
      name: "Tandoori Nights",
      email: "tandoori@example.com",
      password: "spicy123",
      cuisine: "Indian",
      address: "456 Curry Lane, Raleigh, NC",
    };

    const res = await agent.post("/api/restaurant-auth/register").send(restaurant);

    console.log("📨 Response:", res.status, res.body);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/registered|created|welcome|successful/i);
  });
});
