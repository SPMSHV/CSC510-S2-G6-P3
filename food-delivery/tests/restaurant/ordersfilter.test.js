import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Order from '../../models/Order.js';
import MenuItem from '../../models/MenuItem.js';

jest.setTimeout(60_000);

let app, mongod;

async function boot() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('food_delivery_app');
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'food_delivery_app' });
  ({ default: app } = await import('../../server.js'));
}

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Restaurant dashboard filters orders by restaurantId', () => {
  test('GET /api/restaurant-dashboard/orders returns only own orders', async () => {
    await boot();

    // Restaurant A + menu
    const ra = request.agent(app);
    const regA = await request(app).post('/api/restaurant-auth/register').send({
      name: 'Alpha',
      email: 'alpha@ex.com',
      password: 'pass1234',
      cuisine: 'Grill',
      address: '1 Alpha Way'
    });
    await ra.post('/api/restaurant-auth/login').send({ email: 'alpha@ex.com', password: 'pass1234' });
    const idA = regA.body?.restaurant?.id || regA.body?.restaurant?._id;
    const miA = await MenuItem.create({ restaurantId: idA, name: 'Steak', price: 20, isAvailable: true });

    // Restaurant B + menu
    const rb = request.agent(app);
    const regB = await request(app).post('/api/restaurant-auth/register').send({
      name: 'Beta',
      email: 'beta@ex.com',
      password: 'pass1234',
      cuisine: 'Veg',
      address: '2 Beta Ave'
    });
    await rb.post('/api/restaurant-auth/login').send({ email: 'beta@ex.com', password: 'pass1234' });
    const idB = regB.body?.restaurant?.id || regB.body?.restaurant?._id;
    const miB = await MenuItem.create({ restaurantId: idB, name: 'Salad', price: 9, isAvailable: true });

    // Create one order for A and one for B
    await Order.create({
      userId: new mongoose.Types.ObjectId(),
      restaurantId: idA,
      items: [{ menuItemId: miA._id, name: 'Steak', price: 20, quantity: 1 }],
      subtotal: 20, deliveryFee: 3, discount: 0, appliedCode: null, total: 23,
      status: 'placed', paymentStatus: 'paid'
    });
    await Order.create({
      userId: new mongoose.Types.ObjectId(),
      restaurantId: idB,
      items: [{ menuItemId: miB._id, name: 'Salad', price: 9, quantity: 1 }],
      subtotal: 9, deliveryFee: 2, discount: 0, appliedCode: null, total: 11,
      status: 'placed', paymentStatus: 'paid'
    });

    // A should only see its order(s)
    const resA = await ra.get(`/api/restaurant-dashboard/orders`).query({ restaurantId: idA });
    expect(resA.status).toBe(200);
    expect(Array.isArray(resA.body)).toBe(true);
    expect(resA.body.length).toBeGreaterThanOrEqual(1);
    for (const o of resA.body) {
      expect(String(o.restaurantId)).toBe(String(idA));
    }

    // B should only see its order(s)
    const resB = await rb.get(`/api/restaurant-dashboard/orders`).query({ restaurantId: idB });
    expect(resB.status).toBe(200);
    for (const o of resB.body) {
      expect(String(o.restaurantId)).toBe(String(idB));
    }
  });
});
