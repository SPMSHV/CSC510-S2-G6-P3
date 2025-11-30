import AuditLog from "../models/AuditLog.js";

/**
 * Sanitize sensitive data before logging
 * @param {any} data - Data to sanitize
 * @returns {any} - Sanitized data
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'passwordHash', 'cardNumber', 'cvv', 'token', 'secret'];
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Create an audit log entry
 * @param {string} action - Action being logged (e.g., "PAYMENT_COMPLETED")
 * @param {Object} details - Additional details about the action
 * @param {Object} req - Express request object (optional, for IP/userAgent)
 * @returns {Promise<void>}
 */
export async function auditLog(action, details = {}, req = null) {
  try {
    const sanitizedDetails = sanitizeData(details);
    
    const logEntry = {
      action,
      userId: details.userId || null,
      orderId: details.orderId || null,
      details: sanitizedDetails,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get?.('user-agent') || null
    };

    await AuditLog.create(logEntry);
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error("Error creating audit log:", error);
  }
}

/**
 * Express middleware to automatically log requests
 * @param {string} action - Action name to log
 * @returns {Function} - Express middleware
 */
export function auditMiddleware(action) {
  return async (req, res, next) => {
    // Log after response is sent
    const originalSend = res.send;
    res.send = function(data) {
      // Extract relevant info from request
      const details = {
        method: req.method,
        path: req.path,
        userId: req.session?.customerId || req.session?.restaurantAdminId || req.session?.driverId,
        body: req.body,
        params: req.params,
        query: req.query
      };

      auditLog(action, details, req).catch(console.error);
      return originalSend.call(this, data);
    };
    next();
  };
}

