import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveFile, deleteFile, validateUpload } from "@/lib/storage";
import { getOcrProvider } from "@/lib/ocr";
import { ALLOWED_CATEGORIES, normalizeCategory } from "@/lib/finance";
import { getEntitlements } from "@/lib/plans";
import { buildPeriodKey, tryConsume, release } from "@/lib/quota";

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

  // 1. File validation (rejects BEFORE quota consumption).
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const err = validateUpload(file);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  // 2. Vehicle ownership check.
  const vehicleId = typeof vehicleIdRaw === "string" ? vehicleIdRaw : null;
  if (vehicleId) {
    const v = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.userId !== user.id) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // 3. Authoritative entitlement.
  const ent = await getEntitlements(user);
  const periodKey = buildPeriodKey(new Date(), { trial: ent.isTrial, userId: user.id });
  const ocrAvailable = getOcrProvider().available;

  // 4. Atomic quota reservation. Only run if OCR is actually available
  //    (otherwise we don't want to "consume" OCR quota for manual uploads).
  let reservation:
    | { kind: "reserved" }
    | { kind: "skipped" }
    | { kind: "denied" } = { kind: "skipped" };
  if (ocrAvailable) {
    const r = await tryConsume({
      userId: user.id,
      metric: "ocr_scans",
      periodKey,
      limit: ent.aiReceiptScansPerMonth,
    });
    if (!r.allowed) {
      return NextResponse.json(
        {
          error: ent.aiReceiptScansPerMonth === 0
            ? "Receipt scanning is not included in your plan"
            : `Monthly OCR limit reached (${ent.aiReceiptScansPerMonth})`,
          code: "OCR_QUOTA_EXCEEDED",
        },
        { status: 403 }
      );
    }
    reservation = { kind: "reserved" };
  }

  // 5. Safe file write.
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const prefix = vehicleId ? `receipts/${vehicleId}` : `receipts/user/${user.id}`;
  let stored: { storageKey: string; sizeBytes: number };
  try {
    stored = await saveFile(prefix, ext, bytes);
  } catch (e) {
    // File write failed — release quota if we reserved it.
    if (reservation.kind === "reserved") {
      await release({ userId: user.id, metric: "ocr_scans", periodKey }).catch(() => {});
    }
    throw e;
  }

  // 6. OCR call.
  const ocr = await getOcrProvider().extract({ bytes, mimeType: file.type });

  // 7. Persist document.
  const title = typeof titleRaw === "string" && titleRaw.length > 0 ? titleRaw : (file.name || "Receipt");
  const doc = await db.document.create({
    data: {
      userId: user.id, vehicleId, title, category,
      storageKey: stored.storageKey, mimeType: file.type, sizeBytes: stored.sizeBytes,
    },
  });

  return ok({ document: doc, ocr, ocrAvailable, message: ocr.status === "unavailable" ? ocr.message : undefined });
});
