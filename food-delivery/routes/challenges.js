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
      const INITIAL_FEN_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
      
      // Query puzzles with solution moves at database level
      // MongoDB query: solutionMoves exists and is an array
      // Don't filter by puzzleType to ensure variety - randomly select from all types
      const puzzles = await ChessPuzzle.find({ 
        difficulty: finalDifficulty,
        solutionMoves: { $exists: true, $type: "array" }
      });
      
      // Filter to only include puzzles with non-empty solutionMoves and valid FEN
      const validPuzzles = puzzles.filter(puzzle => {
        const hasValidSolutionMoves = puzzle.solutionMoves && 
                                       Array.isArray(puzzle.solutionMoves) && 
                                       puzzle.solutionMoves.length > 0;
        const fenPosition = puzzle.fen?.split(' ')[0];
        const hasValidFen = fenPosition !== INITIAL_FEN_POSITION && puzzle.fen && puzzle.fen.trim();
        return hasValidSolutionMoves && hasValidFen;
      });
      
      if (validPuzzles.length === 0) {
        return res.status(404).json({ error: `No valid chess puzzles with solutions found for difficulty: ${finalDifficulty}` });
      }
      
      // Randomly select a puzzle to ensure variety in puzzleType
      const randomPuzzle = validPuzzles[Math.floor(Math.random() * validPuzzles.length)];
      
      // Final validation - ensure solution moves exist
      if (!randomPuzzle.solutionMoves || !Array.isArray(randomPuzzle.solutionMoves) || randomPuzzle.solutionMoves.length === 0) {
        console.error(`ERROR: Selected puzzle ${randomPuzzle._id} has no solution moves despite filtering!`);
        return res.status(500).json({ error: "Internal error: selected puzzle has no solution" });
      }
      
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
        puzzleType: randomPuzzle.puzzleType,
        difficulty: finalDifficulty,
        solutionMoves: randomPuzzle.solutionMoves // CRITICAL: Always include solution moves
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
    
    // Support updating puzzle via query parameters (fallback if PUT doesn't work)
    const updatePuzzleId = req.query?.updatePuzzleId;
    const updateDifficulty = req.query?.updateDifficulty;
    let puzzleIdToLoad = sess.puzzleId; // Default to current puzzleId
    if (updatePuzzleId && sess.challengeType === "chess") {
      const ChessPuzzle = (await import("../models/ChessPuzzle.js")).default;
      const puzzle = await ChessPuzzle.findById(updatePuzzleId);
      if (puzzle) {
        console.log(`🔄 Updating session ${sess._id}: puzzleId ${sess.puzzleId} -> ${updatePuzzleId}, difficulty ${sess.difficulty} -> ${updateDifficulty}`);
        sess.puzzleId = updatePuzzleId;
        puzzleIdToLoad = updatePuzzleId; // Use the new puzzleId
        if (updateDifficulty) sess.difficulty = updateDifficulty;
        await sess.save();
        console.log(`✅ Session ${sess._id} updated via GET: puzzleId=${sess.puzzleId}, difficulty=${sess.difficulty}`);
      } else {
        console.error(`❌ Puzzle ${updatePuzzleId} not found in database`);
      }
    }

    // 🔴 Check if the linked order is delivered - only expire if actually delivered
    const order = await Order.findById(sess.orderId);
    if (order?.status === "delivered") {
      if (sess.status === "ACTIVE") {
        sess.status = "EXPIRED";
        sess.expiresAt = new Date();
        await sess.save();
      }
      return res.status(410).json({ error: "Session expired (order delivered)" });
    }
    // Note: Order can be "out_for_delivery" or "ready_for_pickup" - challenge is still valid
    
    // If session expired but order not delivered, extend it instead of rejecting
    if (sess.status !== "ACTIVE" && order && order.status !== "delivered") {
      sess.status = "ACTIVE";
      sess.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 more minutes
      await sess.save();
    }
    
    if (sess.expiresAt <= new Date() && order && order.status !== "delivered") {
      // Extend expiration if order is still in transit
      sess.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 more minutes
      await sess.save();
    }
    
    // Only reject if session is expired AND order is delivered
    if (sess.status !== "ACTIVE" || (sess.expiresAt <= new Date() && order?.status === "delivered")) {
      return res.status(410).json({ error: "Session expired" });
    }

    // 🎯 CHESS SUPPORT: If it's a chess challenge, return puzzle data
    if (sess.challengeType === "chess" && puzzleIdToLoad) {
      const ChessPuzzle = (await import("../models/ChessPuzzle.js")).default;
      console.log(`📋 Loading puzzle: puzzleId=${puzzleIdToLoad}, session.difficulty=${sess.difficulty}`);
      const puzzle = await ChessPuzzle.findById(puzzleIdToLoad);
      if (puzzle) {
        // Validate FEN is not the initial position
        const INITIAL_FEN_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
        const puzzleFenPosition = puzzle.fen.split(' ')[0]; // Get just the position part
        
        if (puzzleFenPosition === INITIAL_FEN_POSITION) {
          console.error(`ERROR: Puzzle ${puzzle._id} has initial position FEN! This should not happen.`);
          return res.status(500).json({ 
            error: "Invalid puzzle: puzzle position cannot be the initial chess position. Please contact support." 
          });
        }
        
        if (!puzzle.fen || !puzzle.fen.trim()) {
          console.error(`ERROR: Puzzle ${puzzle._id} has empty or invalid FEN!`);
          return res.status(500).json({ 
            error: "Invalid puzzle: missing position data. Please contact support." 
          });
        }
        
        // Validate that solution moves exist
        if (!puzzle.solutionMoves || !Array.isArray(puzzle.solutionMoves) || puzzle.solutionMoves.length === 0) {
          console.error(`ERROR: Puzzle ${puzzle._id} has no solution moves!`);
          return res.status(500).json({ 
            error: "Invalid puzzle: missing solution data. Please contact support." 
          });
        }
        
        // Log what we're about to send
        console.log(`✅ Puzzle ${puzzle._id} has solutionMoves:`, puzzle.solutionMoves);
        console.log(`✅ solutionMoves type:`, typeof puzzle.solutionMoves);
        console.log(`✅ solutionMoves isArray:`, Array.isArray(puzzle.solutionMoves));
        console.log(`✅ solutionMoves length:`, puzzle.solutionMoves.length);
        
        const responseData = {
          userId: String(sess.userId),
          orderId: String(sess.orderId),
          difficulty: sess.difficulty,
          expiresAt: sess.expiresAt,
          challengeType: "chess",
          puzzleId: puzzle._id.toString(),
          fen: puzzle.fen,
          hint: puzzle.hint,
          description: puzzle.description,
          puzzleType: puzzle.puzzleType,
          solutionMoves: puzzle.solutionMoves // Include solution moves for frontend validation
        };
        
        console.log(`✅ Sending response with solutionMoves:`, responseData.solutionMoves);
        console.log(`✅ Full response data:`, JSON.stringify(responseData, null, 2));
        
        return res.json(responseData);
      } else {
        console.error(`ERROR: Puzzle ${sess.puzzleId} not found in database!`);
        return res.status(404).json({ error: "Puzzle not found" });
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
    
    // 🔑 KEY FIX: Check order status FIRST - challenge is valid until order is delivered
    // This allows users to complete challenges even if driver has arrived at restaurant
    // (order status: "out_for_delivery" or "ready_for_pickup" are still valid)
    const order = await Order.findById(sess.orderId);
    if (order?.status === "delivered") {
      // Order is delivered - too late to complete challenge
      if (sess.status === "ACTIVE") {
        sess.status = "EXPIRED";
        sess.expiresAt = new Date();
        await sess.save();
      }
      return res.status(410).json({ error: "Too late — order has been delivered" });
    }
    
    // If order is NOT delivered, allow challenge completion
    // Reactivate session if it was expired but order is still valid
    if (sess.status !== "ACTIVE" && order && order.status !== "delivered") {
      sess.status = "ACTIVE";
      // Extend expiration to allow completion
      sess.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 more minutes
      await sess.save();
    }
    
    // If session expired but order not delivered, extend it
    if (sess.expiresAt <= new Date() && order && order.status !== "delivered") {
      sess.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 more minutes
      await sess.save();
    }
    
    // Final check: if session is still not ACTIVE after reactivation attempt, reject
    if (sess.status !== "ACTIVE") {
      return res.status(410).json({ error: "Session expired" });
    }

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
    console.error("Challenge complete error:", err);
    // Provide more specific error messages
    if (err?.name === "TokenExpiredError") {
      return res.status(410).json({ error: "Challenge session expired. Too late — delivery completed." });
    }
    if (err?.name === "JsonWebTokenError" || err?.name === "NotBeforeError") {
      return res.status(401).json({ error: "Invalid challenge token. Please start a new challenge." });
    }
    // For other errors, return 401 with the actual error message for debugging
    const code = err?.name === "TokenExpiredError" ? 410 : 401;
    res.status(code).json({ error: err.message || "Invalid or expired token" });
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

// 3. Update challenge session (for changing puzzle/difficulty)
router.put("/session", async (req, res) => {
  try {
    const { token, info } = req.body;
    if (!token) return res.status(400).json({ error: "token required" });
    if (!info) return res.status(400).json({ error: "info required" });

    const payload = jwt.verify(token, CHALLENGE_JWT_SECRET);
    const sess = await ChallengeSession.findById(payload.sid);
    if (!sess) return res.status(404).json({ error: "Session not found" });

    // Update puzzleId if it's a chess challenge and new puzzle info is provided
    if (sess.challengeType === "chess" && info.puzzleId) {
      const ChessPuzzle = (await import("../models/ChessPuzzle.js")).default;
      const puzzle = await ChessPuzzle.findById(info.puzzleId);
      if (!puzzle) {
        console.error(`❌ Puzzle not found: ${info.puzzleId}`);
        return res.status(404).json({ error: "Puzzle not found" });
      }
      
      console.log(`✅ Updating session ${sess._id} with new puzzle ${info.puzzleId} (difficulty: ${info.difficulty})`);
      
      // Update the session with new puzzle
      sess.puzzleId = info.puzzleId;
      sess.difficulty = info.difficulty || sess.difficulty;
      await sess.save();
      
      console.log(`✅ Session updated successfully. New puzzleId: ${sess.puzzleId}, difficulty: ${sess.difficulty}`);
      
      return res.json({ 
        success: true,
        message: "Session updated with new puzzle",
        puzzleId: sess.puzzleId,
        difficulty: sess.difficulty
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating session:", err);
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
