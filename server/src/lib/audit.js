import { query } from '../db/query.js';

export async function audit(req, action, entityType, entityId, metadata = {}) {
  try {
    await query(
      `insert into audit_logs (actor_user_id, actor_employee_id, action, entity_type, entity_id, metadata)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        req.user?.sub || null,
        req.user?.employeeId ? String(req.user.employeeId) : null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        metadata,
      ],
    );
  } catch (error) {
    if (error.code === '42P01') return;
    throw error;
  }
}
