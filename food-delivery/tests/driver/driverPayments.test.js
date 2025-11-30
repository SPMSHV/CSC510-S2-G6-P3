// tests/driver/driverPayments.test.js
import mongoose from "mongoose";
import { setupTestDB, closeTestDB, createRestaurant, registerAndLoginCustomer } from "../helpers/testUtils.js";

let agent, Order, driverId;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
  Order = mongoose.model("Order");

  await agent.post("/api/driver/register").send({
    fullName: "Pay Driver",
    address: "4 Pay St",
    vehicleType: "Car",
    vehicleNumber: "PY-4",
    licenseNumber: "LIC-PY4",
    email: "pay@test.com",
    password: "secret123",
  }).expect(200);

  await agent.post("/api/driver/login").send({
    email: "pay@test.com",
    password: "secret123",
  }).expect(200);

  const me = await agent.get("/api/driver/me").expect(200);
  driverId = me.body.driverId;

  const restaurant = await createRestaurant();
  const { customer } = await registerAndLoginCustomer(agent, { email: `paycust_${Date.now()}@t.com` });

  // Seed delivered orders in range & out of range & a non-delivered
  await Order.create([
    {
      restaurantId: restaurant._id,
      userId: customer._id,
      driverId,
      status: "delivered",
      deliveryPayment: 10,
      updatedAt: new Date("2025-03-10T10:00:00Z"),
      createdAt: new Date("2025-03-10T10:00:00Z"),
    },
    {
      restaurantId: restaurant._id,
      userId: customer._id,
      driverId,
      status: "delivered",
      deliveryPayment: 15,
      updatedAt: new Date("2025-03-15T12:00:00Z"),
      createdAt: new Date("2025-03-15T12:00:00Z"),
    },
    {
      restaurantId: restaurant._id,
      userId: customer._id,
      driverId,
      status: "ready_for_pickup", // should NOT count
      deliveryPayment: 999,
      updatedAt: new Date("2025-03-20T12:00:00Z"),
      createdAt: new Date("2025-03-20T12:00:00Z"),
    },
    {
      restaurantId: restaurant._id,
      userId: customer._id,
      driverId,
      status: "delivered",
      deliveryPayment: 7,
      updatedAt: new Date("2025-04-01T12:00:00Z"), // out of range
      createdAt: new Date("2025-04-01T12:00:00Z"),
    },
  ]);
});

afterAll(async () => {
  await closeTestDB();
});

describe("Driver payments", () => {
  test("returns total and list for date range", async () => {
    const res = await agent.get("/api/driver/payments?start=2025-03-01&end=2025-03-31").expect(200);
    expect(res.body.total).toBe(25); // 10 + 15
    expect(Array.isArray(res.body.payments)).toBe(true);
    expect(res.body.payments.length).toBe(2);
  });
});
