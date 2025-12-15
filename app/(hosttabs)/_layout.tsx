import React from "react";
import { Tabs } from "expo-router";
import { ZipoBottomBar } from "@/components/navigation/ZippoBottomBar";
import { HOST_TAB_CONFIG } from "@/components/navigation/tabConfig";

export default function HostTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <ZipoBottomBar {...props} tabConfig={HOST_TAB_CONFIG} />
      )}
    >
      <Tabs.Screen name="hub" />
      <Tabs.Screen name="cars" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="earnings" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
