const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

export async function geocodeAddress({
  address,
  token,
}: {
  address: string;
  token: string;
}): Promise<{ lat: number; lng: number }> {
  const res = await fetch(`${API_BASE}/api/geocode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ address }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to geocode address");

  const json = JSON.parse(text);
  const lat = Number(json?.lat);
  const lng = Number(json?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Invalid geocode result");
  }

  return { lat, lng };
}
