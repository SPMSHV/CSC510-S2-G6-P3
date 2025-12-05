import mongoose from "mongoose";
import dotenv from "dotenv";
import ChessPuzzle from "../models/ChessPuzzle.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';

async function cleanupChessPuzzles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all puzzles
    const allPuzzles = await ChessPuzzle.find({});
    console.log(`📊 Total puzzles in database: ${allPuzzles.length}`);

    // Find puzzles without valid solution moves
    const puzzlesToDelete = [];
    for (const puzzle of allPuzzles) {
      if (!puzzle.solutionMoves || 
          !Array.isArray(puzzle.solutionMoves) || 
          puzzle.solutionMoves.length === 0) {
        puzzlesToDelete.push(puzzle._id);
        console.log(`❌ Puzzle ${puzzle._id} has no solution moves - will be deleted`);
      }
    }

    if (puzzlesToDelete.length > 0) {
      // Delete puzzles without solutions
      const result = await ChessPuzzle.deleteMany({ 
        _id: { $in: puzzlesToDelete } 
      });
      console.log(`🗑️  Deleted ${result.deletedCount} puzzles without solutions`);
    } else {
      console.log('✅ All puzzles have valid solutions');
    }

    // Show summary of remaining puzzles
    const remainingPuzzles = await ChessPuzzle.find({});
    console.log(`\n📊 Remaining puzzles: ${remainingPuzzles.length}`);
    
    const easyCount = await ChessPuzzle.countDocuments({ difficulty: "easy" });
    const mediumCount = await ChessPuzzle.countDocuments({ difficulty: "medium" });
    const hardCount = await ChessPuzzle.countDocuments({ difficulty: "hard" });
    
    console.log(`📊 Puzzle summary by difficulty:`);
    console.log(`   Easy: ${easyCount}`);
    console.log(`   Medium: ${mediumCount}`);
    console.log(`   Hard: ${hardCount}`);

    // Verify all remaining puzzles have solutions
    const puzzlesWithoutSolutions = await ChessPuzzle.find({
      $or: [
        { solutionMoves: { $exists: false } },
        { solutionMoves: null },
        { solutionMoves: { $size: 0 } },
        { solutionMoves: { $not: { $type: "array" } } }
      ]
    });

    if (puzzlesWithoutSolutions.length > 0) {
      console.error(`⚠️  WARNING: Found ${puzzlesWithoutSolutions.length} puzzles still without solutions!`);
      for (const puzzle of puzzlesWithoutSolutions) {
        console.error(`   Puzzle ID: ${puzzle._id}, Difficulty: ${puzzle.difficulty}`);
      }
    } else {
      console.log('✅ Verification passed: All remaining puzzles have valid solutions');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up chess puzzles:', error);
    process.exit(1);
  }
}

cleanupChessPuzzles();

