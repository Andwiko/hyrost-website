'use strict';

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../../data/logs');
const AUDIT_FILE = path.join(LOGS_DIR, 'security_audit.jsonl');

// Ensure log directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (e) {
  // Ignored if unable to create
}

/**
 * Log a security event to structured JSON Lines audit log
 * @param {string} event - e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ROLE_CHANGED', 'PASSWORD_RESET'
 * @param {object} details - details like { username, ip, userAgent, details, status }
 */
function logSecurityEvent(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ip: details.ip || '127.0.0.1',
    user: details.username || details.user || 'anonymous',
    userId: details.userId || null,
    userAgent: details.userAgent || 'unknown',
    status: details.status || 'INFO',
    meta: details.meta || {}
  };

  const line = JSON.stringify(entry) + '\n';

  fs.appendFile(AUDIT_FILE, line, (err) => {
    if (err) {
      // Fallback to console in case of file write error
      console.warn(`[AUDIT-WARN] Failed to write audit log: ${err.message}`);
    }
  });

  if (details.status === 'CRITICAL' || details.status === 'ALERT') {
    console.warn(`🚨 [SECURITY-ALERT] ${event} - User: ${entry.user} (IP: ${entry.ip})`);
  }
}

/**
 * Retrieve recent audit logs for Admin Panel
 * @param {number} limit - maximum entries to return (default 50)
 * @returns {Array<object>}
 */
function getRecentAuditLogs(limit = 50) {
  try {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    const content = fs.readFileSync(AUDIT_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const parsed = lines.slice(-limit).map((l) => {
      try {
        return JSON.parse(l);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    return parsed.reverse();
  } catch (err) {
    console.error('Failed to read audit logs:', err.message);
    return [];
  }
}

module.exports = {
  logSecurityEvent,
  getRecentAuditLogs,
  AUDIT_FILE
};
