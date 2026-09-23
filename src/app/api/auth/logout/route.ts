import { destroySession } from "@/lib/auth";
import { ok } from "@/lib/http";

export const POST = async () => {
  destroySession();
  return ok({ ok: true });
};
