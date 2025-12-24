import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { auth } from "@/services/firebase";

import Button from "@/components/Button/Button";
import { fetchHostMe } from "@/redux/thunks/hostThunk";
import { setHost, selectHost, hostLoadError } from "@/redux/slices/hostSlice";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;

if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

export default function HostProgramScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const host = useAppSelector(selectHost);

  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    (async () => {
      await dispatch(fetchHostMe() as any);
      setLoading(false);
    })();
  }, [dispatch]);

  useEffect(() => {
    if (host && host.status === "approved") router.replace("/(hosttabs)/hub");
  }, [host, router]);

  const handleGetStarted = async () => {
    try {
      setIsRegistering(true);

      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error("Missing auth token");

      const res = await fetch(`${API_BASE}/api/host/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || "Host registration failed");

      const json = JSON.parse(text);
      if (json?.host) dispatch(setHost(json.host));

      router.replace("/(app)/host-onboarding");
    } catch (e: any) {
      console.warn("Host registration failed:", e?.message || e);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar
          translucent={Platform.OS === "android"}
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        translucent={Platform.OS === "android"}
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* ✅ Full-bleed background (NOT inside SafeAreaView) */}
      <ImageBackground
        source={require("@/assets/images/partner.png")}
        style={styles.bg}
        imageStyle={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        {/* ✅ Safe area ONLY for content */}
        <SafeAreaView style={styles.safeContent} edges={["top", "bottom"]}>
          <View style={styles.content}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoText}>Zipo</Text>
            </View>

            <Text style={styles.title}>Welcome to</Text>
            <Text style={styles.subtitle}>Zipo Partner Program</Text>

            <Text style={styles.description}>
              List your car, earn on your schedule, and join the Zipo host
              community. It only takes a few minutes to get started.
            </Text>

            <Button
              title="Get Started"
              size="lg"
              variant="glass"
              isLoading={isRegistering}
              onPress={handleGetStarted}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000", // fallback behind image
  },

  loadingRoot: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  bgImage: {
    width: "100%",
    height: "100%",
    // If your PNG has transparency, this prevents black showing through it:
    backgroundColor: "#000",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  safeContent: {
    flex: 1,
    justifyContent: "flex-end",
  },

  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  logoText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },

  description: {
    fontSize: 15,
    color: "#E5E5E5",
    lineHeight: 22,
    marginBottom: 28,
  },
});
