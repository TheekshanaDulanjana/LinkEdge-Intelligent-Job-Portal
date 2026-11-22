import { Request } from 'express';
import { createLogger } from '../../../shared/logger/logger';
import { prisma } from './db';

const logger = createLogger('auth-service');

export interface AuditDetails {
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  actorEmail?: string;
  actorId?: string | null;
}

/** Append an entry to the audit log. A failure to log never breaks the request, but is reported. */
export async function audit(req: Request | null, action: string, d: AuditDetails = {}) {
  try {
    const admin = (req as any)?.admin as { id: string; email: string } | undefined;
    await prisma.auditLog.create({
      data: {
        actorId: admin?.id ?? d.actorId ?? null,
        actorEmail: admin?.email ?? d.actorEmail ?? 'system',
        action,
        targetType: d.targetType,
        targetId: d.targetId,
        targetLabel: d.targetLabel?.slice(0, 200),
        reason: d.reason?.slice(0, 1000),
        metadata: d.metadata as any,
        ip: req?.ip?.slice(0, 64),
      },
    });
  } catch (e) {
    logger.error('Audit log write failed', { action, error: String(e) });
  }
}
