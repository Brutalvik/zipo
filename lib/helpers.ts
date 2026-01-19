export function titleCaseWord(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function prettyValue(v: any): string {
  if (v == null) return "—";
  const s = String(v).trim();
  if (!s) return "—";

  // handle snake/kebab/space
  if (s.includes("_") || s.includes("-")) {
    return s
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map(titleCaseWord)
      .join(" ");
  }

  // single word -> Title Case; multi-word -> Title Case each word
  if (s.includes(" ")) {
    return s.split(" ").filter(Boolean).map(titleCaseWord).join(" ");
  }

  return titleCaseWord(s);
}

export function prettyLabel(input: any): string {
  const s = String(input ?? "").trim();
  if (!s) return "—";
  return s
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
