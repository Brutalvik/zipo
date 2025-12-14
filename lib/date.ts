export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDateTime(d: Date) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());

  let h = d.getHours();
  const m = pad2(d.getMinutes());
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h === 0 ? 12 : h;

  return `${yyyy}-${mm}-${dd} • ${h}:${m} ${ampm}`;
}

export function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
