import { setupTestDB, closeTestDB, registerAndLoginCustomer } from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  ({ agent } = await setupTestDB());
  await registerAndLoginCustomer(agent, {
    name: "Carol",
    email: "carol@example.com",
    password: "pass1234",
    address: "44 Maple St",
  });
});

afterAll(async () => {
  await closeTestDB();
});

describe("GET /api/customer-auth/me (authenticated)", () => {
  it("returns 200 with customer info", async () => {
    const res = await agent.get("/api/customer-auth/me").expect(200);
    expect(res.body).toMatchObject({ ok: true });
    expect(res.body).toHaveProperty("customerId");
    expect(typeof res.body.customerId).toBe("string");
    expect(res.body.message).toMatch(/welcome/i);
  });
});
