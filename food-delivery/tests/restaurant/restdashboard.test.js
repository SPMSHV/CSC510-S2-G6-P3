import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginRestaurant,
  registerAndLoginCustomer,
} from "../helpers/testUtils.js";
import Order from "../../models/Order.js";

let agent;

beforeAll(async () => { await setupTestDB(); agent = await newAgent(); });
afterAll(async () => { await closeTestDB(); });

async function getRestaurantId(a) {
  const me = await a.get("/api/restaurant-auth/me");
  return me.body.restaurantId || me.body.restaurant?.id || me.body?.id || me.body?._id;
}
async function getCustomerId(a) {
  const me = await a.get("/api/customer-auth/me");
  return me.body.customerId || me.body.customer?.id || me.body?.id || me.body?._id;
}

describe("Auth & Empty State", () => {
  test("GET /api/restaurant-dashboard/data -> 401 when not logged in", async () => {
    const unauth = await newAgent();
    const r = await unauth.get("/api/restaurant-dashboard/data");
    expect(r.status).toBe(401);
  });

  test("GET /api/restaurant-dashboard/data -> 200 with empty arrays for new restaurant", async () => {
    await registerAndLoginRestaurant(agent);
    const r = await agent.get("/api/restaurant-dashboard/data");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.menuItems)).toBe(true);
    expect(Array.isArray(r.body.orders)).toBe(true);
  });
});

describe("Own-data filtering", () => {
  test("dashboard returns only orders for the logged-in restaurant", async () => {
    // R1 (the one we’ll query as)
    await registerAndLoginRestaurant(agent);
    const r1Id = await getRestaurantId(agent);

    // R2 (another restaurant)
    const agentR2 = await newAgent();
    await registerAndLoginRestaurant(agentR2);
    const r2Id = await getRestaurantId(agentR2);

    // one customer for creating orders
    const cAgent = await newAgent();
    await registerAndLoginCustomer(cAgent);
    const customerId = await getCustomerId(cAgent);

    // --- Create orders directly in DB (with required fields) ---
    const base = {
      userId: customerId,
      items: [],
      subtotal: 10,
      deliveryFee: 0,
      discount: 0,
      total: 10,
      status: "preparing",
      paymentStatus: "paid",
      challengeStatus: "NOT_STARTED",
    };

    await Order.create({ ...base, restaurantId: r1Id });
    await Order.create({ ...base, restaurantId: r2Id });

    // As R1, dashboard data must show only R1 orders
    const dash = await agent.get("/api/restaurant-dashboard/data");
    expect(dash.status).toBe(200);
    const ids = (dash.body.orders || []).map(o => String(o.restaurantId?._id || o.restaurantId));
    expect(ids.every(id => id === String(r1Id))).toBe(true);
  });
});

describe("Orders list endpoint (query by restaurantId)", () => {
  test("GET /api/restaurant-dashboard/orders?restaurantId=... -> returns only that restaurant’s orders", async () => {
    // Prepare two restaurants
    const a1 = await newAgent();
    await registerAndLoginRestaurant(a1);
    const r1Id = await getRestaurantId(a1);

    const a2 = await newAgent();
    await registerAndLoginRestaurant(a2);
    const r2Id = await getRestaurantId(a2);

    // one customer
    const cAgent = await newAgent();
    await registerAndLoginCustomer(cAgent);
    const customerId = await getCustomerId(cAgent);

    // Two orders for R2, one for R1
    const base = {
      userId: customerId,
      items: [],
      subtotal: 12,
      deliveryFee: 0,
      discount: 0,
      total: 12,
      status: "preparing",
      paymentStatus: "paid",
      challengeStatus: "NOT_STARTED",
    };
    await Order.create({ ...base, restaurantId: r1Id });
    await Order.create({ ...base, restaurantId: r2Id });
    await Order.create({ ...base, restaurantId: r2Id });

    // Query by R2 id (endpoint typically allows unauthenticated reads)
    const res = await agent.get(`/api/restaurant-dashboard/orders?restaurantId=${r2Id}`);
    expect(res.status).toBe(200);

    const body = Array.isArray(res.body) ? res.body : (res.body.orders || []);
    const ids = body.map(o => String(o.restaurantId?._id || o.restaurantId));

    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(id => id === String(r2Id))).toBe(true);
  });
});
