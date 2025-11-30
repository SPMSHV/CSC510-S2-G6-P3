import express from "express";
import jwt from "jsonwebtoken";
import ChallengeSession from "../models/ChallengeSession.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import UserPerformance from "../models/UserPerformance.js";
import { rewardMap } from "../config/rewards.js";
import { calculateAdaptiveDifficulty } from "../utils/difficultyCalculator.js";

const router = express.Router();
const CHALLENGE_JWT_SECRET = process.env.CHALLENGE_JWT_SECRET || "dev-challenge-secret";
const JUDGE0_UI_URL = process.env.JUDGE0_UI_URL || "http://localhost:4000";

// 1. Start challenge session
router.post("/start", async (req, res) => {
  try {
    const userId = req.session?.customerId;
    const { orderId, difficulty } = req.body || {};
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    // 🎯 ADAPTIVE DIFFICULTY: If difficulty not provided, calculate it based on user performance
    let finalDifficulty = difficulty;
    if (!finalDifficulty) {
      finalDifficulty = await calculateAdaptiveDifficulty(userId);
    }

    // 🎯 CHESS SUPPORT: Check if challenge type is chess
    const { challengeType = "coding" } = req.body || {};
    
    // If chess challenge, return chess puzzle instead of coding challenge URL
    if (challengeType === "chess") {
      // Import chess routes functionality
      const ChessPuzzle = (await import("../models/ChessPuzzle.js")).default;
      const puzzles = await ChessPuzzle.find({ difficulty: finalDifficulty });
      
      if (puzzles.length === 0) {
        return res.status(404).json({ error: `No chess puzzles found for difficulty: ${finalDifficulty}` });
      }
      
      const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
      
      // Create challenge session for chess
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      const sess = await ChallengeSession.create({ 
        userId, 
        orderId, 
        difficulty: finalDifficulty, 
        expiresAt,
        challengeType: "chess",
        puzzleId: randomPuzzle._id
      });
      
      // Create token for chess challenge too (for consistency with frontend)
      const token = jwt.sign(
        {
          sid: sess._id.toString(),
          uid: String(userId),
          oid: String(orderId),
          diff: finalDifficulty,
          exp: Math.floor(expiresAt.getTime() / 1000),
          type: "chess"
        },
        CHALLENGE_JWT_SECRET
      );
      
      const url = `${JUDGE0_UI_URL}/?session=${encodeURIComponent(token)}&type=chess`;
      return res.json({ 
        url,
        challengeType: "chess",
        puzzleId: randomPuzzle._id.toString(),
        fen: randomPuzzle.fen,
        hint: randomPuzzle.hint,
        description: randomPuzzle.description,
        difficulty: finalDifficulty
      });
    }

    // Default: coding challenge
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const sess = await ChallengeSession.create({ userId, orderId, difficulty: finalDifficulty, expiresAt });

    const token = jwt.sign(
      {
        sid: sess._id.toString(),
        uid: String(userId),
        oid: String(orderId),
        diff: finalDifficulty,
        exp: Math.floor(expiresAt.getTime() / 1000)
      },
      CHALLENGE_JWT_SECRET
    );

    const url = `${JUDGE0_UI_URL}/?session=${encodeURIComponent(token)}`;
    res.json({ url, challengeType: "coding" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// 2. Get challenge session info (for Judge0 UI)
// 2. Get challenge session info (for Judge0 UI)
router.get("/session", async (req, res) => {
  try {
    const token = req.query?.token;
    if (!token) return res.status(400).json({ error: "token required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });

    // 🔴 NEW: if the linked order is delivered, expire the session immediately
    const order = await Order.findById(sess.orderId);
    if (order?.status === "delivered") {
      if (sess.status === "ACTIVE") {
        sess.status = "EXPIRED";
        sess.expiresAt = new Date();
        await sess.save();
      }
      return res.status(410).json({ error: "Session expired (order delivered)" });
    }

    if (sess.status !== "ACTIVE" || sess.expiresAt <= new Date())
      return res.status(410).json({ error: "Session expired" });

    // 🎯 CHESS SUPPORT: If it's a chess challenge, return puzzle data
    if (sess.challengeType === "chess" && sess.puzzleId) {
      const ChessPuzzle = (await import("../models/ChessPuzzle.js")).default;
      const puzzle = await ChessPuzzle.findById(sess.puzzleId);
      if (puzzle) {
        return res.json({
          userId: String(sess.userId),
          orderId: String(sess.orderId),
          difficulty: sess.difficulty,
          expiresAt: sess.expiresAt,
          challengeType: "chess",
          puzzleId: puzzle._id.toString(),
          fen: puzzle.fen,
          hint: puzzle.hint,
          description: puzzle.description,
          puzzleType: puzzle.puzzleType
        });
      }
    }

    res.json({
      userId: String(sess.userId),
      orderId: String(sess.orderId),
      difficulty: sess.difficulty,
      expiresAt: sess.expiresAt,
      challengeType: sess.challengeType || "coding"
    });
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: "Invalid or expired token" });
  }
});


// 3. Complete challenge (called when user solves it)
router.post("/complete", async (req, res) => {
  try {
    const token = req.body?.token;
    if (!token) return res.status(400).json({ error: "token required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });
    if (sess.status !== "ACTIVE" || sess.expiresAt <= new Date())
      return res.status(410).json({ error: "Too late — delivery completed" });

    const reward = rewardMap[sess.difficulty] || rewardMap.easy;
    const code = "FOOD-" + Math.random().toString(36).toUpperCase().slice(2, 8);

    await Coupon.create({
      userId: sess.userId,
      code,
      label: reward.label,
      discountPct: reward.discountPct,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    sess.status = "WON";
    await sess.save();

    // 🧩 Mark the corresponding order as completed
    await Order.findByIdAndUpdate(sess.orderId, {
      $set: { challengeStatus: "COMPLETED" }
    });

    // 🎯 ADAPTIVE DIFFICULTY: Update user performance metrics
    try {
      const solveTime = (new Date() - new Date(sess.createdAt)) / 1000; // in seconds
      let userPerf = await UserPerformance.findOne({ userId: sess.userId });
      if (!userPerf) {
        userPerf = await UserPerformance.create({ userId: sess.userId });
      }
      userPerf.totalChallenges = (userPerf.totalChallenges || 0) + 1;
      userPerf.completedChallenges = (userPerf.completedChallenges || 0) + 1;
      userPerf.lastDifficulty = sess.difficulty;
      
      // Update average solve time
      if (userPerf.averageSolveTime === 0) {
        userPerf.averageSolveTime = solveTime;
      } else {
        userPerf.averageSolveTime = (userPerf.averageSolveTime + solveTime) / 2;
      }
      await userPerf.save();
    } catch (perfError) {
      console.error("Error updating user performance:", perfError);
      // Don't fail the request if performance update fails
    }

    res.json({ code, label: reward.label, discountPct: reward.discountPct });
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: "Invalid or expired token" });
  }
});

// 4. Record a failed run; expire if delivery is done
router.post("/result", async (req, res) => {
  try {
    const { token, passed } = req.body || {};
    if (!token) return res.status(400).json({ error: "token required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });

    // if already closed, just acknowledge
    if (sess.status !== "ACTIVE") return res.json({ ok: true, closed: true });

    // If the run PASSED, do nothing here — /complete will handle coupon & WIN
    if (passed === true) return res.json({ ok: true });

    // On FAIL: if order is delivered, expire the session now (no more tries)
    const order = await Order.findById(sess.orderId);
    if (order?.status === "delivered") {
      sess.status = "EXPIRED";
      sess.expiresAt = new Date();
      await sess.save();

      await Order.findByIdAndUpdate(sess.orderId, {
        $set: { challengeStatus: "FAILED_AFTER_DELIVERY" }
      });

      // 🎯 ADAPTIVE DIFFICULTY: Update user performance for failed challenge
      try {
        let userPerf = await UserPerformance.findOne({ userId: sess.userId });
        if (!userPerf) {
          userPerf = await UserPerformance.create({ userId: sess.userId });
        }
        userPerf.totalChallenges = (userPerf.totalChallenges || 0) + 1;
        // completedChallenges stays the same (failed)
        await userPerf.save();
      } catch (perfError) {
        console.error("Error updating user performance:", perfError);
      }

      return res.status(410).json({ error: "Time up — order delivered" });
    }

    // Otherwise (not delivered yet), just ack the failure (user can try again)
    return res.json({ ok: true });
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: "Invalid or expired token" });
  }
});


// 5. Mark challenge as failed / expired (optional)
router.post("/fail", async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "token required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });

    sess.status = "LOST";
    await sess.save();

    // 🧩 Mark the order as FAILED
    await Order.findByIdAndUpdate(sess.orderId, {
      $set: { challengeStatus: "FAILED" }
    });

    // 🎯 ADAPTIVE DIFFICULTY: Update user performance for failed challenge
    try {
      let userPerf = await UserPerformance.findOne({ userId: sess.userId });
      if (!userPerf) {
        userPerf = await UserPerformance.create({ userId: sess.userId });
      }
      userPerf.totalChallenges = (userPerf.totalChallenges || 0) + 1;
      // completedChallenges stays the same (failed)
      await userPerf.save();
    } catch (perfError) {
      console.error("Error updating user performance:", perfError);
    }

    res.json({ ok: true });
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: "Invalid or expired token" });
  }
});


export default router;
