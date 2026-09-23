import * as XLSX from "xlsx";
import { csvCell } from "@/lib/utils";

export const EXPORT_COLUMNS = [
  "Business Name",
  "Category",
  "Subcategory",
  "Description",
  "Phone",
  "International Phone",
  "Email",
  "Website",
  "Domain",
  "Address",
  "Street",
  "City",
  "Region",
  "Postal Code",
  "Country",
  "Latitude",
  "Longitude",
  "Rating",
  "Review Count",
  "Source",
  "Source URL",
  "Data Quality",
  "Status",
  "Tags",
  "Notes",
  "Collected At",
] as const;

export type ExportFormat = "csv" | "xlsx" | "json";

export interface ExportableLead {
  businessName: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  phone: string | null;
  internationalPhone: string | null;
  email: string | null;
  website: string | null;
  domain: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number | null;
  source: string;
  sourceUrl: string | null;
  dataQualityScore: number;
  status: string;
  tags: string[];
  notes: string | null;
  collectedAt: Date;
}

export function leadToRow(lead: ExportableLead): Record<string, unknown> {
  return {
    "Business Name": lead.businessName,
    "Category": lead.category ?? "",
    "Subcategory": lead.subcategory ?? "",
    "Description": lead.description ?? "",
    "Phone": lead.phone ?? "",
    "International Phone": lead.internationalPhone ?? "",
    "Email": lead.email ?? "",
    "Website": lead.website ?? "",
    "Domain": lead.domain ?? "",
    "Address": lead.address ?? "",
    "Street": lead.street ?? "",
    "City": lead.city ?? "",
    "Region": lead.region ?? "",
    "Postal Code": lead.postalCode ?? "",
    "Country": lead.country ?? "",
    "Latitude": lead.latitude ?? "",
    "Longitude": lead.longitude ?? "",
    "Rating": lead.rating ?? "",
    "Review Count": lead.reviewCount ?? "",
    "Source": lead.source,
    "Source URL": lead.sourceUrl ?? "",
    "Data Quality": lead.dataQualityScore,
    "Status": lead.status,
    "Tags": (lead.tags ?? []).join("; "),
    "Notes": lead.notes ?? "",
    "Collected At": lead.collectedAt instanceof Date ? lead.collectedAt.toISOString() : String(lead.collectedAt),
  };
}

export function toCsv(leads: ExportableLead[]): string {
  const header = EXPORT_COLUMNS.join(",");
  const rows = leads.map((l) => EXPORT_COLUMNS.map((c) => csvCell(leadToRow(l)[c])).join(","));
  return [header, ...rows].join("\n");
}

export function toXlsx(leads: ExportableLead[]): Buffer {
  const rows = leads.map((l) => leadToRow(l));
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...EXPORT_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function toJson(leads: ExportableLead[]): string {
  return JSON.stringify(leads.map((l) => leadToRow(l)), null, 2);
}

export function contentType(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv; charset=utf-8";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "json":
      return "application/json; charset=utf-8";
  }
}
