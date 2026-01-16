// redux/thunks/avatarThunk.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { auth } from "@/services/firebase";
import { updateUser } from "@/redux/slices/authSlice";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

type UploadAvatarArgs = {
  uri: string;
  mimeType?: string | null;
};

function guessMimeTypeFromUri(uri: string): string {
  const u = (uri || "").toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const uploadUserAvatar = createAsyncThunk<
  { user: any; photoUrl: string | null; photoPath: string },
  UploadAvatarArgs,
  { rejectValue: string }
>("avatar/uploadUserAvatar", async (args, thunkApi) => {
  try {
    const current = auth.currentUser;
    const idToken = await current?.getIdToken(true);
    if (!idToken) return thunkApi.rejectWithValue("Missing auth token");

    const rawMime =
      (args.mimeType || "").trim().toLowerCase() ||
      guessMimeTypeFromUri(args.uri);

    const normalizedMime = rawMime === "image/jpg" ? "image/jpeg" : rawMime;

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(normalizedMime)) {
      return thunkApi.rejectWithValue(
        "Only image/jpeg, image/png, image/webp are allowed."
      );
    }

    // 1) Signed WRITE URL (PUT) + photo.path
    const presignRes = await fetch(`${API_BASE}/api/users/avatar/upload-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mimeType: normalizedMime }),
    });

    const presignText = await presignRes.text();
    if (!presignRes.ok) {
      const j = safeJson(presignText);
      return thunkApi.rejectWithValue(
        j?.message || presignText || "Failed to generate upload URL"
      );
    }

    const presignJson = safeJson(presignText);

    // ✅ IMPORTANT: these keys MUST match backend response
    const uploadUrl: string | undefined = presignJson?.uploadUrl;
    const path: string | undefined = presignJson?.photo?.path;

    if (!uploadUrl || !path) {
      return thunkApi.rejectWithValue(
        "Invalid upload-url response from server (missing uploadUrl/photo.path)"
      );
    }

    // 2) Upload bytes to GCS with signed PUT
    const imgRes = await fetch(args.uri);
    const blob = await imgRes.blob();

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": normalizedMime },
      body: blob as any,
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      return thunkApi.rejectWithValue(
        errText || `Upload failed (HTTP ${putRes.status})`
      );
    }

    // 3) Finalize (store path, delete old)
    const finRes = await fetch(`${API_BASE}/api/users/avatar/finalize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path }),
    });

    const finText = await finRes.text();
    if (!finRes.ok) {
      const j = safeJson(finText);
      return thunkApi.rejectWithValue(
        j?.message || finText || "Failed to finalize avatar"
      );
    }

    const finJson = safeJson(finText);
    const user = finJson?.user;
    if (!user) {
      return thunkApi.rejectWithValue("Finalize succeeded but user is missing");
    }

    // Keep user updated (path stored)
    thunkApi.dispatch(
      updateUser({
        ...user,
        profile_photo_path: path,
      } as any)
    );

    // 4) Signed READ URL (GET) for rendering in <Image />
    const readRes = await fetch(`${API_BASE}/api/users/avatar/read-url`, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    const readText = await readRes.text();
    if (!readRes.ok) {
      // Not fatal: avatar saved; UI can refresh later
      return { user, photoUrl: null, photoPath: path };
    }

    const readJson = safeJson(readText);
    const signedUrl: string | null = readJson?.url ?? null;

    thunkApi.dispatch(
      updateUser({
        profile_photo_url: signedUrl,
      } as any)
    );

    return { user, photoUrl: signedUrl, photoPath: path };
  } catch (e: any) {
    return thunkApi.rejectWithValue(e?.message || "Avatar upload failed");
  }
});

export const refreshSignedAvatarUrl = createAsyncThunk<
  { url: string | null },
  void,
  { rejectValue: string }
>("avatar/refreshSignedAvatarUrl", async (_, thunkApi) => {
  try {
    const current = auth.currentUser;
    const idToken = await current?.getIdToken(true);
    if (!idToken) return thunkApi.rejectWithValue("Missing auth token");

    const res = await fetch(`${API_BASE}/api/users/avatar/read-url`, {
      method: "GET",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    const text = await res.text();
    if (!res.ok) {
      const j = safeJson(text);
      return thunkApi.rejectWithValue(
        j?.message || text || "Failed to read avatar url"
      );
    }

    const json = safeJson(text);
    const url = json?.url ?? null;

    thunkApi.dispatch(updateUser({ profile_photo_url: url } as any));

    return { url };
  } catch (e: any) {
    return thunkApi.rejectWithValue(
      e?.message || "Failed to refresh avatar url"
    );
  }
});
