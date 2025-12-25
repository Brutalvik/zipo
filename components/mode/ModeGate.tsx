// components/mode/ModeGate.tsx
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useRefreshMe } from "@/hooks/useRefreshMe";

type Props = {
  unauthenticated: React.ReactNode;
  guestHref?: string;
  hostHref?: string;
};

export default function ModeGate({
  unauthenticated,
  guestHref = "/(tabs)",
  hostHref = "/(hosttabs)/hub",
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshMe } = useRefreshMe();

  const ran = useRef(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // not logged in -> show onboarding immediately (no boot splash)
    if (!user) {
      ran.current = false;
      setBooting(false);
      return;
    }

    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        setBooting(true);

        // ✅ decide ONLY using fresh backend user
        const { user: fresh } = await refreshMe();

        const raw = String(fresh?.mode ?? "").toLowerCase();
        const mode = raw === "host" ? "host" : "guest";

        router.replace(mode === "host" ? hostHref : guestHref);
      } catch {
        // fallback: still don't render tabs, just route using local user
        const raw = String(user?.mode ?? "").toLowerCase();
        const mode = raw === "host" ? "host" : "guest";
        router.replace(mode === "host" ? hostHref : guestHref);
      } finally {
        // keep booting true for this screen; it will unmount after replace anyway
        setBooting(true);
      }
    })();
  }, [user, refreshMe, router, hostHref, guestHref]);

  if (!user) return <>{unauthenticated}</>;

  // ✅ Always show splash while we route — prevents guest UI flash
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
});
