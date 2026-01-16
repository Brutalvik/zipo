export default function normStatus(
  s: any
): "active" | "draft" | "inactive" | "other" {
  const v = String(s || "")
    .toLowerCase()
    .trim();
  if (v === "active") return "active";
  if (v === "draft") return "draft";
  if (v === "inactive") return "inactive";

  return "other";
}
