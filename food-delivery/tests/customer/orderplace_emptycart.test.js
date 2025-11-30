import {
  setupTestDB,
  closeTestDB,
  registerAndLoginCustomer,
} from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /api/orders (Empty Cart)", () => {
  it("should return 400 when cart is empty after real register + login", async () => {
    console.log("🚀 Starting Empty Cart test");

    // 1️⃣ Register and log in a real customer using the helper
    const { customer } = await registerAndLoginCustomer(agent);
    console.log("👤 Logged in as:", customer._id);

    // 2️⃣ Attempt to place an order with an empty cart
    const res = await agent.post("/api/orders").send({});

    console.log("📨 Response status:", res.status);
    console.log("📨 Response body:", res.body);

    // 3️⃣ Assert
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/cart is empty/i);
  });
});
