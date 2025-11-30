import UserPerformance from "../models/UserPerformance.js";
import Order from "../models/Order.js";
import ChallengeSession from "../models/ChallengeSession.js";

/**
 * Calculate adaptive difficulty for a user based on their order frequency and challenge performance
 * @param {string} userId - The user's ID
 * @returns {Promise<string>} - Returns "easy", "medium", or "hard"
 */
export async function calculateAdaptiveDifficulty(userId) {
  try {
    // Get user's order count
    const orderCount = await Order.countDocuments({ userId });
    
    // Get user's challenge performance
    let userPerformance = await UserPerformance.findOne({ userId });
    
    // If no performance record exists, create one
    if (!userPerformance) {
      userPerformance = await UserPerformance.create({ userId });
    }
    
    // Get recent challenge sessions to calculate average solve time
    const recentSessions = await ChallengeSession.find({
      userId,
      status: { $in: ["WON", "EXPIRED"] }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Calculate average solve time from recent sessions
    let averageSolveTime = 0;
    if (recentSessions.length > 0) {
      const sessionsWithTime = recentSessions.filter(s => {
        if (s.status === "WON" && s.createdAt && s.updatedAt) {
          return true;
        }
        return false;
      });
      
      if (sessionsWithTime.length > 0) {
        const totalTime = sessionsWithTime.reduce((sum, session) => {
          const solveTime = (new Date(session.updatedAt) - new Date(session.createdAt)) / 1000; // in seconds
          return sum + solveTime;
        }, 0);
        averageSolveTime = totalTime / sessionsWithTime.length;
      }
    }
    
    // Update user performance with latest data
    userPerformance.totalOrders = orderCount;
    userPerformance.totalChallenges = recentSessions.length;
    userPerformance.completedChallenges = recentSessions.filter(s => s.status === "WON").length;
    if (averageSolveTime > 0) {
      userPerformance.averageSolveTime = averageSolveTime;
    }
    await userPerformance.save();
    
    // Calculate difficulty based on rules
    const completionRate = userPerformance.totalChallenges > 0 
      ? (userPerformance.completedChallenges / userPerformance.totalChallenges) * 100 
      : 0;
    
    // Rule 1: New user (< 3 orders) -> easy
    if (orderCount < 3) {
      return "easy";
    }
    
    // Rule 2: 3-10 orders
    if (orderCount >= 3 && orderCount < 10) {
      if (completionRate < 50) {
        return "easy";
      } else if (completionRate >= 50 && completionRate < 80) {
        return "medium";
      } else {
        return "hard";
      }
    }
    
    // Rule 3: 10+ orders
    if (orderCount >= 10) {
      if (completionRate < 50) {
        return "easy";
      } else if (completionRate >= 50 && completionRate < 80) {
        return "medium";
      } else {
        // High completion rate -> hard
        // Fast solvers (< 5 min = 300 seconds avg) -> bump up one level
        if (averageSolveTime > 0 && averageSolveTime < 300) {
          // Already at hard, keep it hard
          return "hard";
        }
        return "hard";
      }
    }
    
    // Default fallback
    return "easy";
  } catch (error) {
    console.error("Error calculating adaptive difficulty:", error);
    // Default to easy on error
    return "easy";
  }
}

