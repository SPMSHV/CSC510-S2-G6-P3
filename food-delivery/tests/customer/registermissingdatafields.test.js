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

describe("POST /api/customer-auth/register (missing fields)", () => {
  it("should return 400 if required fields are missing", async () => {
    console.log("🚀 Starting Missing Fields test");

    const incompleteCustomer = {
      name: "Sam",
      // ❌ Missing email
      password: "test123",
      address: "456 Main Road",
    };

    // Attempt registration with missing email
    const res = await agent
      .post("/api/customer-auth/register")
      .send(incompleteCustomer);

    console.log("📨 Response:", res.status, res.body);

    // Assertions
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/missing|required/i);
  });
});
