import { setupTestDB, closeTestDB } from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /api/customer-auth/login (valid credentials)", () => {
  it("should log in successfully with valid credentials", async () => {
    console.log("🚀 Starting Customer Login Success test");

    const customer = {
      name: "Alice Smith",
      email: "alice@example.com",
      password: "secure123",
      favoriteDishes: ["Pasta", "Salad"],
      dietRequirements: "None",
      address: "456 Main Street",
    };

    // 1️⃣ Register the customer
    await agent.post("/api/customer-auth/register").send(customer).expect(201);

    // 2️⃣ Attempt login with the same credentials
    const res = await agent
      .post("/api/customer-auth/login")
      .send({ email: customer.email, password: customer.password })
      .expect(200);

    console.log("📨 Response:", res.status, res.body);

    // 3️⃣ Assertions
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toMatch(/welcome|logged in/i);
  });
});
