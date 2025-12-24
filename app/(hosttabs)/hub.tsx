import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchHostMe } from "@/redux/thunks/hostThunk";

export default function HostHubScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const user = useAppSelector((s) => s.auth.user);
  const hostState = useAppSelector((s: any) => s.host); // keep flexible
  const host = hostState?.host ?? null;
  const hostLoading = hostState?.loading ?? false;

  useEffect(() => {
    // If user is not in host mode, don't allow host tabs
    if (user?.mode !== "host") {
      router.replace("/(app)");
      return;
    }

    dispatch(fetchHostMe() as any);
  }, [dispatch, router, user?.mode]);

  useEffect(() => {
    if (hostLoading) return;

    // No host row yet -> send to host-program
    if (!host) {
      router.replace("/(app)/host-program");
      return;
    }

    // Host exists but draft -> send to onboarding
    if (host?.status === "draft") {
      router.replace("/(app)/host-onboarding");
      return;
    }

    // Otherwise stay on hub
  }, [host, hostLoading, router]);

  if (hostLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // If host is null or draft, router will replace — but render something safe anyway
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.title}>Host Hub</Text>
        <Text style={styles.sub}>Loading your host dashboard…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800" },
  sub: { marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.55)" },
});
