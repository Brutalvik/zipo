import React from "react";
import { Tabs } from "expo-router";
import { ZipoBottomBar } from "@/components/navigation/ZippoBottomBar";
import { GUEST_TAB_CONFIG } from "@/components/navigation/tabConfig";
export default function GuestTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <ZipoBottomBar {...props} tabConfig={GUEST_TAB_CONFIG} />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="nearby" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
