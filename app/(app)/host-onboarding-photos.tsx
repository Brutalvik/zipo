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
  StatusBar,
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
      // NOTE: keep camelCase if your backend expects it.
      // If backend expects snake_case, change to: { mime_type: ..., file_name: ... }
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

/** ------------ tiny UI helpers (no extra deps) ------------ */

function Pill({
  icon,
  text,
  tone = "neutral",
}: {
  icon?: keyof typeof Feather.glyphMap;
  text: string;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const toneStyle =
    tone === "good"
      ? styles.pillGood
      : tone === "warn"
      ? styles.pillWarn
      : tone === "danger"
      ? styles.pillDanger
      : styles.pillNeutral;

  const toneText =
    tone === "good"
      ? styles.pillTextGood
      : tone === "warn"
      ? styles.pillTextWarn
      : tone === "danger"
      ? styles.pillTextDanger
      : styles.pillTextNeutral;

  return (
    <View style={[styles.pill, toneStyle]}>
      {icon ? (
        <Feather
          name={icon}
          size={13}
          color={(toneText as any)?.color ?? "rgba(17,24,39,0.7)"}
        />
      ) : null}
      <Text style={[styles.pillText, toneText]}>{text}</Text>
    </View>
  );
}

function SoftProgress({
  value,
  height = 10,
}: {
  value: number; // 0..1
  height?: number;
}) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
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
  const canAddMore = !busy && photos.length > 0 && photos.length < 12;

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

  const helperLine = useMemo(() => {
    if (busy) {
      const pct = Math.round(overallProgress * 100);
      return `Uploading ${runStats.done}/${runStats.total} • ${pct}%`;
    }
    if (photos.length === 0) return "Add at least 3 photos to continue.";
    if (photos.length < 3) return `Add ${3 - photos.length} more to continue.`;
    return "Looks good — 5–6 photos perform best.";
  }, [busy, overallProgress, photos.length, runStats.done, runStats.total]);

  const primaryLabel = useMemo(() => {
    if (busy) return "Uploading…";
    if (photos.length === 0) return "Add photos";
    if (!canContinue) return `Add ${3 - photos.length} more photo(s)`;
    return "Upload & Continue";
  }, [busy, photos.length, canContinue]);

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

  const onStop = () => {
    if (!busy) return;
    cancelRef.current = true;
    Alert.alert("Stopping", "We will stop after the current upload finishes.");
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

    if (!canContinue) {
      await pickPhotos();
      return;
    }

    cancelRef.current = false;
    setBusy(true);
    setRunStats({ done: 0, total: photos.length });

    try {
      // Reset UI state for all photos
      for (const p of photos) {
        setPhotoState(p.id, { stage: "queued", progress: 0, error: undefined });
      }

      const toFinalize: Array<{
        id: string;
        path: string;
        mime?: string;
        width?: number;
        height?: number;
      }> = [];

      // Helper: process and upload a single photo
      const uploadPhoto = async (raw: PickedPhoto) => {
        if (cancelRef.current) throw new Error("Upload cancelled");

        setPhotoState(raw.id, { stage: "requesting_url", progress: 0.03 });

        // Resize & convert to JPEG (1080px max width)
        const processed = await ImageManipulator.manipulateAsync(
          raw.uri,
          [{ resize: { width: 1080 } }],
          {
            format: ImageManipulator.SaveFormat.JPEG,
            compress: 0.8,
          }
        );

        const mimeType = "image/jpeg";
        const fileName =
          raw.fileName?.replace(/\.(png|webp|heic)$/i, ".jpg") ??
          `photo-${raw.id}.jpg`;

        const { uploadUrl, photo } = await requestUploadUrl({
          carId,
          mimeType,
          fileName,
        });

        setPhotoState(raw.id, { stage: "uploading", progress: 0.08 });

        await uploadWithProgressXHR({
          uploadUrl,
          uri: processed.uri,
          contentType: mimeType,
          onProgress: (frac) => {
            setPhotoState(raw.id, { progress: 0.1 + 0.82 * clamp01(frac) });
          },
        });

        setPhotoState(raw.id, { stage: "finalizing", progress: 0.95 });

        toFinalize.push({
          id: photo.id,
          path: photo.path,
          mime: photo.mime || mimeType,
          width: raw.width,
          height: raw.height,
        });

        setPhotoState(raw.id, { stage: "done", progress: 1 });
        setRunStats((prev) => ({
          ...prev,
          done: (prev.done || 0) + 1,
        }));
      };

      // === PRIORITY FIX: Upload FIRST photo sequentially ===
      if (photos.length > 0) {
        const firstPhoto = photos[0];
        await uploadPhoto(firstPhoto); // This runs and finishes first
      }

      // === Then upload the rest concurrently in batches ===
      const remainingPhotos = photos.slice(1);
      const CONCURRENCY = 3;

      for (let i = 0; i < remainingPhotos.length; i += CONCURRENCY) {
        if (cancelRef.current) break;

        const batch = remainingPhotos.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(uploadPhoto));
      }

      // === Finalize all photos on backend (order preserved!) ===
      if (!cancelRef.current) {
        await finalizePhotos({ carId, photos: toFinalize });
        Alert.alert("Done", "Photos uploaded. Your draft car is updated.");
        router.replace({
          pathname: "/host-onboarding-publish",
          params: { carId },
        });
      }
    } catch (e: any) {
      console.warn("upload photos failed:", e?.message || e);

      // If error has photo context, mark it as failed
      if (e?.photoId) {
        setPhotoState(e.photoId, {
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

  const topTone: "good" | "warn" = canContinue ? "good" : "warn";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.safe}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              disabled={busy}
              style={({ pressed }) => [
                styles.navBtn,
                busy && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="arrow-left" size={18} color="#0F172A" />
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.topTitle}>Upload photos</Text>
              <Text style={styles.topSub}>{helperLine}</Text>
            </View>

            {/* remove add button while uploading (your request) */}
            {canAddMore ? (
              <Pressable
                onPress={pickPhotos}
                style={({ pressed }) => [
                  styles.addBtn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
              >
                <Feather name="plus" size={16} color="#0F172A" />
                <Text style={styles.addBtnText}>Add</Text>
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

          {/* Modern hero card */}
          <View style={[styles.card, styles.heroCard]}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Feather name="camera" size={18} color="rgba(15,23,42,0.75)" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Show your car clearly</Text>
                <Text style={styles.heroDesc}>
                  Front, back, sides, interior, and odometer works best.
                </Text>
              </View>

              <Pill
                icon={topTone === "good" ? "check" : "alert-circle"}
                text={canContinue ? "Ready" : "Need 3+"}
                tone={topTone}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <SoftProgress
                value={busy ? overallProgress : photos.length / 12}
              />
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMeta}>
                  {busy
                    ? `Overall ${Math.round(overallProgress * 100)}%`
                    : `${photos.length}/12 selected`}
                </Text>

                <View style={styles.heroMetaPills}>
                  <Pill icon="image" text="PNG auto" tone="neutral" />
                  <Pill icon="shield" text="Secure upload" tone="neutral" />
                </View>
              </View>
            </View>

            {/* Queue / current item line (feels modern + reassuring) */}
            {busy ? (
              <View style={styles.queueLine}>
                <ActivityIndicator />
                <Text style={styles.queueText}>
                  Uploading {runStats.done}/{runStats.total}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Grid */}
          <View style={[styles.card, styles.gridCard]}>
            <View style={styles.gridHeader}>
              <Text style={styles.sectionTitle}>Selected photos</Text>
              <Text style={styles.sectionSub}>Minimum 3 • Recommended 5–6</Text>
            </View>

            {photos.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Feather name="image" size={18} color="rgba(15,23,42,0.45)" />
                </View>
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
                    stage === "failed"
                      ? "rgba(255,245,245,0.96)"
                      : "rgba(255,255,255,0.92)";

                  const badgeTone =
                    stage === "done"
                      ? styles.badgeDone
                      : stage === "failed"
                      ? styles.badgeFail
                      : styles.badgeNeutral;

                  // Find the position (1-based index) in the current photos array
                  const photoIndex =
                    photos.findIndex((photo) => photo.id === p.id) + 1;

                  return (
                    <View key={p.id} style={styles.tile}>
                      <Image source={{ uri: p.uri }} style={styles.tileImg} />

                      {/* === NUMBER BADGE - Main photo priority indicator === */}
                      <View style={styles.tileNumberBadge}>
                        <Text style={styles.tileNumberText}>{photoIndex}</Text>
                      </View>

                      {/* Remove X button (only when not busy) */}
                      {!busy ? (
                        <Pressable
                          onPress={() => removePhoto(p.id)}
                          style={({ pressed }) => [
                            styles.tileX,
                            pressed && { opacity: 0.85 },
                          ]}
                          accessibilityRole="button"
                        >
                          <Feather name="x" size={14} color="#0F172A" />
                        </Pressable>
                      ) : null}

                      {/* existing overlay so spinner isn't cramped */}
                      {showOverlay ? (
                        <View
                          style={[
                            styles.tileOverlay,
                            { backgroundColor: overlayTone },
                          ]}
                        >
                          <View style={styles.tileTopRow}>
                            <View style={[styles.badge, badgeTone]}>
                              <Text style={styles.badgeText}>
                                {stageLabel(stage)}
                              </Text>
                            </View>

                            {stage === "uploading" ||
                            stage === "requesting_url" ||
                            stage === "finalizing" ? (
                              <ActivityIndicator />
                            ) : stage === "done" ? (
                              <Feather name="check" size={16} color="#0F172A" />
                            ) : stage === "failed" ? (
                              <Feather
                                name="alert-circle"
                                size={16}
                                color="#991B1B"
                              />
                            ) : null}
                          </View>

                          <View style={styles.tileBar}>
                            <View
                              style={[
                                styles.tileFill,
                                { width: `${Math.round(prog * 100)}%` },
                              ]}
                            />
                          </View>

                          <View style={styles.tileBottomRow}>
                            <Text style={styles.tilePct}>
                              {stage === "uploading"
                                ? `${Math.round(prog * 100)}%`
                                : stage === "done"
                                ? "100%"
                                : ""}
                            </Text>

                            {stage === "failed" && ui?.error ? (
                              <Text style={styles.tileErr} numberOfLines={1}>
                                {ui.error}
                              </Text>
                            ) : (
                              <Text style={styles.tileHint} numberOfLines={1}>
                                {stage === "queued" && !busy
                                  ? "Ready to upload"
                                  : ""}
                              </Text>
                            )}
                          </View>
                        </View>
                      ) : null}
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

/** --------------- styles --------------- */
const BG = "#F6F7FB";
const INK = "#0F172A";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },

  topTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.1,
  },

  topSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.55)",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: INK,
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

  card: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },

  heroCard: {},

  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.1,
  },

  heroDesc: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.55)",
    lineHeight: 16,
  },

  heroMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  heroMeta: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(15,23,42,0.60)",
  },

  heroMetaPills: { flexDirection: "row", alignItems: "center", gap: 8 },

  queueLine: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.06)",
  },

  queueText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(15,23,42,0.65)",
  },

  // pills
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "900" },

  pillNeutral: {
    backgroundColor: "rgba(15,23,42,0.04)",
    borderColor: "rgba(15,23,42,0.10)",
  },
  pillTextNeutral: { color: "rgba(15,23,42,0.72)" },

  pillGood: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.20)",
  },
  pillTextGood: { color: "rgba(15,23,42,0.85)" },

  pillWarn: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.22)",
  },
  pillTextWarn: { color: "rgba(15,23,42,0.80)" },

  pillDanger: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderColor: "rgba(239,68,68,0.20)",
  },
  pillTextDanger: { color: "#991B1B" },

  // progress
  progressTrack: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.60)",
  },

  gridCard: { marginTop: 12 },

  gridHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: INK,
    letterSpacing: -0.1,
  },

  sectionSub: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.50)",
  },

  empty: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(15,23,42,0.75)",
  },

  emptySub: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(15,23,42,0.45)",
    lineHeight: 16,
    maxWidth: 290,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  tile: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(15,23,42,0.04)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    position: "relative",
  },

  tileImg: { width: "100%", height: "100%" },

  tileX: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  // bigger overlay area so spinner never cramped
  tileOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.06)",
  },

  tileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  badgeNeutral: {
    backgroundColor: "rgba(15,23,42,0.04)",
    borderColor: "rgba(15,23,42,0.10)",
  },

  badgeDone: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.18)",
  },

  badgeFail: {
    backgroundColor: "rgba(239,68,68,0.10)",
    borderColor: "rgba(239,68,68,0.18)",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(15,23,42,0.75)",
  },

  tileBar: {
    marginTop: 8,
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.10)",
    overflow: "hidden",
  },

  tileFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.60)",
  },

  tileBottomRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  tilePct: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(15,23,42,0.75)",
  },

  tileHint: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(15,23,42,0.45)",
  },

  tileErr: {
    flex: 1,
    textAlign: "right",
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
  },
  tileNumberBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.78)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  tileNumberText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
