import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser, assertOwnership } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/utils";

const Schema = z.object({ vehicleId: z.string() });

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, Schema);
  const v = await db.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (!v) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  assertOwnership(v.userId, user);
  const link = await db.shareLink.create({
    data: {
      userId: user.id,
      token: randomToken(24),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return ok({ token: link.token, url: "/share?token=" + link.token });
});

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const links = await db.shareLink.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ links });
});
