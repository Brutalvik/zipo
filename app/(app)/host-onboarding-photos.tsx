// app/host-onboarding-photos.tsx
import React, { useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";
import * as ImageManipulator from "expo-image-manipulator";

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

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic"; // will be rejected by backend allowlist
  return "image/jpeg";
}

async function ensurePngPhoto(p: PickedPhoto): Promise<PickedPhoto> {
  // If already png, keep it
  const mime = guessMime(p.uri, p.mimeType);
  if (mime === "image/png") return p;

  // Convert anything else (heic/jpg/webp/unknown) -> PNG
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

async function uploadToSignedUrl(args: {
  uploadUrl: string;
  uri: string;
  contentType: string;
}) {
  const fileRes = await fetch(args.uri);
  const blob = await fileRes.blob();

  const up = await fetch(args.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": args.contentType,
    },
    body: blob,
  });

  if (!up.ok) {
    const t = await up.text().catch(() => "");
    throw new Error(t || "Upload failed");
  }
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

  const canContinue = photos.length >= 3;

  const hint = useMemo(() => {
    if (photos.length === 0) return "Add at least 3 photos to continue.";
    if (photos.length < 3)
      return `Add ${3 - photos.length} more photo(s) to continue.`;
    if (photos.length < 6) return "Nice! 5–6 photos perform best.";
    return "Great set. You’re ready to continue.";
  }, [photos.length]);

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

  const handleAddPhotos = async () => {
    try {
      setBusy(true);

      const ok = await requestPermissionIfNeeded();
      if (!ok) return;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10,
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
    } catch (e: any) {
      console.warn("pick photos error", e?.message || e);
      Alert.alert("Error", e?.message || "Could not pick photos.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleContinue = async () => {
    try {
      if (!carId) {
        Alert.alert(
          "Missing car id",
          "Navigate here from the draft car step with ?carId=..."
        );
        return;
      }

      if (!canContinue) {
        Alert.alert("Add more photos", "Please add at least 3 photos.");
        return;
      }

      setBusy(true);

      const toFinalize: Array<{
        id: string;
        path: string;
        url?: string;
        mime?: string;
        width?: number;
        height?: number;
      }> = [];

      for (const raw of photos) {
        const p = await ensurePngPhoto(raw);
        const mimeType = "image/png";

        const { uploadUrl, photo } = await requestUploadUrl({
          carId,
          mimeType,
          fileName: p.fileName ?? null,
        });

        await uploadToSignedUrl({
          uploadUrl,
          uri: p.uri,
          contentType: mimeType,
        });

        toFinalize.push({
          id: photo.id,
          path: photo.path,
          url: photo.url,
          mime: photo.mime || mimeType,
          width: p.width,
          height: p.height,
        });
      }

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
    }
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
          <View style={styles.topHeader}>
            <View style={styles.stepPill}>
              <Feather name="image" size={14} color="rgba(17,24,39,0.75)" />
              <Text style={styles.stepPillText}>Add photos</Text>
            </View>

            <View style={styles.progressPill}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "100%" }]} />
              </View>
              <Text style={styles.progressText}>3 of 3</Text>
            </View>
          </View>

          <Text style={styles.h1}>Upload car photos</Text>
          <Text style={styles.h2}>
            Clear photos build trust and increase bookings.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather name="camera" size={16} color="rgba(17,24,39,0.70)" />
              </View>
              <Text style={styles.cardTitle}>Photos</Text>
            </View>

            <Text style={styles.note}>{hint}</Text>

            <View style={{ height: 12 }} />

            <Button
              title={photos.length ? "Add more photos" : "Add photos"}
              onPress={handleAddPhotos}
              variant="primary"
              size="lg"
              disabled={busy}
              isLoading={busy}
            />

            <Text style={styles.tip}>
              Tip: include front, back, side, interior, and odometer.
            </Text>
          </View>

          <View style={styles.gridWrap}>
            {photos.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="image" size={20} color="rgba(17,24,39,0.35)" />
                <Text style={styles.emptyTitle}>No photos yet</Text>
                <Text style={styles.emptySub}>
                  Tap “Add photos” to choose images from your phone.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {photos.map((p) => (
                  <View key={p.id} style={styles.thumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.thumb} />
                    <Pressable
                      onPress={() => handleRemove(p.id)}
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <Feather name="x" size={14} color="#111827" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 12 }} />

          <Button
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            size="lg"
            disabled={!canContinue || busy}
            isLoading={busy}
          />

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backLink,
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

  progressPill: { alignItems: "flex-end", gap: 6 },
  progressBar: {
    width: 88,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.55)",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.40)",
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
  emptyTitle: { fontSize: 14, fontWeight: "900", color: "rgba(17,24,39,0.70)" },
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
