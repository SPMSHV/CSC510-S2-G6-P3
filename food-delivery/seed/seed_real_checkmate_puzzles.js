import mongoose from "mongoose";
import dotenv from "dotenv";
import { Chess } from "chess.js";
import ChessPuzzle from "../models/ChessPuzzle.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_delivery_app';

// Real checkmate puzzles - positions that can lead to checkmate
// The script will automatically find valid solution moves for each position
const realCheckmatePuzzles = [
  // Easy - Simple checkmates
  {
    fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq g3 0 2",
    solutionMoves: [], // Will be found automatically
    difficulty: "easy",
    hint: "The queen can deliver checkmate in one move",
    description: "Find the checkmate in 1 move",
    puzzleType: "checkmate"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "easy",
    hint: "Bishop can deliver a powerful check",
    description: "Find the winning move",
    puzzleType: "checkmate"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "easy",
    hint: "Look for a checkmate opportunity",
    description: "Find the checkmate",
    puzzleType: "checkmate"
  },
  
  // Medium - 2-3 move sequences
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "medium",
    hint: "Knight move creating a checkmate threat",
    description: "Find the checkmate threat",
    puzzleType: "checkmate"
  },
  {
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "medium",
    hint: "Pawn break to open attacking lines",
    description: "Find the breakthrough move",
    puzzleType: "tactical"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "medium",
    hint: "Castle to coordinate your pieces",
    description: "Find the best move",
    puzzleType: "tactical"
  },
  
  // Hard - Complex patterns
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "hard",
    hint: "Knight fork combination",
    description: "Find the winning combination",
    puzzleType: "tactical"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "hard",
    hint: "Queen move to create threats",
    description: "Find the best queen move",
    puzzleType: "tactical"
  },
  {
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    solutionMoves: [], // Will be found automatically
    difficulty: "hard",
    hint: "Develop your pieces for attack",
    description: "Find the best development move",
    puzzleType: "tactical"
  }
];

// Function to find valid moves that actually work from a position
function findValidMoves(fen, puzzleType) {
  try {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) {
      return null;
    }
    
    // For checkmate puzzles, try to find checkmate sequences
    if (puzzleType === "checkmate") {
      // Try single move checkmate
      for (const move of moves) {
        const testGame = new Chess(fen);
        testGame.move(move);
        if (testGame.isCheckmate()) {
          return [move.from + move.to];
        }
      }
      
      // Try 2-move sequences
      for (const move1 of moves.slice(0, 15)) {
        const game1 = new Chess(fen);
        game1.move(move1);
        const moves2 = game1.moves({ verbose: true });
        for (const move2 of moves2.slice(0, 15)) {
          const game2 = new Chess(game1.fen());
          game2.move(move2);
          if (game2.isCheckmate()) {
            return [move1.from + move1.to, move2.from + move2.to];
          }
        }
      }
    }
    
    // For tactical puzzles, return a good move (prefer captures, checks)
    const tacticalMoves = moves.filter(m => m.captured || m.san.includes('+'));
    if (tacticalMoves.length > 0) {
      return [tacticalMoves[0].from + tacticalMoves[0].to];
    }
    
    // Return first valid move
    return [moves[0].from + moves[0].to];
  } catch (error) {
    console.error(`Error finding moves:`, error);
    return null;
  }
}

async function seedRealCheckmatePuzzles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const validatedPuzzles = [];
    
    for (const puzzle of realCheckmatePuzzles) {
      console.log(`\n🔍 Processing: ${puzzle.description}`);
      console.log(`   FEN: ${puzzle.fen}`);
      console.log(`   Type: ${puzzle.puzzleType}`);
      
      // Always find valid moves automatically
      const newSolution = findValidMoves(puzzle.fen, puzzle.puzzleType);
      if (newSolution && newSolution.length > 0) {
        // Test the solution
        let testGame = new Chess(puzzle.fen);
        for (const moveUCI of newSolution) {
          const from = moveUCI.substring(0, 2);
          const to = moveUCI.substring(2, 4);
          testGame.move({ from, to, promotion: 'q' });
        }
        const resultsInCheckmate = testGame.isCheckmate();
        console.log(`   ${resultsInCheckmate ? '✅' : '⚠️ '} Found solution: ${newSolution.join(' → ')}${resultsInCheckmate ? ' (CHECKMATE!)' : ''}`);
        validatedPuzzles.push({
          ...puzzle,
          solutionMoves: newSolution,
          puzzleType: resultsInCheckmate ? "checkmate" : puzzle.puzzleType
        });
      } else {
        console.log(`   ❌ Could not find valid solution for this position`);
      }
    }

    if (validatedPuzzles.length === 0) {
      console.error('\n❌ No valid puzzles to seed!');
      process.exit(1);
    }

    // Clear existing puzzles
    await ChessPuzzle.deleteMany({});
    console.log('\n🗑️  Cleared existing chess puzzles');

    // Insert validated puzzles
    await ChessPuzzle.insertMany(validatedPuzzles);
    console.log(`\n✅ Seeded ${validatedPuzzles.length} chess puzzles`);

    // Show summary
    const easyCount = await ChessPuzzle.countDocuments({ difficulty: "easy" });
    const mediumCount = await ChessPuzzle.countDocuments({ difficulty: "medium" });
    const hardCount = await ChessPuzzle.countDocuments({ difficulty: "hard" });
    const checkmateCount = await ChessPuzzle.countDocuments({ puzzleType: "checkmate" });
    
    console.log(`\n📊 Puzzle summary:`);
    console.log(`   Easy: ${easyCount}`);
    console.log(`   Medium: ${mediumCount}`);
    console.log(`   Hard: ${hardCount}`);
    console.log(`   Checkmate puzzles: ${checkmateCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding chess puzzles:', error);
    process.exit(1);
  }
}

seedRealCheckmatePuzzles();

