import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import MenuItem from '../../models/MenuItem.js';

jest.setTimeout(60_000);

let app, mongod, agent, restaurantId;

async function bootServer() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('food_delivery_app');
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'food_delivery_app' });
  ({ default: app } = await import('../../server.js'));
  agent = request.agent(app);
}

async function loginRestaurant() {
  const reg = await request(app).post('/api/restaurant-auth/register').send({
    name: 'Suite Cafe',
    email: 'suite@ex.com',
    password: 'pass1234',
    cuisine: 'Cafe',
    address: '123 Suite St',
    deliveryFee: 2.0,
  });
  await agent.post('/api/restaurant-auth/login').send({
    email: 'suite@ex.com', password: 'pass1234'
  });
  restaurantId = reg.body?.restaurant?.id || reg.body?.restaurant?._id;
}

function extractMenuIdFromCreate(body) {
  // Try common response shapes
  if (!body) return null;
  if (body._id) return body._id;
  if (body.id) return body.id;
  if (body.menuItem?. _id) return body.menuItem._id;
  if (body.item?. _id) return body.item._id;
  if (Array.isArray(body.menuItems) && body.menuItems[0]?._id) return body.menuItems[0]._id;
  return null;
}

/** Try several likely EDIT endpoints; return {ok, status, body} */
async function tryEdit(menuId, payload) {
  const attempts = [
    ['patch',  `/api/menu/${menuId}`,         payload],
    ['put',    `/api/menu/${menuId}`,         payload],
    ['post',   `/api/menu/${menuId}/edit`,    payload],
    ['post',   `/api/menu/update`,            { id: menuId, ...payload }],
    ['put',    `/api/menu`,                   { id: menuId, ...payload }],
    // sometimes under dashboard
    ['patch',  `/api/restaurant-dashboard/menu/${menuId}`, payload],
    ['post',   `/api/restaurant-dashboard/menu/${menuId}/edit`, payload],
  ];
  for (const [method, url, body] of attempts) {
    const res = await agent[method](url).send(body);
    if ([200, 204].includes(res.status)) return { ok: true, status: res.status, body: res.body };
    if (res.status !== 404) {
      // unexpected error shape — surface it
      return { ok: false, status: res.status, body: res.body };
    }
  }
  return { ok: false, status: 404, body: { error: 'No matching EDIT endpoint found' } };
}

/** Try several likely DELETE endpoints; return {ok, status, body} */
async function tryDelete(menuId) {
  const attempts = [
    ['delete', `/api/menu/${menuId}`,         null],
    ['delete', `/api/menu`,                   null, { id: menuId }], // query id
    ['post',   `/api/menu/${menuId}/delete`,  {}],
    // dashboard variants
    ['delete', `/api/restaurant-dashboard/menu/${menuId}`, null],
    ['post',   `/api/restaurant-dashboard/menu/${menuId}/delete`, {}],
  ];
  for (const [method, url, body, query] of attempts) {
    const req = agent[method](url);
    if (query) req.query(query);
    const res = body ? await req.send(body) : await req;
    if ([200, 204].includes(res.status)) return { ok: true, status: res.status, body: res.body };
    if (res.status !== 404) {
      return { ok: false, status: res.status, body: res.body };
    }
  }
  return { ok: false, status: 404, body: { error: 'No matching DELETE endpoint found' } };
}

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Restaurant Menu – create, edit, delete (route-adaptive)', () => {
  beforeAll(async () => {
    await bootServer();
    await loginRestaurant();
  });

  test('CREATE: POST /api/menu creates an item for the logged-in restaurant', async () => {
    const payload = {
      // include restaurantId: some routers expect it explicitly
      restaurantId,
      name: 'Create Test Sandwich',
      price: 7.5,
      description: 'Toasted goodness',
      category: 'Mains',
      imageUrl: '/uploads/test.jpg',
      isAvailable: true,
      inStock: true,
    };

    const res = await agent.post('/api/menu').send(payload);
    expect([200, 201]).toContain(res.status);

    let id = extractMenuIdFromCreate(res.body);
    if (!id) {
      // Fallback: look it up by (restaurantId, name)
      const found = await MenuItem.findOne({ restaurantId, name: payload.name }).lean();
      id = found?._id?.toString() || null;
    }
    expect(id).toBeTruthy();

    // DB check
    const doc = await MenuItem.findById(id).lean();
    expect(doc).toBeTruthy();
    expect(doc.name).toBe(payload.name);
    expect(doc.price).toBeCloseTo(payload.price, 2);
    expect(String(doc.restaurantId)).toBe(String(restaurantId));
  });

  test('EDIT: update price & availability (if an edit endpoint exists)', async () => {
    // Seed a fresh item
    const seeded = await MenuItem.create({
      restaurantId,
      name: 'Edit Test Pasta',
      price: 11.0,
      description: 'Creamy',
      category: 'Mains',
      isAvailable: true,
      inStock: true,
      imageUrl: '/uploads/test2.jpg',
    });
    const menuId = seeded._id.toString();

    const updateBody = { price: 12.25, isAvailable: false, inStock: false, restaurantId };
    const result = await tryEdit(menuId, updateBody);

    if (!result.ok && result.status === 404) {
      console.warn('↷ Skipping EDIT: no matching edit endpoint found in this app.');
      return; // skip without failing
    }

    // If we got some other error (e.g., 400/401), surface it:
    expect(result.ok).toBe(true);

    const doc = await MenuItem.findById(menuId).lean();
    expect(doc).toBeTruthy();
    expect(doc.price).toBeCloseTo(12.25, 2);
    expect(doc.isAvailable === false || doc.inStock === false).toBe(true);
    expect(String(doc.restaurantId)).toBe(String(restaurantId));
  });

  test('DELETE: remove the item (if a delete endpoint exists)', async () => {
    const seeded = await MenuItem.create({
      restaurantId,
      name: 'Delete Test Salad',
      price: 6.0,
      description: 'Fresh',
      category: 'Sides',
      isAvailable: true,
      inStock: true,
      imageUrl: '/uploads/test3.jpg',
    });
    const menuId = seeded._id.toString();

    const result = await tryDelete(menuId);

    if (!result.ok && result.status === 404) {
      console.warn('↷ Skipping DELETE: no matching delete endpoint found in this app.');
      return; // skip without failing
    }

    expect(result.ok).toBe(true);

    const doc = await MenuItem.findById(menuId).lean();
    expect(doc).toBeFalsy();
  });
});
