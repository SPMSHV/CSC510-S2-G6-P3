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

    // Query puzzles with solution moves at database level
    // Also filter by puzzleType if provided in query params to ensure variety
    const query = { 
      difficulty,
      solutionMoves: { $exists: true, $type: "array" }
    };
    
    // If puzzleType is specified, filter by it; otherwise get all types for variety
    const { puzzleType } = req.query;
    if (puzzleType && ["checkmate", "tactical", "endgame"].includes(puzzleType)) {
      query.puzzleType = puzzleType;
    }
    
    const puzzles = await ChessPuzzle.find(query);
    console.log(`🔍 Found ${puzzles.length} puzzles for difficulty: ${difficulty}`);
    
    // Filter to only include puzzles with non-empty solutionMoves
    const validPuzzles = puzzles.filter(puzzle => {
      const hasSolutionMoves = puzzle.solutionMoves && 
                               Array.isArray(puzzle.solutionMoves) && 
                               puzzle.solutionMoves.length > 0;
      if (!hasSolutionMoves) {
        console.log(`⚠️ Puzzle ${puzzle._id} filtered out - solutionMoves:`, puzzle.solutionMoves);
      }
      return hasSolutionMoves;
    });
    
    console.log(`✅ Valid puzzles after filtering: ${validPuzzles.length}`);
    
    if (validPuzzles.length === 0) {
      console.error(`❌ No valid puzzles found for difficulty: ${difficulty}`);
      // If no puzzles found with specific type, try without type filter
      if (puzzleType) {
        const fallbackPuzzles = await ChessPuzzle.find({ 
          difficulty,
          solutionMoves: { $exists: true, $type: "array" }
        });
        const fallbackValid = fallbackPuzzles.filter(puzzle => {
          return puzzle.solutionMoves && 
                 Array.isArray(puzzle.solutionMoves) && 
                 puzzle.solutionMoves.length > 0;
        });
        if (fallbackValid.length === 0) {
          return res.status(404).json({ error: `No puzzles with solutions found for difficulty: ${difficulty}` });
        }
        const randomPuzzle = fallbackValid[Math.floor(Math.random() * fallbackValid.length)];
        return res.json({
          puzzleId: randomPuzzle._id,
          fen: randomPuzzle.fen,
          hint: randomPuzzle.hint,
          description: randomPuzzle.description,
          puzzleType: randomPuzzle.puzzleType,
          difficulty: randomPuzzle.difficulty,
          solutionMoves: randomPuzzle.solutionMoves
        });
      }
      return res.status(404).json({ error: `No puzzles with solutions found for difficulty: ${difficulty}` });
    }

    // Randomly select a puzzle to ensure variety
    const randomPuzzle = validPuzzles[Math.floor(Math.random() * validPuzzles.length)];
    
    // Double-check that solutionMoves exist before returning
    if (!randomPuzzle.solutionMoves || !Array.isArray(randomPuzzle.solutionMoves) || randomPuzzle.solutionMoves.length === 0) {
      console.error(`ERROR: Selected puzzle ${randomPuzzle._id} has no solution moves!`);
      return res.status(500).json({ error: "Internal error: selected puzzle has no solution" });
    }
    
    res.json({
      puzzleId: randomPuzzle._id,
      fen: randomPuzzle.fen,
      hint: randomPuzzle.hint,
      description: randomPuzzle.description,
      puzzleType: randomPuzzle.puzzleType,
      difficulty: randomPuzzle.difficulty,
      solutionMoves: randomPuzzle.solutionMoves // Include solution moves
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

    // Validate puzzleId format (MongoDB ObjectId is 24 hex characters)
    if (typeof puzzleId !== 'string' || !puzzleId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid puzzleId format" });
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
          // Don't expose technical details - just indicate move doesn't match solution
          return res.json({
            solved: false,
            message: "Move doesn't match the solution",
            validMoves: chess.moves()
          });
        }
      }
    } catch (err) {
      // Don't expose technical error messages
      return res.json({
        solved: false,
        message: "Move doesn't match the solution",
        validMoves: chess.moves()
      });
    }

    // Check if the puzzle is solved
    // For checkmate puzzles, check if the game is in checkmate AND moves match solution length
    // For tactical puzzles, check if moves match solution exactly
    let solved = false;
    let message = "";

    // Check if user has made the correct number of moves
    const expectedMoves = puzzle.solutionMoves.length;
    const actualMoves = moves.length;

    if (puzzle.puzzleType === "checkmate") {
      // For checkmate puzzles, must reach checkmate AND use correct number of moves
      // Also verify that the moves match the solution (or reach the same position)
      const isCheckmate = chess.isCheckmate();
      const correctMoveCount = actualMoves === expectedMoves;
      
      // Verify moves match solution by comparing final positions
      const solutionFen = new Chess(puzzle.fen);
      for (const move of puzzle.solutionMoves) {
        const result = solutionFen.move(move);
        if (!result) {
          console.error(`Invalid solution move in puzzle: ${move}`);
          break;
        }
      }
      
      // Compare positions (normalize FEN to ignore move counters and en passant)
      const currentFenNormalized = chess.fen().split(' ').slice(0, 4).join(' ');
      const solutionFenNormalized = solutionFen.fen().split(' ').slice(0, 4).join(' ');
      const movesMatch = currentFenNormalized === solutionFenNormalized;
      
      if (isCheckmate && correctMoveCount && movesMatch) {
        solved = true;
        message = `Checkmate! Puzzle solved correctly in ${expectedMoves} move${expectedMoves > 1 ? 's' : ''}!`;
      } else if (isCheckmate && !correctMoveCount) {
        solved = false;
        message = `Checkmate achieved, but used ${actualMoves} moves instead of ${expectedMoves}. Try again!`;
      } else if (isCheckmate && correctMoveCount && !movesMatch) {
        solved = false;
        message = `Checkmate achieved, but moves don't match the solution. Try the correct sequence!`;
      } else if (!isCheckmate && correctMoveCount) {
        solved = false;
        message = `Made ${expectedMoves} move${expectedMoves > 1 ? 's' : ''}, but not checkmate yet. Keep trying!`;
      } else {
        solved = false;
        message = `Not checkmate yet. Need ${expectedMoves} move${expectedMoves > 1 ? 's' : ''} to solve.`;
      }
    } else {
      // For tactical puzzles, check if moves match solution exactly
      // First check if move count matches
      if (actualMoves !== expectedMoves) {
        solved = false;
        message = `Made ${actualMoves} move${actualMoves > 1 ? 's' : ''}, but need ${expectedMoves} move${expectedMoves > 1 ? 's' : ''} to solve.`;
      } else {
        // Check if the final position matches the solution
        const solutionFen = new Chess(puzzle.fen);
        for (const move of puzzle.solutionMoves) {
          const result = solutionFen.move(move);
          if (!result) {
            // Invalid solution move in puzzle data
            console.error(`Invalid solution move in puzzle: ${move}`);
            break;
          }
        }
        
        // Compare positions (normalize FEN to ignore move counters)
        const currentFenNormalized = chess.fen().split(' ').slice(0, 4).join(' ');
        const solutionFenNormalized = solutionFen.fen().split(' ').slice(0, 4).join(' ');
        
        if (currentFenNormalized === solutionFenNormalized) {
          solved = true;
          message = "Puzzle solved correctly!";
        } else {
          solved = false;
          message = "Moves don't match the solution. Try again!";
        }
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

