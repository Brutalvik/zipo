export const formatPricePerDay = (n: number) => `$${n}/Day`;

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
