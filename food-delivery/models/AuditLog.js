import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  action: { 
    type: String, 
    required: true,
    index: true 
  }, // e.g., "PAYMENT_COMPLETED", "REFUND_REQUESTED", "ORDER_STATUS_CHANGED"
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CustomerAuth',
    default: null,
    index: true 
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order',
    default: null,
    index: true 
  },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }, // Additional context
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null }
}, { timestamps: true });

// Index for common queries
auditLogSchema.index({ createdAt: -1 }); // Recent logs
auditLogSchema.index({ action: 1, createdAt: -1 }); // Logs by action type

export default mongoose.model("AuditLog", auditLogSchema);

