// tests/customer/outofstock.test.js
import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import MenuItem from '../../models/MenuItem.js';
import CartItem from '../../models/CartItem.js';

jest.setTimeout(60_000);

let app, agent, mongod;

async function waitForMongoOpen(timeoutMs = 15000) {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > timeoutMs) throw new Error('Mongo did not connect in time');
    await new Promise(r => setTimeout(r, 100));
  }
}

describe('Out-of-stock item cannot be ordered', () => {
  let customerId, restaurantId, menuItemId;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('food_delivery_app');
    process.env.NODE_ENV = 'test';

    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'food_delivery_app' });
    ({ default: app } = await import('../../server.js'));
    agent = request.agent(app);

    await waitForMongoOpen();

    // register + login customer
    await agent.post('/api/customer-auth/register').send({
      name: 'Eve',
      email: 'eve@test.com',
      password: 'pass1234',
      address: '2 Test Ave',
    });
    await agent.post('/api/customer-auth/login').send({
      email: 'eve@test.com',
      password: 'pass1234',
    });
    const me = await agent.get('/api/customer-auth/me');
    customerId = me.body?.customerId;

    // create restaurant (requires address)
    const rr = await request(app).post('/api/restaurant-auth/register').send({
      name: 'NoodleBar',
      email: 'noodle@example.com',
      password: 'pass1234',
      cuisine: 'Asian',
      address: '123 Kitchen St',
    });
    restaurantId = rr.body?.restaurant?.id || rr.body?.restaurant?._id;

    // create UNAVAILABLE menu item (route checks isAvailable)
    const mi = await MenuItem.create({
      restaurantId,
      name: 'Ramen',
      price: 12.5,
      isAvailable: false,
    });
    menuItemId = mi.id;

    // put the item in the user's CART (CartItem requires restaurantId)
    await CartItem.create({
      userId: customerId,
      restaurantId,           // <-- add this
      menuItemId,
      quantity: 1,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  test('POST /api/orders → 400 for out-of-stock/unavailable items', async () => {
    const res = await agent.post('/api/orders').send();

    if (res.status !== 400) {
      console.error('Unexpected order response:', res.status, res.body);
    }
    expect(res.status).toBe(400);
    expect((res.body.error || '').toLowerCase()).toContain('unavailable');
  });
});
