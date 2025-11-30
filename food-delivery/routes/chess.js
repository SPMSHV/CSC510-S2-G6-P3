import express from "express";
import { Chess } from "chess.js";
import ChessPuzzle from "../models/ChessPuzzle.js";
import Coupon from "../models/Coupon.js";
import { rewardMap } from "../config/rewards.js";

const router = express.Router();

/**
 * GET /api/chess/puzzle/:difficulty
 * Get a random chess puzzle matching the specified difficulty
 */
router.get("/puzzle/:difficulty", async (req, res) => {
  try {
    const { difficulty } = req.params;
    
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json({ error: "Invalid difficulty. Must be easy, medium, or hard" });
    }

    // Get a random puzzle of the specified difficulty
    const puzzles = await ChessPuzzle.find({ difficulty });
    
    if (puzzles.length === 0) {
      return res.status(404).json({ error: `No puzzles found for difficulty: ${difficulty}` });
    }

    const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
    
    res.json({
      puzzleId: randomPuzzle._id,
      fen: randomPuzzle.fen,
      hint: randomPuzzle.hint,
      description: randomPuzzle.description,
      puzzleType: randomPuzzle.puzzleType,
      difficulty: randomPuzzle.difficulty
    });
  } catch (err) {
    console.error("Error fetching chess puzzle:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/chess/verify
 * Verify if user's move sequence solves the puzzle
 * Body: { puzzleId, moves: ["e2e4", "e7e5", ...] }
 */
router.post("/verify", async (req, res) => {
  try {
    const { puzzleId, moves } = req.body;
    
    if (!puzzleId || !Array.isArray(moves)) {
      return res.status(400).json({ error: "puzzleId and moves array are required" });
    }

    const puzzle = await ChessPuzzle.findById(puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }

    // Initialize chess board with puzzle's starting position
    const chess = new Chess(puzzle.fen);
    
    // Try to apply user's moves
    try {
      for (const move of moves) {
        const result = chess.move(move);
        if (!result) {
          return res.json({
            solved: false,
            message: `Invalid move: ${move}`,
            validMoves: chess.moves()
          });
        }
      }
    } catch (err) {
      return res.json({
        solved: false,
        message: `Error applying moves: ${err.message}`,
        validMoves: chess.moves()
      });
    }

    // Check if the puzzle is solved
    // For checkmate puzzles, check if the game is in checkmate
    // For tactical puzzles, check if the solution moves match
    let solved = false;
    let message = "";

    if (puzzle.puzzleType === "checkmate") {
      solved = chess.isCheckmate();
      if (solved) {
        message = "Checkmate! Puzzle solved correctly!";
      } else {
        message = "Not checkmate yet. Keep trying!";
      }
    } else {
      // For other puzzle types, check if moves match solution
      // Allow for different move orders or alternative solutions
      const solutionFen = new Chess(puzzle.fen);
      for (const move of puzzle.solutionMoves) {
        solutionFen.move(move);
      }
      
      // Check if current position matches solution position
      if (chess.fen() === solutionFen.fen()) {
        solved = true;
        message = "Puzzle solved correctly!";
      } else {
        message = "Moves don't match the solution. Try again!";
      }
    }

    res.json({
      solved,
      message,
      currentFen: chess.fen(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate()
    });
  } catch (err) {
    console.error("Error verifying chess puzzle:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/chess/complete
 * Mark puzzle as completed and issue reward coupon
 * Body: { puzzleId, orderId (optional), userId }
 */
router.post("/complete", async (req, res) => {
  try {
    const userId = req.session?.customerId || req.body?.userId;
    const { puzzleId, orderId, difficulty } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Not logged in" });
    }
    
    if (!puzzleId) {
      return res.status(400).json({ error: "puzzleId required" });
    }

    const puzzle = await ChessPuzzle.findById(puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: "Puzzle not found" });
    }

    // Use provided difficulty or puzzle's difficulty
    const finalDifficulty = difficulty || puzzle.difficulty;
    const reward = rewardMap[finalDifficulty] || rewardMap.easy;
    const code = "CHESS-" + Math.random().toString(36).toUpperCase().slice(2, 8);

    // Create coupon reward
    await Coupon.create({
      userId,
      code,
      label: reward.label,
      discountPct: reward.discountPct,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    res.json({
      success: true,
      code,
      label: reward.label,
      discountPct: reward.discountPct,
      message: "Chess puzzle completed! Coupon reward issued."
    });
  } catch (err) {
    console.error("Error completing chess puzzle:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

