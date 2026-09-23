import { db } from "./db";

export async function auditLog(params: {
  userId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ip: params.ip,
      },
    });
  } catch {
    // Audit logging must never break the request path.
  }
}
