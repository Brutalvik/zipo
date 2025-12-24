import React, { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { setHost } from "@/redux/slices/hostSlice";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

async function getIdToken() {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) throw new Error("Missing auth token");
  return token;
}

async function fetchHostCarById(carId: string) {
  const token = await getIdToken();
  const res = await fetch(`${API_BASE}/api/host/cars?limit=50&offset=0`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to load cars");

  const json = JSON.parse(text);
  const items = Array.isArray(json?.items) ? json.items : [];
  const found = items.find((c: any) => String(c?.id) === String(carId));
  if (!found) throw new Error("Car not found");
  return found;
}

async function publishCar(carId: string) {
  const token = await getIdToken();
  const res = await fetch(
    `${API_BASE}/api/host/cars/${encodeURIComponent(carId)}/publish`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to publish car");

  return JSON.parse(text);
}

function money(n: any, currency: string) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: (currency || "CAD").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency || "CAD"} ${num}`;
  }
}

export default function HostOnboardingPublishScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ carId?: string }>();
  const carId = useMemo(() => String(params?.carId || "").trim(), [params]);

  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const gallery: string[] = useMemo(() => {
    const g = Array.isArray(car?.image_gallery) ? car.image_gallery : [];
    return g
      .map((x: any) => (typeof x === "string" ? x : x?.url))
      .filter(Boolean);
  }, [car]);

  const coverUrl = gallery[0] || car?.image_path || "";

  const readyIssues = useMemo(() => {
    const issues: string[] = [];
    if (!car) return issues;
    if (!car.title) issues.push("Missing title");
    if (!car.vehicle_type) issues.push("Missing vehicle type");
    if (!car.transmission) issues.push("Missing transmission");
    if (!Number.isFinite(Number(car.seats))) issues.push("Missing seats");
    if (!Number.isFinite(Number(car.price_per_day)))
      issues.push("Missing price");
    if (!car.country_code) issues.push("Missing country");
    if (!car.city) issues.push("Missing city");
    if (!car.area) issues.push("Missing area");
    if (!gallery.length) issues.push("Add at least one photo");
    return issues;
  }, [car, gallery.length]);

  const canPublish = !!car && readyIssues.length === 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!carId) return;
        setLoading(true);
        const c = await fetchHostCarById(carId);
        if (mounted) setCar(c);
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Failed to load car");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [carId]);

  const handlePublish = async () => {
    try {
      if (!canPublish) {
        Alert.alert("Not ready", readyIssues.join("\n"));
        return;
      }

      setPublishing(true);
      const { host } = await publishCar(carId);

      if (host) dispatch(setHost(host));

      router.replace("/(hosttabs)/hub");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.h1}>Review your draft</Text>
          <Text style={styles.h2}>Confirm everything before publishing.</Text>

          <View style={styles.card}>
            {loading ? (
              <Text style={styles.note}>Loading…</Text>
            ) : (
              <>
                <View style={styles.heroRow}>
                  <View style={styles.coverWrap}>
                    {coverUrl ? (
                      <Image source={{ uri: coverUrl }} style={styles.cover} />
                    ) : (
                      <View style={styles.coverEmpty}>
                        <Feather name="image" size={18} color="#9CA3AF" />
                        <Text style={styles.coverEmptyText}>No image</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{car?.title}</Text>
                    <Text style={styles.meta}>
                      {car?.vehicle_type} • {car?.transmission} • {car?.seats}{" "}
                      seats
                    </Text>
                    <Text style={styles.meta}>
                      {car?.area}, {car?.city}, {car?.country_code}
                    </Text>
                    <Text style={styles.price}>
                      {money(car?.price_per_day, car?.currency)} / day
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={{ height: 16 }} />

          <Button
            title="Publish car"
            onPress={handlePublish}
            variant="primary"
            size="lg"
            disabled={!canPublish || publishing}
            isLoading={publishing}
          />

          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 18 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  h2: { fontSize: 13, color: "#6B7280", marginBottom: 14 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  heroRow: { flexDirection: "row", gap: 12 },
  coverWrap: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  cover: { width: "100%", height: "100%" },
  coverEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmptyText: { fontSize: 12, color: "#9CA3AF" },
  title: { fontSize: 16, fontWeight: "900" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  price: { fontSize: 14, fontWeight: "900", marginTop: 6 },
  note: { fontSize: 12, color: "#6B7280" },
  backLink: { alignSelf: "center", marginTop: 14 },
  backLinkText: { fontSize: 13, fontWeight: "900", color: "#6B7280" },
});
