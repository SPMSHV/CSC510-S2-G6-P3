// tests/driver/driverStatus.test.js
import { setupTestDB, closeTestDB } from "../helpers/testUtils.js";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;

  await agent.post("/api/driver/register").send({
    fullName: "Status Driver",
    address: "100 Main",
    vehicleType: "Bike",
    vehicleNumber: "ST-1",
    licenseNumber: "LIC-ST",
    email: "status@test.com",
    password: "secret123",
  }).expect(200);

  await agent.post("/api/driver/login").send({
    email: "status@test.com",
    password: "secret123",
  }).expect(200);
});

afterAll(async () => {
  await closeTestDB();
});

describe("Driver status & session", () => {
  test("GET /api/driver/me", async () => {
    const res = await agent.get("/api/driver/me").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.driverId).toBeTruthy();
    expect(res.body.driverName).toBe("Status Driver");
  });

  test("PATCH /api/driver/active then GET /api/driver/status", async () => {
    const on = await agent.patch("/api/driver/active").send({ isActive: true }).expect(200);
    expect(on.body.ok).toBe(true);
    expect(on.body.isActive).toBe(true);

    const status = await agent.get("/api/driver/status").expect(200);
    expect(status.body.ok).toBe(true);
    expect(status.body.isActive).toBe(true);
  });
});
