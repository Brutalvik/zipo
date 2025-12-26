import React, { useMemo } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useAppSelector } from "@/redux/hooks";
import type { HostProfile } from "@/types/host";

function shouldShowHostOnboardingSteps(host: HostProfile | null | undefined) {
  if (!host) return true; // first time / not loaded yet
  return host.status !== "approved"; // still onboarding / not active
}

export default function HostStepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const host = useAppSelector((s: any) => s.host?.me ?? null); // adjust if your slice differs

  const show = useMemo(() => shouldShowHostOnboardingSteps(host), [host]);
  if (!show) return null;

  return (
    <View style={styles.pill}>
      <Text style={styles.text}>
        {current} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  text: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },
});
