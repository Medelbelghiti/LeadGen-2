import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveFile, validateUpload } from "@/lib/storage";
import { getOcrProvider } from "@/lib/ocr";
import { ALLOWED_CATEGORIES, normalizeCategory } from "@/lib/finance";
import { getEntitlements, QuotaExceededError } from "@/lib/quota";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const docs = await db.document.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return ok({ documents: docs, ocrAvailable: getOcrProvider().available });
});

const ALLOWED_CATEGORY_SET = new Set<string>(ALLOWED_CATEGORIES);

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  const vehicleIdRaw = form.get("vehicleId");
  const titleRaw = form.get("title");
  const categoryRaw = (form.get("category") as string | null) ?? "other";
  const category = ALLOWED_CATEGORY_SET.has(categoryRaw) ? categoryRaw : "other";
  void normalizeCategory;

  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const err = validateUpload(file);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const vehicleId = typeof vehicleIdRaw === "string" ? vehicleIdRaw : null;
  if (vehicleId) {
    const v = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.userId !== user.id) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // 1. Validate entitlement + quota BEFORE doing any expensive work.
  // Only count against OCR quota when OCR is actually available.
  const ent = await getEntitlements(user);
  const ocrAvailable = getOcrProvider().available;
  if (ocrAvailable) {
    const period = ent.periodKey.startsWith("trial:") ? "trial" : new Date().toISOString().slice(0, 7);
    const used = await db.expense.count({
      where: { userId: user.id, source: "receipt_scan", date: { gte: new Date(period === "trial" ? 0 : Date.parse(period + "-01")) } },
    });
    const limit = ent.aiReceiptScansPerMonth;
    if (limit === 0) throw new QuotaExceededError("aiScans", "Receipt scanning is not included in your plan");
    if (used >= limit) throw new QuotaExceededError("aiScans", `Monthly receipt-scan limit reached (${limit})`);
  }

  // 2. Safe file write
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const prefix = vehicleId ? `receipts/${vehicleId}` : `receipts/user/${user.id}`;
  const { storageKey, sizeBytes } = await saveFile(prefix, ext, bytes);

  // 3. OCR (if provider available)
  const ocr = await getOcrProvider().extract({ bytes, mimeType: file.type });
  const title = typeof titleRaw === "string" && titleRaw.length > 0 ? titleRaw : (file.name || "Receipt");

  // 4. Persist
  const doc = await db.document.create({
    data: {
      userId: user.id, vehicleId, title, category,
      storageKey, mimeType: file.type, sizeBytes,
    },
  });

  return ok({ document: doc, ocr, ocrAvailable, message: ocr.status === "unavailable" ? ocr.message : undefined });
});
