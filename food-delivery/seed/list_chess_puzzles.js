import mongoose from "mongoose";
import dotenv from "dotenv";
import ChessPuzzle from "../models/ChessPuzzle.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';

async function listChessPuzzles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all puzzles sorted by difficulty
    const puzzles = await ChessPuzzle.find({}).sort({ difficulty: 1, createdAt: 1 });
    
    if (puzzles.length === 0) {
      console.log('❌ No puzzles found in database');
      process.exit(0);
    }

    console.log(`📊 Total puzzles: ${puzzles.length}\n`);
    console.log('═'.repeat(80));
    
    // Group by difficulty
    const byDifficulty = {
      easy: puzzles.filter(p => p.difficulty === 'easy'),
      medium: puzzles.filter(p => p.difficulty === 'medium'),
      hard: puzzles.filter(p => p.difficulty === 'hard')
    };

    // Display puzzles by difficulty
    for (const [difficulty, puzzleList] of Object.entries(byDifficulty)) {
      if (puzzleList.length === 0) continue;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📚 ${difficulty.toUpperCase()} PUZZLES (${puzzleList.length})`);
      console.log('='.repeat(80));
      
      puzzleList.forEach((puzzle, index) => {
        console.log(`\n${index + 1}. Puzzle ID: ${puzzle._id}`);
        console.log(`   Description: ${puzzle.description || 'N/A'}`);
        console.log(`   Type: ${puzzle.puzzleType || 'N/A'}`);
        console.log(`   Hint: ${puzzle.hint || 'N/A'}`);
        console.log(`   FEN: ${puzzle.fen}`);
        console.log(`   Solution Moves:`);
        
        if (puzzle.solutionMoves && Array.isArray(puzzle.solutionMoves) && puzzle.solutionMoves.length > 0) {
          puzzle.solutionMoves.forEach((move, moveIdx) => {
            console.log(`      ${moveIdx + 1}. ${move}`);
          });
          console.log(`   Solution (UCI): ${puzzle.solutionMoves.join(' → ')}`);
        } else {
          console.log(`      ⚠️  NO SOLUTION MOVES AVAILABLE`);
        }
        
        console.log(`   ${'-'.repeat(76)}`);
      });
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Puzzles: ${puzzles.length}`);
    console.log(`Easy: ${byDifficulty.easy.length}`);
    console.log(`Medium: ${byDifficulty.medium.length}`);
    console.log(`Hard: ${byDifficulty.hard.length}`);
    
    // Count puzzles with solutions
    const withSolutions = puzzles.filter(p => 
      p.solutionMoves && Array.isArray(p.solutionMoves) && p.solutionMoves.length > 0
    );
    const withoutSolutions = puzzles.length - withSolutions.length;
    
    console.log(`\n✅ Puzzles with solutions: ${withSolutions.length}`);
    if (withoutSolutions > 0) {
      console.log(`❌ Puzzles without solutions: ${withoutSolutions}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing chess puzzles:', error);
    process.exit(1);
  }
}

listChessPuzzles();

