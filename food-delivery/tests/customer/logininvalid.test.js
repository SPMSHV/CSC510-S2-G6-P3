import { setupTestDB, closeTestDB } from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent; // ✅ use session-persistent Supertest agent
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /api/customer-auth/login (invalid credentials)", () => {
  it("should return 401 for invalid password", async () => {
    const customer = {
      name: "Bob Brown",
      email: "bob@example.com",
      password: "correct123",
      favoriteDishes: ["Tacos", "Sandwich"],
      dietRequirements: "Vegan",
      address: "789 Elm Avenue",
    };

    // 1️⃣ Register user
    await agent.post("/api/customer-auth/register").send(customer).expect(201);

    // 2️⃣ Try wrong password
    const res = await agent
      .post("/api/customer-auth/login")
      .send({ email: "bob@example.com", password: "wrongpass" })
      .expect(401);

    // 3️⃣ Validate response
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/invalid|incorrect/i);
  });
});
