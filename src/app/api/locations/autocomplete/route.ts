import { withErrorHandling, ok } from "@/lib/http";
import { suggestLocations } from "@/services/locations";

export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const items = await suggestLocations(q, 8);
  return ok({ items });
});
