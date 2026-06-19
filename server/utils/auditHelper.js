const { pool } = require('../config/db');

/**
 * Log user activity to audit_logs table
 * @param {Object} req - Express request object
 * @param {string} action - 'create', 'update', 'delete', 'login', etc.
 * @param {string} entityType - 'book', 'student', 'transaction', etc.
 * @param {number|null} entityId - ID of affected entity
 * @param {Object|null} oldData - Data before change
 * @param {Object|null} newData - Data after change
 */
async function logAudit(req, action, entityType, entityId = null, oldData = null, newData = null) {
  const user = req.session?.user || { id: null, username: 'anonymous' };
  
  try {
    await pool.query(`
      INSERT INTO audit_logs (
        user_id, user_username, entity_type, entity_id, action, 
        old_data, new_data, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      user.username,
      entityType,
      entityId,
      action,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent')
    ]);
    
    console.log(`📝 Audit logged: ${user.username} ${action} ${entityType}${entityId ? ` #${entityId}` : ''}`);
    
    return { success: true };
  } catch (error) {
    console.error('[auditHelper.logAudit] Error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { logAudit };

