import { auth } from "@/services/firebase";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

/**
 * PATCH /api/host/profile
 */
export async function patchHostProfile(patch: Record<string, any>) {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Missing auth token");

  const res = await fetch(`${API_BASE}/api/host/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to update host profile");

  const json = JSON.parse(text);
  return json.host;
}

/**
 * POST /api/host/cars
 * Creates a draft car for the logged-in host
 */
export async function createHostCarDraft(payload: Record<string, any>) {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Missing auth token");

  const res = await fetch(`${API_BASE}/api/host/cars`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to create draft car");

  const json = JSON.parse(text);
  return json.car;
}
