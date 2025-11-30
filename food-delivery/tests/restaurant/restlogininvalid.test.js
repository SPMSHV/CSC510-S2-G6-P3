import { setupTestDB, closeTestDB } from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;

  // Register restaurant before testing login
  await agent.post("/api/restaurant-auth/register").send({
    name: "InvalidLogin",
    email: "invalid@example.com",
    password: "validpass",
    cuisine: "Mexican",
    address: "123 Taco Street, Raleigh, NC",
  }).expect(201);
});

afterAll(async () => {
  await closeTestDB();
});

describe("POST /api/restaurant-auth/login (invalid credentials)", () => {
  it("should return 401 for wrong password", async () => {
    const res = await agent
      .post("/api/restaurant-auth/login")
      .send({ email: "invalid@example.com", password: "wrongpass" })
      .expect(401);

    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/invalid|incorrect/i);
  });
});
