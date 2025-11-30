import mongoose from "mongoose";

const chessPuzzleSchema = new mongoose.Schema({
  fen: { type: String, required: true }, // Starting position in FEN notation
  solutionMoves: { type: [String], required: true }, // Array of moves in UCI format (e.g., ["e2e4", "e7e5"])
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true, index: true },
  hint: { type: String }, // Optional hint for the puzzle
  description: { type: String }, // Description of the puzzle (e.g., "Find the checkmate in 2 moves")
  puzzleType: { type: String, enum: ["checkmate", "tactical", "endgame"], default: "checkmate" }
}, { timestamps: true });

export default mongoose.model("ChessPuzzle", chessPuzzleSchema);

