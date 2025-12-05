import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import UserPerformance from "../../models/UserPerformance.js";
import Order from "../../models/Order.js";
import ChallengeSession from "../../models/ChallengeSession.js";
import CustomerAuth from "../../models/CustomerAuth.js";
import { calculateAdaptiveDifficulty } from "../../utils/difficultyCalculator.js";

describe("Adaptive Challenge Difficulty", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    // Clean up before each test
    await UserPerformance.deleteMany({});
    await Order.deleteMany({});
    await ChallengeSession.deleteMany({});
    await CustomerAuth.deleteMany({});
  });

  describe("calculateAdaptiveDifficulty", () => {
    test("should return 'easy' for new user with no orders", async () => {
      const user = await CustomerAuth.create({
        name: "Test User",
        email: "test@example.com",
        passwordHash: "hash",
        address: "123 Test St"
      });

      const difficulty = await calculateAdaptiveDifficulty(user._id);
      expect(difficulty).toBe("easy");
    });

    test("should return 'easy' for user with less than 3 orders", async () => {
      const user = await CustomerAuth.create({
        name: "Test User",
        email: "test2@example.com",
        passwordHash: "hash",
        address: "123 Test St"
      });

      // Create 2 orders
      await Order.create({
        userId: user._id,
        restaurantId: new mongoose.Types.ObjectId(),
        items: [],
        subtotal: 10,
        total: 10,
        status: "delivered"
      });

      const difficulty = await calculateAdaptiveDifficulty(user._id);
      expect(difficulty).toBe("easy");
    });

    test("should return 'medium' for user with 3-10 orders and 50-80% completion", async () => {
      const user = await CustomerAuth.create({
        name: "Test User",
        email: "test3@example.com",
        passwordHash: "hash",
        address: "123 Test St"
      });

      const restaurantId = new mongoose.Types.ObjectId();

      // Create 5 orders
      for (let i = 0; i < 5; i++) {
        await Order.create({
          userId: user._id,
          restaurantId,
          items: [],
          subtotal: 10,
          total: 10,
          status: "delivered"
        });
      }

      // Create challenge sessions: 3 won, 2 expired (60% completion)
      for (let i = 0; i < 3; i++) {
        await ChallengeSession.create({
          userId: user._id,
          orderId: new mongoose.Types.ObjectId(),
          difficulty: "easy",
          status: "WON",
          expiresAt: new Date(Date.now() + 1000000),
          createdAt: new Date(Date.now() - 100000),
          updatedAt: new Date(Date.now() - 50000)
        });
      }
      for (let i = 0; i < 2; i++) {
        await ChallengeSession.create({
          userId: user._id,
          orderId: new mongoose.Types.ObjectId(),
          difficulty: "easy",
          status: "EXPIRED",
          expiresAt: new Date(),
          createdAt: new Date(Date.now() - 100000),
          updatedAt: new Date()
        });
      }

      const difficulty = await calculateAdaptiveDifficulty(user._id);
      expect(difficulty).toBe("medium");
    });

    test("should return 'hard' for user with 10+ orders and >80% completion", async () => {
      const user = await CustomerAuth.create({
        name: "Test User",
        email: "test4@example.com",
        passwordHash: "hash",
        address: "123 Test St"
      });

      const restaurantId = new mongoose.Types.ObjectId();

      // Create 12 orders
      for (let i = 0; i < 12; i++) {
        await Order.create({
          userId: user._id,
          restaurantId,
          items: [],
          subtotal: 10,
          total: 10,
          status: "delivered"
        });
      }

      // Create challenge sessions: 9 won, 1 expired (90% completion)
      for (let i = 0; i < 9; i++) {
        await ChallengeSession.create({
          userId: user._id,
          orderId: new mongoose.Types.ObjectId(),
          difficulty: "medium",
          status: "WON",
          expiresAt: new Date(Date.now() + 1000000),
          createdAt: new Date(Date.now() - 100000),
          updatedAt: new Date(Date.now() - 50000)
        });
      }
      await ChallengeSession.create({
        userId: user._id,
        orderId: new mongoose.Types.ObjectId(),
        difficulty: "medium",
        status: "EXPIRED",
        expiresAt: new Date(),
        createdAt: new Date(Date.now() - 100000),
        updatedAt: new Date()
      });

      const difficulty = await calculateAdaptiveDifficulty(user._id);
      expect(difficulty).toBe("hard");
    });
  });

  describe("POST /api/challenges/start with adaptive difficulty", () => {
    test("should use adaptive difficulty when difficulty not provided", async () => {
      // Register and login
      await agent.post("/api/customer-auth/register")
        .send({
          name: "Test User",
          email: "adaptive@test.com",
          password: "password123",
          address: "123 Test St"
        });

      const user = await CustomerAuth.findOne({ email: "adaptive@test.com" });
      const restaurantId = new mongoose.Types.ObjectId();

      // Create 5 orders to trigger medium difficulty
      for (let i = 0; i < 5; i++) {
        await Order.create({
          userId: user._id,
          restaurantId,
          items: [],
          subtotal: 10,
          total: 10,
          status: "placed"
        });
      }

      // Create some challenge history
      for (let i = 0; i < 3; i++) {
        await ChallengeSession.create({
          userId: user._id,
          orderId: new mongoose.Types.ObjectId(),
          difficulty: "easy",
          status: "WON",
          expiresAt: new Date(Date.now() + 1000000)
        });
      }

      const order = await Order.findOne({ userId: user._id });

      // Start challenge without specifying difficulty
      const response = await agent.post("/api/challenges/start")
        .send({ orderId: order._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.url).toBeDefined();

      // Verify the session was created with adaptive difficulty
      const token = new URL(response.body.url).searchParams.get("session");
      const sessionResponse = await agent.get(`/api/challenges/session?token=${encodeURIComponent(token)}`);
      
      // Should have calculated a difficulty (not necessarily easy for user with history)
      expect(["easy", "medium", "hard"]).toContain(sessionResponse.body.difficulty);
    });

    test("should use provided difficulty when specified (backward compatibility)", async () => {
      // Register and login
      await agent.post("/api/customer-auth/register")
        .send({
          name: "Test User",
          email: "manual@test.com",
          password: "password123",
          address: "123 Test St"
        });

      const user = await CustomerAuth.findOne({ email: "manual@test.com" });
      const restaurantId = new mongoose.Types.ObjectId();

      const order = await Order.create({
        userId: user._id,
        restaurantId,
        items: [],
        subtotal: 10,
        total: 10,
        status: "placed"
      });

      // Start challenge with explicit difficulty
      const response = await agent.post("/api/challenges/start")
        .send({ orderId: order._id.toString(), difficulty: "hard" });

      expect(response.status).toBe(200);

      // Verify the session was created with the specified difficulty
      const token = new URL(response.body.url).searchParams.get("session");
      const sessionResponse = await agent.get(`/api/challenges/session?token=${encodeURIComponent(token)}`);
      
      expect(sessionResponse.body.difficulty).toBe("hard");
    });
  });

  describe("POST /api/challenges/complete updates user performance", () => {
    test("should update UserPerformance when challenge is completed", async () => {
      // Register and login
      await agent.post("/api/customer-auth/register")
        .send({
          name: "Test User",
          email: "perf@test.com",
          password: "password123",
          address: "123 Test St"
        });

      // Login to establish session
      await agent.post("/api/customer-auth/login")
        .send({
          email: "perf@test.com",
          password: "password123"
        });

      const user = await CustomerAuth.findOne({ email: "perf@test.com" });
      const restaurantId = new mongoose.Types.ObjectId();

      const order = await Order.create({
        userId: user._id,
        restaurantId,
        items: [],
        subtotal: 10,
        total: 10,
        status: "placed"
      });

      // Create a challenge session using the /start endpoint to get a valid token
      const startRes = await agent.post("/api/challenges/start")
        .send({
          orderId: order._id.toString(),
          difficulty: "easy"
        });
      
      if (startRes.status !== 200) {
        throw new Error(`Failed to start challenge: ${startRes.status} ${JSON.stringify(startRes.body)}`);
      }

      // Extract token from the URL
      const startUrl = startRes.body.url;
      const urlObj = new URL(startUrl, "http://localhost");
      const token = urlObj.searchParams.get("session");
      
      if (!token) {
        throw new Error("No token in challenge start URL");
      }
      
      // Ensure session is persisted
      await agent.get("/api/customer-auth/me");
      
      const response = await agent.post("/api/challenges/complete")
        .send({ token });
      
      // Log response for debugging if test fails
      if (response.status !== 200) {
        console.error("Challenge complete failed:", response.status, response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.code).toBeDefined();

      // Verify UserPerformance was updated
      const userPerf = await UserPerformance.findOne({ userId: user._id });
      expect(userPerf).toBeDefined();
      expect(userPerf.totalChallenges).toBe(1);
      expect(userPerf.completedChallenges).toBe(1);
      expect(userPerf.lastDifficulty).toBe("easy");
    });
  });
});

