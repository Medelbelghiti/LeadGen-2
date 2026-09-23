import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser, assertOwnership } from "@/lib/auth";
import { UpdateLeadSchema } from "@/lib/schemas";
import { auditLog } from "@/lib/audit";

export const GET = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(lead.userId, user);
  return ok(lead);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(lead.userId, user);
  const body = await parseJson(req, UpdateLeadSchema);
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.followUpAt !== undefined) data.followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
  const updated = await db.lead.update({ where: { id }, data });
  await auditLog({ userId: user.id, action: "lead.updated", metadata: { leadId: id } });
  return ok(updated);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(lead.userId, user);
  await db.lead.delete({ where: { id } });
  return ok({ ok: true });
});
