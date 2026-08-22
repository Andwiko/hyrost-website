const PROTECTED_ROLES = ['Admin', 'Member'];

async function countAdmins(pool) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM users WHERE LOWER(role) = 'admin' AND deleted_at IS NULL"
  );
  return rows[0]?.total || 0;
}

async function getUserById(pool, userId) {
  const [rows] = await pool.execute(
    'SELECT id, username, email, role FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  return rows[0] || null;
}

async function assertCanAssignRole(pool, actorId, targetUserId, roleName) {
  if (!targetUserId || !roleName) {
    const err = new Error('Target user and role are required');
    err.status = 400;
    throw err;
  }

  const target = await getUserById(pool, targetUserId);
  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const [roles] = await pool.execute('SELECT name FROM roles WHERE name = ?', [roleName]);
  if (!roles.length) {
    const err = new Error('Role does not exist');
    err.status = 400;
    throw err;
  }

  if (roleName === 'Admin' && parseInt(targetUserId, 10) !== parseInt(actorId, 10)) {
    const actor = await getUserById(pool, actorId);
    if (!actor || actor.role !== 'Admin') {
      const err = new Error('Only existing admins can grant Admin role');
      err.status = 403;
      throw err;
    }
  }

  if (target.role === 'Admin' && roleName !== 'Admin') {
    const adminCount = await countAdmins(pool);
    if (adminCount <= 1) {
      const err = new Error('Cannot demote the last admin account');
      err.status = 403;
      throw err;
    }
  }

  return target;
}

async function assertCanDeleteUser(pool, actorId, targetUserId) {
  if (parseInt(targetUserId, 10) === parseInt(actorId, 10)) {
    const err = new Error('Cannot delete your own account from admin panel');
    err.status = 403;
    throw err;
  }

  const target = await getUserById(pool, targetUserId);
  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (target.role === 'Admin') {
    const adminCount = await countAdmins(pool);
    if (adminCount <= 1) {
      const err = new Error('Cannot delete the last admin account');
      err.status = 403;
      throw err;
    }
  }

  return target;
}

function validateCoinUpdate(type, amount) {
  if (!['bronze', 'silver', 'gold'].includes(type)) {
    const err = new Error('Invalid coin type');
    err.status = 400;
    throw err;
  }
  const parsed = parseInt(amount, 10);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 999999999) {
    const err = new Error('Coin amount must be between 0 and 999,999,999');
    err.status = 400;
    throw err;
  }
  return parsed;
}

function isValidIPv4(ip) {
  return /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(ip);
}

module.exports = {
  PROTECTED_ROLES,
  assertCanAssignRole,
  assertCanDeleteUser,
  validateCoinUpdate,
  isValidIPv4,
};
