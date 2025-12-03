import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import Order from "../../models/Order.js";
import ChallengeSession from "../../models/ChallengeSession.js";
import ChessPuzzle from "../../models/ChessPuzzle.js";
import Coupon from "../../models/Coupon.js";

describe("Chess Puzzle Challenges", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await ChallengeSession.deleteMany({});
    await Coupon.deleteMany({});
    await ChessPuzzle.deleteMany({});
    await Order.deleteMany({});
  });

  describe("POST /api/challenges/start with chess challengeType", () => {
    it("should start a chess puzzle challenge", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      // Create a chess puzzle (using a valid non-initial position)
      const puzzle = await ChessPuzzle.create({
        fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2",
        solutionMoves: ["d8h4"],
        difficulty: "easy",
        puzzleType: "checkmate",
        hint: "The queen can deliver checkmate",
        description: "Find the checkmate in 1 move"
      });

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "out_for_delivery",
        paymentStatus: "paid",
      });

      const res = await agent
        .post("/api/challenges/start")
        .send({
          orderId: order._id.toString(),
          challengeType: "chess",
          difficulty: "easy"
        })
        .expect(200);

      expect(res.body.challengeType).toBe("chess");
      expect(res.body.puzzleId).toBeDefined();
      expect(res.body.fen).toBeDefined();
      expect(res.body.hint).toBeDefined();
      expect(res.body.description).toBeDefined();
      expect(res.body.url).toContain("type=chess");

      // Verify session was created
      const token = new URL(res.body.url).searchParams.get("session");
      const payload = JSON.parse(atob(token.split(".")[1]));
      const session = await ChallengeSession.findById(payload.sid);
      expect(session).toBeTruthy();
      expect(session.challengeType).toBe("chess");
      expect(session.puzzleId.toString()).toBe(puzzle._id.toString());
    });

    it("should default to coding challenge when challengeType not specified", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "out_for_delivery",
        paymentStatus: "paid",
      });

      const res = await agent
        .post("/api/challenges/start")
        .send({
          orderId: order._id.toString(),
          difficulty: "easy"
        })
        .expect(200);

      // Default challenge type is "coding" (not explicitly set in response)
      expect(res.body.url).not.toContain("type=chess");
    });

    it("should return 404 if no chess puzzles found for difficulty", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "out_for_delivery",
        paymentStatus: "paid",
      });

      // No puzzles in database
      const res = await agent
        .post("/api/challenges/start")
        .send({
          orderId: order._id.toString(),
          challengeType: "chess",
          difficulty: "hard"
        })
        .expect(404);

      expect(res.body.error).toContain("No valid chess puzzles with solutions found");
    });
  });

  describe("POST /api/chess/verify", () => {
    it("should verify correct chess puzzle solution", async () => {
      const puzzle = await ChessPuzzle.create({
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        solutionMoves: ["c4f7"],
        difficulty: "easy",
        puzzleType: "tactical",
        hint: "Bishop can deliver a powerful check",
        description: "Find the winning move"
      });

      const res = await agent
        .post("/api/chess/verify")
        .send({
          puzzleId: puzzle._id.toString(),
          moves: ["c4f7"]
        })
        .expect(200);

      expect(res.body.solved).toBe(true);
      expect(res.body.message).toContain("solved");
    });

    it("should reject incorrect chess puzzle solution", async () => {
      const puzzle = await ChessPuzzle.create({
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        solutionMoves: ["c4f7"],
        difficulty: "easy",
        puzzleType: "tactical",
        hint: "Bishop can deliver a powerful check",
        description: "Find the winning move"
      });

      const res = await agent
        .post("/api/chess/verify")
        .send({
          puzzleId: puzzle._id.toString(),
          moves: ["f3g5"] // Wrong move (should be c4f7)
        })
        .expect(200);

      expect(res.body.solved).toBe(false);
    });

    it("should return 400 for invalid puzzleId or moves", async () => {
      await agent
        .post("/api/chess/verify")
        .send({
          puzzleId: "invalid",
          moves: ["e2e4"]
        })
        .expect(400);

      await agent
        .post("/api/chess/verify")
        .send({
          puzzleId: "64b000000000000000000000",
          moves: "not-an-array"
        })
        .expect(400);
    });
  });

  describe("GET /api/challenges/session with chess challenge", () => {
    it("should return chess puzzle data for chess challenge session", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const puzzle = await ChessPuzzle.create({
        fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2",
        solutionMoves: ["d8h4"],
        difficulty: "easy",
        puzzleType: "checkmate",
        hint: "The queen can deliver checkmate",
        description: "Find the checkmate in 1 move"
      });

      const order = await Order.create({
        userId: customer._id,
        restaurantId: restaurant._id,
        items: [{ menuItemId: restaurant._id, name: "Test Item", price: 10, quantity: 1 }],
        subtotal: 10,
        total: 10,
        status: "out_for_delivery",
        paymentStatus: "paid",
      });

      // Start chess challenge
      const startRes = await agent
        .post("/api/challenges/start")
        .send({
          orderId: order._id.toString(),
          challengeType: "chess",
          difficulty: "easy"
        })
        .expect(200);

      const token = new URL(startRes.body.url).searchParams.get("session");

      // Get session info
      const sessionRes = await agent
        .get(`/api/challenges/session?token=${encodeURIComponent(token)}`)
        .expect(200);

      expect(sessionRes.body.challengeType).toBe("chess");
      expect(sessionRes.body.puzzleId).toBeDefined();
      expect(sessionRes.body.fen).toBeDefined();
      expect(sessionRes.body.hint).toBeDefined();
      expect(sessionRes.body.description).toBeDefined();
    });
  });
});

