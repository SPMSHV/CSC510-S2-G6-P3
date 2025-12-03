import {
  setupTestDB,
  closeTestDB,
  newAgent,
  registerAndLoginCustomer,
  createRestaurant,
} from "../helpers/testUtils.js";
import ChessPuzzle from "../../models/ChessPuzzle.js";
import Coupon from "../../models/Coupon.js";
import Order from "../../models/Order.js";

describe("Chess Puzzle Completion", () => {
  let agent;

  beforeAll(async () => {
    await setupTestDB();
    agent = await newAgent();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await ChessPuzzle.deleteMany({});
    await Coupon.deleteMany({});
    await Order.deleteMany({});
  });

  describe("POST /api/chess/complete", () => {
    it("should complete puzzle and issue coupon reward", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const puzzle = await ChessPuzzle.create({
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solutionMoves: ["e2e4"],
        difficulty: "easy",
        puzzleType: "tactical",
        hint: "Start with e4",
        description: "Basic opening"
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
        .post("/api/chess/complete")
        .send({
          puzzleId: puzzle._id.toString(),
          orderId: order._id.toString(),
          difficulty: "easy"
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.code).toBeDefined();
      expect(res.body.code).toMatch(/^CHESS-/);
      expect(res.body.label).toBeDefined();
      expect(res.body.discountPct).toBeDefined();

      // Verify coupon was created
      const coupon = await Coupon.findOne({ userId: customer._id, code: res.body.code });
      expect(coupon).toBeTruthy();
      expect(coupon.discountPct).toBe(res.body.discountPct);
    });

    it("should return 401 when not logged in", async () => {
      const unauthAgent = await newAgent();
      const puzzle = await ChessPuzzle.create({
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solutionMoves: ["e2e4"],
        difficulty: "easy",
        puzzleType: "tactical"
      });

      await unauthAgent
        .post("/api/chess/complete")
        .send({
          puzzleId: puzzle._id.toString()
        })
        .expect(401);
    });

    it("should return 400 when puzzleId is missing", async () => {
      await registerAndLoginCustomer(agent);

      await agent
        .post("/api/chess/complete")
        .send({})
        .expect(400);
    });

    it("should return 404 when puzzle not found", async () => {
      await registerAndLoginCustomer(agent);

      await agent
        .post("/api/chess/complete")
        .send({
          puzzleId: "64b000000000000000000000"
        })
        .expect(404);
    });

    it("should use puzzle's difficulty if not provided", async () => {
      const { customer } = await registerAndLoginCustomer(agent);
      const restaurant = await createRestaurant();

      const puzzle = await ChessPuzzle.create({
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solutionMoves: ["e2e4"],
        difficulty: "medium",
        puzzleType: "tactical"
      });

      const res = await agent
        .post("/api/chess/complete")
        .send({
          puzzleId: puzzle._id.toString()
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      // Should use medium difficulty reward
      expect(res.body.discountPct).toBe(10); // Medium = 10%
    });
  });

  describe("GET /api/chess/puzzle/:difficulty", () => {
    it("should return a random puzzle for given difficulty", async () => {
      await ChessPuzzle.create({
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solutionMoves: ["e2e4"],
        difficulty: "easy",
        puzzleType: "tactical",
        hint: "Start with e4",
        description: "Basic opening"
      });

      await ChessPuzzle.create({
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
        solutionMoves: ["e7e5"],
        difficulty: "easy",
        puzzleType: "tactical",
        hint: "Respond with e5",
        description: "King's pawn opening"
      });

      const res = await agent
        .get("/api/chess/puzzle/easy")
        .expect(200);

      expect(res.body.puzzleId).toBeDefined();
      expect(res.body.fen).toBeDefined();
      expect(res.body.hint).toBeDefined();
      expect(res.body.description).toBeDefined();
      expect(res.body.difficulty).toBe("easy");
    });

    it("should return 400 for invalid difficulty", async () => {
      await agent
        .get("/api/chess/puzzle/invalid")
        .expect(400);
    });

    it("should return 404 when no puzzles found for difficulty", async () => {
      await agent
        .get("/api/chess/puzzle/hard")
        .expect(404);
    });
  });
});


