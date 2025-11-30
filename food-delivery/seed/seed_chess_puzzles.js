import mongoose from "mongoose";
import dotenv from "dotenv";
import ChessPuzzle from "../models/ChessPuzzle.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';

const chessPuzzles = [
  // Easy puzzles - simple checkmates
  {
    fen: "r1bqkb1r/pppp1Qpp/2n2n2/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
    solutionMoves: ["f6f7"],
    difficulty: "easy",
    hint: "Look for a checkmate in one move",
    description: "Find the checkmate in 1 move",
    puzzleType: "checkmate"
  },
  {
    fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2",
    solutionMoves: ["d8f6", "f6h4"],
    difficulty: "easy",
    hint: "Queen can deliver checkmate in 2 moves",
    description: "Find the checkmate in 2 moves",
    puzzleType: "checkmate"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: ["f3g5", "g5f7"],
    difficulty: "easy",
    hint: "Knight fork opportunity",
    description: "Fork the king and rook",
    puzzleType: "tactical"
  },
  
  // Medium puzzles
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: ["f3g5", "g5f7", "f7d8"],
    difficulty: "medium",
    hint: "Knight can create a winning combination",
    description: "Find the winning combination",
    puzzleType: "tactical"
  },
  {
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4",
    solutionMoves: ["e4e5", "e5f6"],
    difficulty: "medium",
    hint: "Pawn break to open lines",
    description: "Break through with a pawn sacrifice",
    puzzleType: "tactical"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: ["f1c4", "c4f7"],
    difficulty: "medium",
    hint: "Bishop can deliver a powerful check",
    description: "Bishop sacrifice for checkmate",
    puzzleType: "checkmate"
  },
  
  // Hard puzzles
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: ["f3g5", "g5f7", "f7d8", "d8c6"],
    difficulty: "hard",
    hint: "Complex knight maneuver",
    description: "Find the deep tactical combination",
    puzzleType: "tactical"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: ["e1g1", "f1c4", "c4f7", "f7h5"],
    difficulty: "hard",
    hint: "Multiple piece coordination required",
    description: "Complex checkmating pattern",
    puzzleType: "checkmate"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: ["d1f3", "f3g3", "g3g7"],
    difficulty: "hard",
    hint: "Queen sacrifice for checkmate",
    description: "Find the queen sacrifice checkmate",
    puzzleType: "checkmate"
  }
];

async function seedChessPuzzles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing puzzles
    await ChessPuzzle.deleteMany({});
    console.log('🗑️  Cleared existing chess puzzles');

    // Insert puzzles
    await ChessPuzzle.insertMany(chessPuzzles);
    console.log(`✅ Seeded ${chessPuzzles.length} chess puzzles`);

    // Show summary by difficulty
    const easyCount = await ChessPuzzle.countDocuments({ difficulty: "easy" });
    const mediumCount = await ChessPuzzle.countDocuments({ difficulty: "medium" });
    const hardCount = await ChessPuzzle.countDocuments({ difficulty: "hard" });
    
    console.log(`📊 Puzzle summary:`);
    console.log(`   Easy: ${easyCount}`);
    console.log(`   Medium: ${mediumCount}`);
    console.log(`   Hard: ${hardCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding chess puzzles:', error);
    process.exit(1);
  }
}

seedChessPuzzles();

