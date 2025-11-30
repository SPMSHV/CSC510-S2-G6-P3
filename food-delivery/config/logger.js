import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');

/**
 * Sanitize sensitive data before logging
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'passwordHash', 'cardNumber', 'cvv', 'token', 'secret', 'apiKey'];
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
 * Write log entry to file
 */
function writeLog(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedData = sanitizeData(data);
  const logEntry = {
    timestamp,
    level,
    message,
    data: sanitizedData
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  // Write to file (async, don't block)
  fs.appendFile(logFile, logLine, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
  
  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${level}] ${message}`, sanitizedData);
  }
}

export const logger = {
  info: (message, data) => writeLog('INFO', message, data),
  warn: (message, data) => writeLog('WARN', message, data),
  error: (message, data) => writeLog('ERROR', message, data),
  
  // Specific loggers for different event types
  payment: (message, data) => writeLog('PAYMENT', message, data),
  refund: (message, data) => writeLog('REFUND', message, data),
  security: (message, data) => writeLog('SECURITY', message, data),
  auth: (message, data) => writeLog('AUTH', message, data)
};

