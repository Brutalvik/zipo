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
        else reject(new Error(`Upload failed: ${xhr.status}`));
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

function stageLabel(stage: PhotoStage) {
  switch (stage) {
    case "queued":
      return "Queued";
    case "requesting_url":
      return "Preparing";
    case "uploading":
      return "Uploading";
    case "finalizing":
      return "Finalizing";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
  }
}

export default function HostOnboardingPhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ carId?: string }>();
  const carId = (params?.carId || "").toString().trim();

  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  const [photoUi, setPhotoUi] = useState<Record<string, PhotoUiState>>({});
  const [runStats, setRunStats] = useState<{
    current?: string;
    done: number;
    total: number;
  }>({ done: 0, total: 0 });

  const cancelRef = useRef(false);

  const canContinue = photos.length >= 3;

  const overallProgress = useMemo(() => {
    if (!photos.length) return 0;
    const sum = photos.reduce(
      (acc, p) => acc + (photoUi[p.id]?.progress ?? 0),
      0
    );
    return clamp01(sum / photos.length);
  }, [photos, photoUi]);

  const primaryLabel = useMemo(() => {
    if (busy) return "Uploading…";
    if (photos.length === 0) return "Add photos";
    if (!canContinue) return `Add ${3 - photos.length} more photo(s)`;
    return "Upload & Continue";
  }, [busy, photos.length, canContinue]);

  const helperLine = useMemo(() => {
    if (busy) {
      const pct = Math.round(overallProgress * 100);
      return `Uploading ${runStats.done}/${runStats.total} • ${pct}%`;
    }
    if (photos.length === 0) return "Add at least 3 photos to continue.";
    if (photos.length < 3) return `Add ${3 - photos.length} more photo(s).`;
    return "Tip: 5–6 photos perform best.";
  }, [busy, photos.length, runStats.done, runStats.total, overallProgress]);

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
      for (const p of next) if (!seen.has(p.uri)) merged.push(p);
      return merged.slice(0, 12);
    });

    setPhotoUi((prev) => {
      const out = { ...prev };
      for (const p of next)
        out[p.id] = out[p.id] ?? { progress: 0, stage: "queued" };
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

  const onPrimaryPress = async () => {
    if (!carId) {
      Alert.alert(
        "Missing car id",
        "Navigate here from the draft car step with ?carId=..."
      );
      return;
    }

    if (busy) return;

    // single CTA behavior:
    if (!canContinue) {
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

      for (let i = 0; i < photos.length; i++) {
        if (cancelRef.current) throw new Error("Upload cancelled");

        const raw = photos[i];
        setRunStats({ current: raw.id, done: i, total: photos.length });

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
            // map 0..1 -> 0.10..0.92
            setPhotoState(raw.id, { progress: 0.1 + 0.82 * clamp01(frac) });
          },
        });

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
        setRunStats({ current: raw.id, done: i + 1, total: photos.length });
      }

      await finalizePhotos({ carId, photos: toFinalize });

      Alert.alert("Done", "Photos uploaded. Your draft car is updated.");
      router.replace({
        pathname: "/host-onboarding-publish",
        params: { carId },
      });
    } catch (e: any) {
      console.warn("upload photos failed:", e?.message || e);

      // mark current as failed if we know it
      if (runStats.current) {
        setPhotoState(runStats.current, {
          stage: "failed",
          error: e?.message || "Upload failed",
        });
      }

      Alert.alert("Error", e?.message || "Failed to upload photos.");
    } finally {
      setBusy(false);
      setRunStats({ done: 0, total: 0 });
    }
  };

  const onStop = () => {
    if (!busy) return;
    cancelRef.current = true;
    Alert.alert("Stopping", "We will stop after the current upload finishes.");
  };

  // More intuitive layout:
  // - Big top progress card during upload
  // - Grid stays, but spinner is moved into an overlay bar (not cramped)
  // - "Add" action is REMOVED while busy (your request)
  // - Optional Stop button only while busy
  const showTopActionAdd = !busy && photos.length > 0 && photos.length < 12;

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
          {/* Top header */}
          <View style={styles.topHeader}>
            <Pressable
              onPress={() => router.back()}
              disabled={busy}
              style={({ pressed }) => [
                styles.iconBtn,
                busy && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={18} color="#111827" />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>Car photos</Text>
              <Text style={styles.screenSub}>
                {busy ? "Uploading in progress…" : "Add at least 3 photos"}
              </Text>
            </View>

            {showTopActionAdd ? (
              <Pressable
                onPress={pickPhotos}
                style={({ pressed }) => [
                  styles.topRightBtn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
              >
                <Feather name="plus" size={16} color="rgba(17,24,39,0.85)" />
                <Text style={styles.topRightBtnText}>Add</Text>
              </Pressable>
            ) : busy ? (
              <Pressable
                onPress={onStop}
                style={({ pressed }) => [
                  styles.stopBtn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
              >
                <Feather name="x" size={16} color="#991B1B" />
                <Text style={styles.stopBtnText}>Stop</Text>
              </Pressable>
            ) : (
              <View style={{ width: 72 }} />
            )}
          </View>

          {/* Hero / progress card */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroIcon}>
                <Feather name="camera" size={18} color="rgba(17,24,39,0.70)" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>
                  {busy ? "Uploading photos" : "Add photos to your listing"}
                </Text>
                <Text style={styles.heroHint}>{helperLine}</Text>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <View style={styles.overallBar}>
                <View
                  style={[
                    styles.overallFill,
                    { width: `${Math.round(overallProgress * 100)}%` },
                  ]}
                />
              </View>

              <View style={styles.overallMetaRow}>
                <Text style={styles.overallText}>
                  {busy
                    ? `Overall ${Math.round(overallProgress * 100)}%`
                    : `${photos.length}/12 selected`}
                </Text>

                {!busy ? (
                  <View style={styles.requirementsPill}>
                    <Feather
                      name={canContinue ? "check" : "alert-circle"}
                      size={14}
                      color={canContinue ? "#111827" : "rgba(17,24,39,0.55)"}
                    />
                    <Text style={styles.requirementsText}>
                      {canContinue ? "Ready" : "Need 3+"}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.requirementsPill}>
                    <ActivityIndicator />
                    <Text style={styles.requirementsText}>Working</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Grid */}
          <View style={styles.gridWrap}>
            {photos.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="image" size={20} color="rgba(17,24,39,0.35)" />
                <Text style={styles.emptyTitle}>No photos yet</Text>
                <Text style={styles.emptySub}>
                  Tap below to choose images from your phone.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {photos.map((p) => {
                  const ui = photoUi[p.id];
                  const stage = ui?.stage ?? "queued";
                  const prog = clamp01(ui?.progress ?? 0);

                  const showOverlay = busy || stage === "failed";
                  const overlayTone =
                    stage === "done"
                      ? "rgba(255,255,255,0.92)"
                      : stage === "failed"
                      ? "rgba(255,245,245,0.96)"
                      : "rgba(255,255,255,0.92)";

                  return (
                    <View key={p.id} style={styles.thumbWrap}>
                      <Image source={{ uri: p.uri }} style={styles.thumb} />

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

                      {showOverlay && (
                        <View
                          style={[
                            styles.thumbOverlay,
                            { backgroundColor: overlayTone },
                          ]}
                        >
                          {/* Bigger status row (spinner no longer cramped) */}
                          <View style={styles.thumbTopRow}>
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>
                                {stageLabel(stage)}
                              </Text>
                            </View>

                            {stage === "uploading" ||
                            stage === "requesting_url" ||
                            stage === "finalizing" ? (
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

                          {/* Progress bar */}
                          <View style={styles.thumbBar}>
                            <View
                              style={[
                                styles.thumbFill,
                                { width: `${Math.round(prog * 100)}%` },
                              ]}
                            />
                          </View>

                          <View style={styles.thumbBottomRow}>
                            <Text style={styles.thumbMetaText}>
                              {stage === "uploading"
                                ? `${Math.round(prog * 100)}%`
                                : stage === "done"
                                ? "100%"
                                : stage === "failed"
                                ? "—"
                                : ""}
                            </Text>

                            {stage === "failed" && !!ui?.error ? (
                              <Text style={styles.thumbError} numberOfLines={1}>
                                {ui.error}
                              </Text>
                            ) : (
                              <Text
                                style={styles.thumbMetaSub}
                                numberOfLines={1}
                              >
                                {stage === "queued" && !busy
                                  ? "Ready to upload"
                                  : ""}
                              </Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: 12 }} />

          {/* Primary CTA (single button) */}
          <Button
            title={primaryLabel}
            onPress={onPrimaryPress}
            variant="primary"
            size="lg"
            disabled={busy}
            isLoading={busy}
          />

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
    gap: 12,
    marginBottom: 12,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  screenTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },
  screenSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.50)",
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

  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.20)",
  },
  stopBtnText: { fontSize: 12, fontWeight: "900", color: "#991B1B" },

  heroCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
  },

  heroRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.92)",
    letterSpacing: -0.1,
  },

  heroHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.50)",
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

  overallMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  overallText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },

  requirementsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  requirementsText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
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

  // Bigger overlay so spinner is never cramped/covered
  thumbOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },

  thumbTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  thumbBar: {
    marginTop: 8,
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

  thumbBottomRow: {
    marginTop: 8,
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

  thumbMetaSub: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  thumbError: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
  },
});
