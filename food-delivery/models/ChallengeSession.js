import mongoose from "mongoose";

const ChallengeSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, required: true, index: true },
  orderId: { type: mongoose.Types.ObjectId, required: true, index: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  status: { type: String, enum: ["ACTIVE", "WON", "EXPIRED"], default: "ACTIVE", index: true },
  expiresAt: { type: Date, required: true, index: true },
  // 🎯 CHESS SUPPORT: Optional fields for chess puzzles
  challengeType: { type: String, enum: ["coding", "chess"], default: "coding" },
  puzzleId: { type: mongoose.Types.ObjectId, ref: "ChessPuzzle", default: null }
}, { timestamps: true });

// optional TTL index for cleanup
// ChallengeSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ChallengeSession", ChallengeSessionSchema);
