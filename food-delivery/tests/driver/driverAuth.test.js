import { setupTestDB, closeTestDB } from "../helpers/testUtils.js";
import mongoose from "mongoose";

let agent;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
});

afterAll(async () => {
  await closeTestDB();
});

describe("Driver Authentication Flow", () => {
  test("should register a new driver successfully", async () => {
    const res = await agent
      .post("/api/driver/register")
      .send({
        fullName: "John Doe",
        address: "123 Test Street",
        vehicleType: "Bike",
        vehicleNumber: "MH12AB1234",
        licenseNumber: "LIC12345",
        email: "driver1@test.com",
        password: "secret123",
      })
      .expect(200);

    expect(res.body.message).toBe("Driver registered successfully");

    const Driver = mongoose.model("Driver");
    const DriverAuth = mongoose.model("DriverAuth");

    const driver = await Driver.findOne({ fullName: "John Doe" });
    expect(driver).toBeTruthy();

    const auth = await DriverAuth.findOne({ email: "driver1@test.com" });
    expect(auth).toBeTruthy();
  });

  test("should log in the driver successfully and store session", async () => {
    // Login with the registered driver
    const res = await agent
      .post("/api/driver/login")
      .send({
        email: "driver1@test.com",
        password: "secret123",
      })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.message).toContain("Welcome John Doe");
  });

  test("should reject invalid password", async () => {
    const res = await agent
      .post("/api/driver/login")
      .send({
        email: "driver1@test.com",
        password: "wrongpassword",
      })
      .expect(400);

    expect(res.text).toContain("Invalid password");
  });

  test("should reject unknown driver email", async () => {
    const res = await agent
      .post("/api/driver/login")
      .send({
        email: "nonexistent@test.com",
        password: "whatever",
      })
      .expect(400);

    expect(res.text).toContain("Driver not found");
  });

  test("should destroy session on logout", async () => {
    // Login first
    await agent.post("/api/driver/login").send({
      email: "driver1@test.com",
      password: "secret123",
    });

    const logoutRes = await agent.get("/api/driver/logout").expect(302);
    expect(logoutRes.headers.location).toBe("/driver-login.html");
  });
});
