// tests/customer/logout.test.js
import { setupTestDB, closeTestDB, registerAndLoginCustomer, newAgent } from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  ({ agent } = await setupTestDB());
  await registerAndLoginCustomer(agent, {
    name: "Alice Smith",
    email: "alice@example.com",
    password: "pass1234",
    address: "1 Main St"
  });
});

afterAll(async () => {
  await closeTestDB();
});

describe("Customer logout flow", () => {
  it("destroys session; new tab sees 401 on /me", async () => {
    await agent.get("/api/customer-auth/me").expect(200);
    await agent.post("/api/customer-auth/logout").expect(200);
    await agent.get("/api/customer-auth/me").expect(401);

    // Fresh tab (new cookie jar)
    const fresh = newAgent();
    await fresh.get("/api/customer-auth/me").expect(401);
  });
});

