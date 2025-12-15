import React from "react";
import { Redirect } from "expo-router";
import { useAppSelector } from "@/redux/hooks";

export default function AppModeGate() {
  const user = useAppSelector((s) => s.auth.user);
  const mode = (user as any)?.mode === "host" ? "host" : "guest";

  if (!user) return <Redirect href="/login" />;

  return mode === "host" ? (
    <Redirect href="/(hosttabs)/hub" />
  ) : (
    <Redirect href="/(tabs)" />
  );
}
