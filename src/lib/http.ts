import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { AuthError } from "./auth";
import { RateLimitError } from "./rate-limit";
import { BillingNotConfiguredError } from "./stripe-client";
import { getClientIp } from "./utils";
import { auditLog } from "./audit";

export type Handler<T = unknown> = (req: Request, ctx: T) => Promise<Response | NextResponse>;

export function withErrorHandling<T = unknown>(handler: Handler<T>): Handler<T> {
  return async (req: Request, ctx: T) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json({ error: "Invalid input", issues: e.flatten() }, { status: 400 });
      }
      if (e instanceof AuthError) {
        return NextResponse.json({ error: e.message }, { status: e.code === "UNAUTHENTICATED" ? 401 : 403 });
      }
      if (e instanceof RateLimitError) {
        return NextResponse.json(
          { error: e.message, resetAt: e.resetAt.toISOString() },
          { status: 429 }
        );
      }
      if (e instanceof BillingNotConfiguredError) {
        return NextResponse.json({ error: e.message, code: "BILLING_NOT_CONFIGURED" }, { status: 503 });
      }
      const message = e instanceof Error ? e.message : "Unexpected error";
      const ip = getClientIp(req);
      await auditLog({ action: "api.error", metadata: { message }, ip });
      // eslint-disable-next-line no-console
      console.error("API error:", e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json().catch(() => ({}));
  return schema.parse(body) as T;
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
