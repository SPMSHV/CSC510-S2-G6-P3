// tests/driver/driverOrdersNewAccept.test.js
import mongoose from "mongoose";
import { setupTestDB, closeTestDB, createRestaurant, registerAndLoginCustomer } from "../helpers/testUtils.js";

let agent, Order, driverId;

beforeAll(async () => {
  const setup = await setupTestDB();
  agent = setup.agent;
  Order = mongoose.model("Order");

  await agent.post("/api/driver/register").send({
    fullName: "NewAccept Driver",
    address: "2 Drive Rd",
    vehicleType: "Car",
    vehicleNumber: "NA-2",
    licenseNumber: "LIC-NA2",
    email: "newaccept@test.com",
    password: "secret123",
  }).expect(200);

  await agent.post("/api/driver/login").send({
    email: "newaccept@test.com",
    password: "secret123",
  }).expect(200);

  const me = await agent.get("/api/driver/me").expect(200);
  driverId = me.body.driverId;
});

afterAll(async () => {
  await closeTestDB();
});

describe("New orders listing & accept", () => {
  test("inactive driver gets [] from /orders/new", async () => {
    const res = await agent.get("/api/driver/orders/new").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test("active driver sees 'preparing' order and can accept it", async () => {
    const restaurant = await createRestaurant();
    const { customer } = await registerAndLoginCustomer(agent);

    // seed a visible order
    const order = await Order.create({
      restaurantId: restaurant._id,
      userId: customer._id,
      restaurantLocation: "R-Addr",
      customerLocation: "C-Addr",
      status: "preparing",
      driverId: null,
      deliveryPayment: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await agent.patch("/api/driver/active").send({ isActive: true }).expect(200);

    const list = await agent.get("/api/driver/orders/new").expect(200);
    expect(list.body.some(o => String(o._id) === String(order._id))).toBe(true);

    const accept = await agent.post(`/api/driver/orders/accept/${order._id}`).expect(200);
    expect(accept.body.message).toMatch(/accepted/i);
    expect(String(accept.body.order.driverId)).toBe(String(driverId));
    expect(accept.body.order.deliveryPayment).toBe(5);
  });
});
