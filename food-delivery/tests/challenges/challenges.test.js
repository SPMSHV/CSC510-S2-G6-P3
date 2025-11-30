import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import Order from "../../models/Order.js";
import ChallengeSession from "../../models/ChallengeSession.js";

let agent;
beforeAll(async () => { await setupTestDB(); agent = await newAgent(); });
afterAll(async () => { await closeTestDB(); });

async function getCustomerId(agent) {
  const me = await agent.get("/api/customer-auth/me");
  return me.body.customerId;
}
function extractTokenFromStartUrl(url) {
  const u = new URL(url, "http://localhost");
  return u.searchParams.get("session");
}

test("POST /api/challenges/start -> 401 when not logged in; 400 without orderId", async () => {
  const unauth = await newAgent();
  const r401 = await unauth.post("/api/challenges/start").send({ orderId: "x" });
  expect(r401.status).toBe(401);

  await registerAndLoginCustomer(agent);
  const r400 = await agent.post("/api/challenges/start").send({});
  expect(r400.status).toBe(400);
});

test("full flow: start → session → result fail (not delivered) → complete (WIN)", async () => {
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);
  const rest = await createRestaurant(agent);

  const order = await Order.create({
    userId: customerId,
    restaurantId: rest._id,
    items: [],
    subtotal: 10, deliveryFee: 0, discount: 0, total: 10,
    status: "preparing", paymentStatus: "paid", challengeStatus: "NOT_STARTED",
  });

  const start = await agent.post("/api/challenges/start").send({ orderId: order._id, difficulty: "easy" });
  expect(start.status).toBe(200);
  const token = extractTokenFromStartUrl(start.body.url);

  const session = await agent.get(`/api/challenges/session?token=${encodeURIComponent(token)}`);
  expect(session.status).toBe(200);
  expect(session.body.orderId).toBe(String(order._id));

  const failTry = await agent.post("/api/challenges/result").send({ token, passed: false });
  expect(failTry.status).toBe(200);

  const done = await agent.post("/api/challenges/complete").send({ token });
  expect(done.status).toBe(200);
  expect(done.body.code).toMatch(/^FOOD-/);

  const after = await Order.findById(order._id);
  expect(after.challengeStatus).toBe("COMPLETED");

  const sess = await ChallengeSession.findOne({ orderId: order._id });
  expect(sess.status).toBe("WON");
});
