import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
} from "../helpers/testUtils.js";
import Coupon from "../../models/Coupon.js";

let agent;
beforeAll(async () => { await setupTestDB(); agent = await newAgent(); });
afterAll(async () => { await closeTestDB(); });

async function getCustomerId(agent) {
  const me = await agent.get("/api/customer-auth/me");
  return me.body.customerId;
}

test("GET /api/coupons -> 401 when not logged in", async () => {
  const unauth = await newAgent();
  const r = await unauth.get("/api/coupons");
  expect(r.status).toBe(401);
});

test("GET /api/coupons -> only active & unapplied for this user", async () => {
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);

  const now = new Date();
  await Coupon.create({
    userId: customerId, code: "LIVE10", discountPct: 10, applied: false,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });
  await Coupon.create({
    userId: customerId, code: "EXPIRED", discountPct: 50, applied: false,
    expiresAt: new Date(now.getTime() - 60 * 60 * 1000),
  });
  await Coupon.create({
    userId: customerId, code: "USED20", discountPct: 20, applied: true,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });
  await Coupon.create({
    userId: "64b000000000000000000000", code: "FOREIGN", discountPct: 40, applied: false,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });

  const r = await agent.get("/api/coupons");
  expect(r.status).toBe(200);
  const codes = r.body.map(c => c.code).sort();
  expect(codes).toEqual(["LIVE10"]);
});

test("POST /api/coupons/validate -> 401 if not logged in, 400 missing, 404 invalid/expired, 200 ok", async () => {
  // 401
  const unauth = await newAgent();
  const r401 = await unauth.post("/api/coupons/validate").send({ code: "ANY" });
  expect(r401.status).toBe(401);

  // login and seed
  await registerAndLoginCustomer(agent);
  const customerId = await getCustomerId(agent);
  const now = new Date();
  await Coupon.create({
    userId: customerId, code: "OK25", discountPct: 25, applied: false,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });
  await Coupon.create({
    userId: customerId, code: "OLD", discountPct: 50, applied: false,
    expiresAt: new Date(now.getTime() - 60 * 60 * 1000),
  });
  await Coupon.create({
    userId: customerId, code: "USED", discountPct: 5, applied: true,
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
  });

  const r400 = await agent.post("/api/coupons/validate").send({});
  expect(r400.status).toBe(400);

  for (const bad of ["NOPE", "OLD", "USED"]) {
    const r404 = await agent.post("/api/coupons/validate").send({ code: bad });
    expect(r404.status).toBe(404);
  }

  const ok = await agent.post("/api/coupons/validate").send({ code: "OK25" });
  expect(ok.status).toBe(200);
  expect(ok.body.ok).toBe(true);
  expect(ok.body.coupon.code).toBe("OK25");
});
