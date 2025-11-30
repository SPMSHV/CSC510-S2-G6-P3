import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";


let mongoServer = null;
let __appRef = null;

export async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();


  await mongoose.connect(uri);

  const { default: app } = await import("../../server.js");

  __appRef = app;

 
  const agent = request.agent(app);

  return { agent, app };
}
export function getApp() {
  if (!__appRef) throw new Error("Call setupTestDB() before getApp()");
  return __appRef;
}

export function newAgent() {
  if (!__appRef) throw new Error("Call setupTestDB() before newAgent()");
  return request.agent(__appRef);
}


export async function closeTestDB() {
  // optional: isolate each suite even harder
  if (mongoose.connection.readyState === 1) {
    // drop only if connected
    if (mongoose.connection.db) {
      try { await mongoose.connection.dropDatabase(); } catch {}
    }
  }
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }

  __appRef = null;
}

export async function registerAndLoginCustomer(agent, overrides = {}) {
  const email = overrides.email || `user_${Date.now()}@test.com`;
  const password = overrides.password || "secret123";
  const address = overrides.address || "123 Main Street, Raleigh, NC";

  await agent
    .post("/api/customer-auth/register")
    .send({
      name: overrides.name || "Test User",
      email,
      password,
      address,
    })
    .expect(201);

  await agent
    .post("/api/customer-auth/login")
    .send({ email, password })
    .expect(200);

  const customer = await mongoose.model("CustomerAuth").findOne({ email });
  return { customer, email, password };
}


export async function createRestaurant(data = {}) {
  const Restaurant = mongoose.model("Restaurant");
  return await Restaurant.create({
    name: data.name || "Testaurant",
    cuisine: data.cuisine || "Italian",
    deliveryFee: data.deliveryFee ?? 2.99,
    address: data.address || "456 Curry Lane, Raleigh, NC",
  });
}


export async function registerAndLoginRestaurant(agent, overrides = {}) {
  const email = overrides.email || `rest_${Date.now()}@test.com`;
  const password = overrides.password || "flavor123";

  await agent
    .post("/api/restaurant-auth/register")
    .send({
      name: overrides.name || "Taste House",
      email,
      password,
      cuisine: overrides.cuisine || "Italian",
      address: overrides.address || "456 Curry Lane, Raleigh, NC",
    })
    .expect(201);

  await agent
    .post("/api/restaurant-auth/login")
    .send({ email, password })
    .expect(200);

  const meRes = await agent.get("/api/restaurant-auth/me").expect(200);
  const restaurantId = meRes.body.restaurantId;

  return {
    restaurant: { name: overrides.name || "Taste House", _id: restaurantId },
    email,
    password,
  };
}
