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

describe("POST /api/customer-auth/register → Customer Registration", () => {
  it("should register a new customer successfully", async () => {
    console.log("🚀 Starting Customer Registration test");

    const res = await agent
      .post("/api/customer-auth/register")
      .send({
        name: "John Doe",
        email: "john@example.com",
        password: "secret123",
        favoriteDishes: ["Pizza", "Burger"],
        dietRequirements: "Vegan",
        address: "123 Main Street",
      });

    console.log("📨 Response:", res.status, res.body);

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.customer.email).toBe("john@example.com");
  });
});
