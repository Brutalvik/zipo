export function titleCaseCity(input: string) {
  const s = input.trim();
  if (!s) return "";
  // Title-case each word, preserve hyphens
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) =>
      w
        .split("-")
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ""))
        .join("-")
    )
    .join(" ");
}

export function formatDateTime(d: Date) {
  // 14-Jan-25 2:00 PM
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  const mon = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(-2);

  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  return `${day}-${mon}-${yy} ${h}:${m} ${ampm}`;
}

export function fmtRange(pickupAt: Date, days: number) {
  const start = new Date(pickupAt);
  const end = new Date(pickupAt);
  end.setDate(end.getDate() + Math.max(1, days));
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}
