import mongoose from "mongoose";

const userPerformanceSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CustomerAuth', 
    required: true, 
    unique: true,
    index: true 
  },
  totalOrders: { type: Number, default: 0 },
  totalChallenges: { type: Number, default: 0 },
  completedChallenges: { type: Number, default: 0 },
  averageSolveTime: { type: Number, default: 0 }, // in seconds
  lastDifficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" }
}, { timestamps: true });

// Calculate completion rate (virtual)
userPerformanceSchema.virtual('completionRate').get(function() {
  if (this.totalChallenges === 0) return 0;
  return (this.completedChallenges / this.totalChallenges) * 100;
});

export default mongoose.model("UserPerformance", userPerformanceSchema);

