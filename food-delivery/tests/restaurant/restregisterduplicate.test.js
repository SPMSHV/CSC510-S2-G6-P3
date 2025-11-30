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

describe("Restaurant Duplicate Registration", () => {
  it("should return 409 if restaurant already exists", async () => {
    const restaurant = {
      name: "DuplicateDine",
      email: "duplicate@example.com",
      password: "test123",
      cuisine: "Fusion",
      address: "123 Test Street, Raleigh, NC",
    };

    // 1️⃣ First registration — should succeed (201)
    await agent.post("/api/restaurant-auth/register").send(restaurant).expect(201);

    // 2️⃣ Second registration — should fail (409 Conflict)
    const res = await agent.post("/api/restaurant-auth/register").send(restaurant);

    console.log("📨 Duplicate register response:", res.status, res.body);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/already registered|exists/i);
  });
});
