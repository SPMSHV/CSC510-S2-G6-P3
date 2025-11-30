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

describe("POST /api/customer-auth/register (duplicate)", () => {
  it("should return 409 if the email is already registered", async () => {
    console.log("🚀 Starting Customer Duplicate Registration test");

    const customer = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      favoriteDishes: ["Pizza", "Burger"],
      dietRequirements: "None",
      address: "123 Street",
    };

    // 1️⃣ First registration — should succeed
    await agent.post("/api/customer-auth/register").send(customer).expect(201);

    // 2️⃣ Second registration — should fail
    const res = await agent.post("/api/customer-auth/register").send(customer);

    console.log("📨 Response:", res.status, res.body);

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/already registered/i);
  });
});
