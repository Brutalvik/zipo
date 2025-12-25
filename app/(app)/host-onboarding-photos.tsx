// app/host-onboarding-photos.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

type PickedPhoto = {
  id: string;
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
  mimeType?: string | null;
};

type PhotoStage =
  | "queued"
  | "requesting_url"
  | "uploading"
  | "finalizing"
  | "done"
  | "failed";

type PhotoUiState = {
  progress: number; // 0..1
  stage: PhotoStage;
  error?: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp01(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

async function getIdToken() {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error("Missing auth token");
  return idToken;
}

function guessMime(uri: string, fallback?: string | null) {
  const fb = (fallback || "").toLowerCase();
  if (fb && fb !== "application/octet-stream") return fb;

  const u = uri.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
}

async function ensurePngPhoto(p: PickedPhoto): Promise<PickedPhoto> {
  const mime = guessMime(p.uri, p.mimeType);
  if (mime === "image/png") return p;

  const result = await ImageManipulator.manipulateAsync(p.uri, [], {
    format: ImageManipulator.SaveFormat.PNG,
  });

  const nextName =
    p.fileName?.replace(/\.(heic|heif|jpg|jpeg|webp|png)$/i, ".png") ?? null;

  return {
    ...p,
    uri: result.uri,
    mimeType: "image/png",
    fileName: nextName,
  };
}

async function requestUploadUrl(args: {
  carId: string;
  mimeType: string;
  fileName?: string | null;
}) {
  const idToken = await getIdToken();

  const res = await fetch(
    `${API_BASE}/api/host/cars/${encodeURIComponent(
      args.carId
    )}/photos/upload-url`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mimeType: args.mimeType,
        fileName: args.fileName ?? undefined,
      }),
    }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to get upload url");

  const json = JSON.parse(text);
  if (!json?.uploadUrl || !json?.photo?.id || !json?.photo?.path) {
    throw new Error("Invalid upload-url response");
  }

  return {
    uploadUrl: String(json.uploadUrl),
    photo: {
      id: String(json.photo.id),
      path: String(json.photo.path),
      url: typeof json.photo.url === "string" ? String(json.photo.url) : "",
      mime: typeof json.photo.mime === "string" ? String(json.photo.mime) : "",
    },
  };
}

function uploadWithProgressXHR(args: {
  uploadUrl: string;
  uri: string;
  contentType: string;
  onProgress?: (p: number) => void; // 0..1
}) {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const fileRes = await fetch(args.uri);
      const blob = await fileRes.blob();

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", args.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", args.contentType);

      xhr.upload.onprogress = (event) => {
        if (!args.onProgress) return;
        if (event.lengthComputable && event.total > 0) {
          args.onProgress(event.loaded / event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      };

      xhr.onerror = () => reject(new Error("Upload failed: network error"));
      xhr.ontimeout = () => reject(new Error("Upload failed: timeout"));

      xhr.send(blob);
    } catch (e: any) {
      reject(e);
    }
  });
}

async function finalizePhotos(args: {
  carId: string;
  photos: Array<{
    id: string;
    path: string;
    url?: string;
    mime?: string;
    width?: number;
    height?: number;
  }>;
}) {
  const idToken = await getIdToken();

  const res = await fetch(
    `${API_BASE}/api/host/cars/${encodeURIComponent(
      args.carId
    )}/photos/finalize`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ photos: args.photos }),
    }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to finalize photos");

  const json = JSON.parse(text);
  return json.car;
}

export default function HostOnboardingPhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ carId?: string }>();
  const carId = (params?.carId || "").toString().trim();

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  // Per-photo UI state (progress + stage)
  const [photoUi, setPhotoUi] = useState<Record<string, PhotoUiState>>({});
  const [runStats, setRunStats] = useState<{
    current?: string;
    done: number;
    total: number;
  }>({ done: 0, total: 0 });

  const cancelRef = useRef(false);

  const canContinue = photos.length >= 3;

  const ctaLabel = useMemo(() => {
    if (busy) return "Uploading...";
    if (photos.length === 0) return "Add photos";
    if (!canContinue) return `Add ${3 - photos.length} more photo(s)`;
    return "Upload & Continue";
  }, [busy, photos.length, canContinue]);

  const hint = useMemo(() => {
    if (busy) {
      return `Uploading ${runStats.done}/${runStats.total}…`;
    }
    if (photos.length === 0) return "Add at least 3 photos to continue.";
    if (photos.length < 3)
      return `Add ${3 - photos.length} more photo(s) to continue.`;
    if (photos.length < 6) return "Nice! 5–6 photos perform best.";
    return "Great set. You’re ready to continue.";
  }, [busy, photos.length, runStats.done, runStats.total]);

  const overallProgress = useMemo(() => {
    if (!photos.length) return 0;
    const sum = photos.reduce(
      (acc, p) => acc + (photoUi[p.id]?.progress ?? 0),
      0
    );
    return clamp01(sum / photos.length);
  }, [photos, photoUi]);

  const setPhotoState = (id: string, patch: Partial<PhotoUiState>) => {
    setPhotoUi((prev) => ({
      ...prev,
      [id]: {
        progress: prev[id]?.progress ?? 0,
        stage: prev[id]?.stage ?? "queued",
        ...patch,
      },
    }));
  };

  const requestPermissionIfNeeded = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to upload car photos."
      );
      return false;
    }
    return true;
  };

  const pickPhotos = async () => {
    const ok = await requestPermissionIfNeeded();
    if (!ok) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 12,
      quality: 0.9,
    });

    if (res.canceled) return;

    const assets = res.assets ?? [];
    const next: PickedPhoto[] = assets
      .filter((a) => !!a?.uri)
      .map((a) => ({
        id: uid(),
        uri: a.uri,
        width: a.width,
        height: a.height,
        fileName: (a as any).fileName ?? null,
        mimeType: (a as any).mimeType ?? null,
      }));

    setPhotos((prev) => {
      const seen = new Set(prev.map((p) => p.uri));
      const merged = [...prev];
      for (const p of next) {
        if (!seen.has(p.uri)) merged.push(p);
      }
      return merged.slice(0, 12);
    });

    // init UI state
    setPhotoUi((prev) => {
      const out = { ...prev };
      for (const p of next) {
        out[p.id] = out[p.id] ?? { progress: 0, stage: "queued" };
      }
      return out;
    });
  };

  const removePhoto = (id: string) => {
    if (busy) return;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setPhotoUi((prev) => {
      const out = { ...prev };
      delete out[id];
      return out;
    });
  };

  const uploadAllAndContinue = async () => {
    if (!carId) {
      Alert.alert(
        "Missing car id",
        "Navigate here from the draft car step with ?carId=..."
      );
      return;
    }

    if (!canContinue) {
      // single CTA behavior: if not enough photos, just open picker
      await pickPhotos();
      return;
    }

    cancelRef.current = false;
    setBusy(true);
    setRunStats({ done: 0, total: photos.length });

    try {
      // reset UI
      for (const p of photos) {
        setPhotoState(p.id, { stage: "queued", progress: 0, error: "" });
      }

      const toFinalize: Array<{
        id: string;
        path: string;
        url?: string;
        mime?: string;
        width?: number;
        height?: number;
      }> = [];

      // Upload sequentially (less memory, clearer progress)
      for (let i = 0; i < photos.length; i++) {
        if (cancelRef.current) throw new Error("Upload cancelled");

        const raw = photos[i];
        setRunStats({ current: raw.id, done: i, total: photos.length });

        try {
          setPhotoState(raw.id, { stage: "requesting_url", progress: 0.02 });

          const p = await ensurePngPhoto(raw);
          const mimeType = "image/png";

          const { uploadUrl, photo } = await requestUploadUrl({
            carId,
            mimeType,
            fileName: p.fileName ?? null,
          });

          setPhotoState(raw.id, { stage: "uploading", progress: 0.08 });

          await uploadWithProgressXHR({
            uploadUrl,
            uri: p.uri,
            contentType: mimeType,
            onProgress: (frac) => {
              // map 0..1 -> 0.10..0.92 for UI
              setPhotoState(raw.id, {
                progress: 0.1 + 0.82 * clamp01(frac),
              });
            },
          });

          // Add to finalize list (we finalize once at the end)
          setPhotoState(raw.id, { stage: "finalizing", progress: 0.95 });

          toFinalize.push({
            id: photo.id,
            path: photo.path,
            url: photo.url,
            mime: photo.mime || mimeType,
            width: raw.width,
            height: raw.height,
          });

          setPhotoState(raw.id, { stage: "done", progress: 1 });
        } catch (e: any) {
          setPhotoState(raw.id, {
            stage: "failed",
            progress: photoUi[raw.id]?.progress ?? 0,
            error: e?.message || "Upload failed",
          });
          throw e; // stop the whole flow (keeps failure visible)
        } finally {
          setRunStats({ current: raw.id, done: i + 1, total: photos.length });
        }
      }

      // Finalize once: updates DB image_gallery, has_image, image_path cover
      await finalizePhotos({ carId, photos: toFinalize });

      Alert.alert("Done", "Photos uploaded. Your draft car is updated.");
      router.replace({
        pathname: "/host-onboarding-publish",
        params: { carId },
      });
    } catch (e: any) {
      console.warn("upload photos failed:", e?.message || e);
      Alert.alert(
        "Error",
        e?.message || "Failed to upload photos. Please try again."
      );
    } finally {
      setBusy(false);
      setRunStats({ done: 0, total: 0 });
    }
  };

  const topRightActionLabel = useMemo(() => {
    if (busy) return "Stop";
    if (photos.length === 0) return "";
    return "Add";
  }, [busy, photos.length]);

  const onTopRightAction = async () => {
    if (busy) {
      cancelRef.current = true;
      Alert.alert(
        "Stopping",
        "We will stop after the current upload finishes."
      );
      return;
    }
    await pickPhotos();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.safe}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.topHeader}>
            <View style={styles.stepPill}>
              <Feather name="image" size={14} color="rgba(17,24,39,0.75)" />
              <Text style={styles.stepPillText}>Add photos</Text>
            </View>

            {!!topRightActionLabel && (
              <Pressable
                onPress={onTopRightAction}
                style={({ pressed }) => [
                  styles.topRightBtn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
              >
                <Feather
                  name={busy ? "x" : "plus"}
                  size={16}
                  color="rgba(17,24,39,0.85)"
                />
                <Text style={styles.topRightBtnText}>
                  {topRightActionLabel}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.h1}>Upload car photos</Text>
          <Text style={styles.h2}>
            Clear photos build trust and increase bookings.
          </Text>

          {/* Guidance card */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather name="camera" size={16} color="rgba(17,24,39,0.70)" />
              </View>
              <Text style={styles.cardTitle}>Photos</Text>
            </View>

            <Text style={styles.note}>{hint}</Text>

            {/* Overall progress */}
            {busy ? (
              <View style={{ marginTop: 12 }}>
                <View style={styles.overallBar}>
                  <View
                    style={[
                      styles.overallFill,
                      { width: `${Math.round(overallProgress * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.overallText}>
                  Overall: {Math.round(overallProgress * 100)}%
                </Text>
              </View>
            ) : (
              <Text style={styles.tip}>
                Tip: include front, back, side, interior, and odometer.
              </Text>
            )}
          </View>

          {/* Grid */}
          <View style={styles.gridWrap}>
            {photos.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="image" size={20} color="rgba(17,24,39,0.35)" />
                <Text style={styles.emptyTitle}>No photos yet</Text>
                <Text style={styles.emptySub}>
                  Tap the button below to choose images from your phone.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {photos.map((p) => {
                  const ui = photoUi[p.id];
                  const stage = ui?.stage ?? "queued";
                  const prog = clamp01(ui?.progress ?? 0);

                  return (
                    <View key={p.id} style={styles.thumbWrap}>
                      <Image source={{ uri: p.uri }} style={styles.thumb} />

                      {/* Remove */}
                      {!busy && (
                        <Pressable
                          onPress={() => removePhoto(p.id)}
                          style={({ pressed }) => [
                            styles.removeBtn,
                            pressed && { opacity: 0.85 },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Remove photo"
                        >
                          <Feather name="x" size={14} color="#111827" />
                        </Pressable>
                      )}

                      {/* Progress overlay */}
                      {busy && (
                        <View style={styles.thumbOverlay}>
                          <View style={styles.thumbBar}>
                            <View
                              style={[
                                styles.thumbFill,
                                { width: `${Math.round(prog * 100)}%` },
                              ]}
                            />
                          </View>

                          <View style={styles.thumbMetaRow}>
                            <Text style={styles.thumbMetaText}>
                              {stage === "requesting_url"
                                ? "Preparing…"
                                : stage === "uploading"
                                ? `Uploading ${Math.round(prog * 100)}%`
                                : stage === "finalizing"
                                ? "Finalizing…"
                                : stage === "done"
                                ? "Done"
                                : stage === "failed"
                                ? "Failed"
                                : "Queued"}
                            </Text>

                            {stage === "uploading" ? (
                              <ActivityIndicator />
                            ) : stage === "done" ? (
                              <Feather name="check" size={16} color="#111827" />
                            ) : stage === "failed" ? (
                              <Feather
                                name="alert-circle"
                                size={16}
                                color="#991B1B"
                              />
                            ) : null}
                          </View>

                          {stage === "failed" && ui?.error ? (
                            <Text style={styles.thumbError} numberOfLines={2}>
                              {ui.error}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 12 }} />

          {/* Single CTA (combined) */}
          <Button
            title={ctaLabel}
            onPress={uploadAllAndContinue}
            variant="primary"
            size="lg"
            disabled={busy}
            isLoading={busy}
          />

          <Pressable
            onPress={() => router.back()}
            disabled={busy}
            style={({ pressed }) => [
              styles.backLink,
              busy && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },

  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
  },

  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  topRightBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  topRightBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.85)",
  },

  h1: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  h2: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    lineHeight: 18,
    marginBottom: 14,
  },

  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
    marginTop: 2,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },

  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.90)",
    letterSpacing: -0.1,
  },

  note: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    lineHeight: 16,
  },
  tip: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
  },

  overallBar: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.08)",
    overflow: "hidden",
  },
  overallFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.55)",
  },
  overallText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },

  gridWrap: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 12,
    overflow: "hidden",
  },

  emptyState: {
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
  },
  emptySub: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
    maxWidth: 280,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  thumbWrap: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    position: "relative",
  },
  thumb: { width: "100%", height: "100%" },

  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  thumbOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },

  thumbBar: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.10)",
    overflow: "hidden",
  },
  thumbFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.55)",
  },

  thumbMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  thumbMetaText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
  },
  thumbError: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
  },

  backLink: {
    alignSelf: "center",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },
});
