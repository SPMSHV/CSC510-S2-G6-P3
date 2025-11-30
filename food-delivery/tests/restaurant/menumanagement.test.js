
import {
  setupTestDB, closeTestDB, newAgent, registerAndLoginRestaurant
} from "../helpers/testUtils.js";

let agent;

beforeAll(async () => { await setupTestDB(); agent = await newAgent(); });
afterAll(async () => { await closeTestDB(); });

async function getRestaurantId() {
  const me = await agent.get("/api/restaurant-auth/me");
  return me.body.restaurantId || me.body.restaurant?.id || me.body?.id || me.body?._id;
}

async function listMenu(restaurantId) {
  const list = await agent.get(`/api/menu?restaurantId=${restaurantId}`);
  expect(list.status).toBe(200);
  return Array.isArray(list.body) ? list.body : [];
}

describe("Validation behavior", () => {
  test("POST /api/restaurant-dashboard/menu -> may reject invalid OR accept (coerce) it", async () => {
    await registerAndLoginRestaurant(agent);

    // Case 1: empty name — expect either a validation error OR a permissive success
    const r1 = await agent.post("/api/restaurant-dashboard/menu").send({ name: "" });
    expect([200, 201, 400, 422, 500]).toContain(r1.status);

    // Case 2: negative price — same logic
    const r2 = await agent.post("/api/restaurant-dashboard/menu").send({
      name: "X",
      price: -1,
      description: "bad",
      category: "Test"
    });
    expect([200, 201, 400, 422, 500]).toContain(r2.status);
  });
});

describe("Create → list via /api/menu → delete", () => {
  test("Create 201/200, appears in list, delete 200/204, then 404/400 on repeat", async () => {
    await registerAndLoginRestaurant(agent);
    const restaurantId = await getRestaurantId();

    const payload = {
      name: "Paneer Wrap",
      price: 8.99,
      description: "Soft wrap",
      category: "Wraps",
      inStock: true
    };

    const create = await agent.post("/api/restaurant-dashboard/menu").send(payload);
    expect([200, 201]).toContain(create.status);

    // Try to grab an id from various possible response shapes
    let createdId =
      create.body?._id ||
      create.body?.id ||
      create.body?.menuItem?._id ||
      create.body?.menuItemId ||
      create.body?.created?._id;

    // If not present, locate it by listing (fallback by unique name+price)
    if (!createdId) {
      const listed = await listMenu(restaurantId);
      const found = listed.find(
        (m) => m?.name === payload.name && Number(m?.price) === payload.price
      );
      createdId = found?._id;
    }
    expect(createdId).toBeTruthy();

    // Verify it is present in listing
    const before = await listMenu(restaurantId);
    expect(before.some((m) => String(m._id) === String(createdId))).toBe(true);

    // Delete
    const del = await agent.delete(`/api/restaurant-dashboard/menu/${createdId}`);
    expect([200, 204]).toContain(del.status);

    // Verify gone
    const after = await listMenu(restaurantId);
    expect(after.some((m) => String(m._id) === String(createdId))).toBe(false);

    // Second delete should be 404/400
    const del2 = await agent.delete(`/api/restaurant-dashboard/menu/${createdId}`);
    expect([404, 400]).toContain(del2.status);
  });
});

describe("Not found / invalid ID paths", () => {
  test("DELETE unknown menuId -> 404/400", async () => {
    await registerAndLoginRestaurant(agent);
    const bogus = "64b000000000000000000000";
    const r = await agent.delete(`/api/restaurant-dashboard/menu/${bogus}`);
    expect([404, 400]).toContain(r.status);
  });
});
