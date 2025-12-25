import React from "react";
import { Tabs } from "expo-router";
import { ZipoBottomBar } from "@/components/navigation/ZippoBottomBar";

export default function GuestTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ZipoBottomBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="nearby" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
