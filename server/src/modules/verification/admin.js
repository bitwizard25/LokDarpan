/**
 * Admin access = the account's email is listed in ADMIN_EMAILS (comma separated).
 * Checked against the database on every request; nothing is read from the JWT.
 *
 * SECURITY: signup does not verify email ownership. Register the admin account
 * BEFORE putting its address in ADMIN_EMAILS, otherwise someone else could sign up
 * with that address first.
 */
import User from '../auth/schemas/user.schema.js';
import { AuthorizationError } from '../../utils/errors.js';

export function isAdminEmail(email, env = process.env) {
  if (!email) return false;
  const allowed = (env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(String(email).trim().toLowerCase());
}

/** preHandler factory: authenticates, then requires an admin account. */
export function requireAdmin(authenticate) {
  return async function adminGuard(request, reply) {
    await authenticate(request, reply);
    const user = await User.findById(request.userId).select('email').lean();
    if (!isAdminEmail(user?.email)) throw new AuthorizationError('Admin access required');
  };
}
