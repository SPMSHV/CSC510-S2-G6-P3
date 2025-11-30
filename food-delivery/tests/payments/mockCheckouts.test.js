import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import MenuItem from "../../models/MenuItem.js";
import CartItem from "../../models/CartItem.js";
import Coupon from "../../models/Coupon.js";
import Order from "../../models/Order.js";  // <-- default export
import { jest } from '@jest/globals';


let agent;
beforeAll(async () => { await setupTestDB(); agent = await newAgent(); });
afterAll(async () => { await closeTestDB(); });

async function getCustomerId(agent) {
  const me = await agent.get("/api/customer-auth/me");
  return me.body.customerId;
}

test("POST /api/payments/mock-checkout -> 401 when not logged in", async () => {
  const unauth = await newAgent();
  const r = await unauth.post("/api/payments/mock-checkout").send({});
  expect(r.status).toBe(401);
});

test("POST /api/payments/mock-checkout -> 400 when cart is empty", async () => {
  await registerAndLoginCustomer(agent);
  const r = await agent.post("/api/payments/mock-checkout").send({});
  expect(r.status).toBe(400);
});

test("POST /api/payments/mock-checkout -> success, creates paid order, clears cart, applies coupon", async () => {
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);
  const rest = await createRestaurant(agent);

  const burger = await MenuItem.create({ restaurantId: rest._id, name: "Burger", price: 12, isAvailable: true });
  const fries  = await MenuItem.create({ restaurantId: rest._id, name: "Fries",  price: 5,  isAvailable: true });

  await CartItem.create({ userId: customerId, restaurantId: rest._id, menuItemId: burger._id, quantity: 1 });
  await CartItem.create({ userId: customerId, restaurantId: rest._id, menuItemId: fries._id,  quantity: 2 });

  await Coupon.create({
    userId: customerId, code: "TENOFF", discountPct: 10, applied: false,
    expiresAt: new Date(Date.now() + 3600e3),
  });

  const r = await agent.post("/api/payments/mock-checkout").send({ couponCode: "TENOFF" });
  expect(r.status).toBe(200);
  expect(r.body.ok).toBe(true);
  expect(r.body.orderId).toBeTruthy();

  const updated = await Coupon.findOne({ userId: customerId, code: "TENOFF" });
  expect(updated.applied).toBe(true);

  const leftovers = await CartItem.find({ userId: customerId });
  expect(leftovers.length).toBe(0);
});

test("POST /api/payments/mock-checkout -> ignores unknown coupon and still succeeds", async () => {
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);
  const rest = await createRestaurant(agent);
  const item = await MenuItem.create({ restaurantId: rest._id, name: "Salad", price: 9, isAvailable: true });
  await CartItem.create({ userId: customerId, restaurantId: rest._id, menuItemId: item._id, quantity: 1 });

  const r = await agent.post("/api/payments/mock-checkout").send({ couponCode: "NOPE" });
  expect(r.status).toBe(200);
  expect(r.body.ok).toBe(true);
  expect(r.body.discountApplied).toBeNull();
});

test("POST /api/payments/mock-checkout -> 500 when DB throws", async () => {
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);
  const rest = await createRestaurant(agent);
  const item = await MenuItem.create({ restaurantId: rest._id, name: "X", price: 5, isAvailable: true });
  await CartItem.create({ userId: customerId, restaurantId: rest._id, menuItemId: item._id, quantity: 1 });

  const spy = jest.spyOn(Order, "create").mockRejectedValueOnce(new Error("boom")); // <-- simpler spy
  const r = await agent.post("/api/payments/mock-checkout").send({});
  spy.mockRestore();

  expect([500,503].includes(r.status)).toBe(true);
});
