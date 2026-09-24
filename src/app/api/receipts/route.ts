import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveFile, validateUpload } from "@/lib/storage";
import { getOcrProvider } from "@/lib/ocr";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const docs = await db.document.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return ok({ documents: docs, ocrAvailable: getOcrProvider().available });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  const vehicleIdRaw = form.get("vehicleId");
  const titleRaw = form.get("title");
  const category = (form.get("category") as string | null) ?? "other";

  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const err = validateUpload(file);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const vehicleId = typeof vehicleIdRaw === "string" ? vehicleIdRaw : null;
  if (vehicleId) {
    const v = await db.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v || v.userId !== user.id) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const prefix = vehicleId ? "receipts/" + vehicleId : "receipts/user/" + user.id;
  const { storageKey, sizeBytes } = await saveFile(prefix, ext, bytes);

  const ocr = await getOcrProvider().extract({ bytes, mimeType: file.type });
  const title = typeof titleRaw === "string" && titleRaw.length > 0 ? titleRaw : (file.name || "Receipt");

  const doc = await db.document.create({
    data: {
      userId: user.id, vehicleId: vehicleId, title, category: category,
      storageKey, mimeType: file.type, sizeBytes,
    },
  });

  return ok({ document: doc, ocr, message: ocr.status === "unavailable" ? ocr.message : undefined });
});
