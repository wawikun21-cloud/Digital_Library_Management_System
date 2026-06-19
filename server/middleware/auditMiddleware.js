const { logAudit } = require('../utils/auditHelper');
const { pool } = require('../config/db');

/**
 * Audit middleware for protected routes - auto-logs mutations
 * Usage: app.use('/api/books', auditMiddleware, booksController);
 */
async function auditMiddleware(req, res, next) {
  // Skip GET requests, only audit mutations
  if (req.method === 'GET') return next();

  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const action = req.method.toLowerCase();
  let entityType = inferEntityType(req.path);
  let entityId = req.params.id || null;
  let oldData = null;

  // Fetch old data for updates/deletes
  if (['put', 'patch', 'delete'].includes(action) && entityId) {
    try {
      const table = mapEntityToTable(entityType);
      if (table) {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [entityId]);
        if (rows.length) {
          oldData = rows[0];
        }
      }
    } catch (error) {
      console.error('[auditMiddleware] Fetch old data error:', error.message);
    }
  }

  // Store in req for controller access
  req.auditData = { action, entityType, entityId, oldData };

  next();
}

function inferEntityType(path) {
  const paths = path.split('/').filter(Boolean);
  const resource = paths[2] || paths[1]; // /api/books, /api/students etc.
  const map = {
    'books': 'book',
    'students': 'student', 
    'faculty': 'faculty',
    'transactions': 'transaction',
    'borrowed_books': 'transaction',
    'attendance': 'attendance',
    'trash': 'trash',
    'auth': 'auth'
  };
  return map[resource] || resource;
}

function mapEntityToTable(entityType) {
  const map = {
    'book': 'books',
    'student': 'students',
    'faculty': 'faculty',
    'transaction': 'borrowed_books',
    'attendance': 'attendance'
  };
  return map[entityType];
}

module.exports = auditMiddleware;
