import mongoose from "mongoose";
import dotenv from "dotenv";
import { Chess } from "chess.js";
import ChessPuzzle from "../models/ChessPuzzle.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';

async function validateChessPuzzles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const puzzles = await ChessPuzzle.find({}).sort({ difficulty: 1 });
    
    if (puzzles.length === 0) {
      console.log('❌ No puzzles found in database');
      process.exit(0);
    }

    console.log(`📊 Validating ${puzzles.length} puzzles...\n`);
    console.log('═'.repeat(80));
    
    let validCount = 0;
    let invalidCount = 0;
    const invalidPuzzles = [];

    for (const puzzle of puzzles) {
      console.log(`\n🔍 Validating Puzzle: ${puzzle.description || puzzle._id}`);
      console.log(`   FEN: ${puzzle.fen}`);
      console.log(`   Solution Moves: ${puzzle.solutionMoves?.join(' → ') || 'NONE'}`);
      
      if (!puzzle.solutionMoves || !Array.isArray(puzzle.solutionMoves) || puzzle.solutionMoves.length === 0) {
        console.log(`   ❌ NO SOLUTION MOVES`);
        invalidCount++;
        invalidPuzzles.push(puzzle);
        continue;
      }

      try {
        // Initialize chess game with puzzle FEN
        const game = new Chess(puzzle.fen);
        console.log(`   Initial position: ${game.fen()}`);
        console.log(`   Turn: ${game.turn() === 'w' ? 'White' : 'Black'}`);
        
        // Try to apply each solution move
        let moveIndex = 0;
        let allMovesValid = true;
        
        for (const moveUCI of puzzle.solutionMoves) {
          moveIndex++;
          
          // Parse UCI move (e.g., "f6f7" -> from: "f6", to: "f7")
          if (moveUCI.length < 4) {
            console.log(`   ❌ Invalid move format: ${moveUCI} (too short)`);
            allMovesValid = false;
            break;
          }
          
          const from = moveUCI.substring(0, 2);
          const to = moveUCI.substring(2, 4);
          const promotion = moveUCI.length > 4 ? moveUCI[4] : undefined;
          
          console.log(`   Move ${moveIndex}: ${moveUCI} (${from} → ${to})`);
          
          // Try to make the move
          const move = game.move({
            from: from,
            to: to,
            promotion: promotion || 'q' // Default to queen if promotion needed
          });
          
          if (!move) {
            console.log(`   ❌ Invalid move: ${moveUCI} - Cannot be played from current position`);
            console.log(`      Current FEN: ${game.fen()}`);
            console.log(`      Valid moves: ${game.moves().slice(0, 10).join(', ')}...`);
            allMovesValid = false;
            break;
          }
          
          console.log(`   ✅ Valid: ${move.san}`);
        }
        
        if (allMovesValid) {
          console.log(`   ✅ All moves valid! Final position: ${game.fen()}`);
          if (puzzle.puzzleType === 'checkmate') {
            const isCheckmate = game.isCheckmate();
            console.log(`   ${isCheckmate ? '✅' : '⚠️ '} Checkmate: ${isCheckmate}`);
          }
          validCount++;
        } else {
          console.log(`   ❌ PUZZLE HAS INVALID MOVES`);
          invalidCount++;
          invalidPuzzles.push(puzzle);
        }
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        invalidCount++;
        invalidPuzzles.push(puzzle);
      }
      
      console.log(`   ${'-'.repeat(76)}`);
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Valid puzzles: ${validCount}`);
    console.log(`❌ Invalid puzzles: ${invalidCount}`);
    
    if (invalidPuzzles.length > 0) {
      console.log(`\n❌ Invalid Puzzles:`);
      invalidPuzzles.forEach(p => {
        console.log(`   - ${p._id}: ${p.description || 'No description'}`);
      });
    }

    process.exit(invalidCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error validating chess puzzles:', error);
    process.exit(1);
  }
}

validateChessPuzzles();

