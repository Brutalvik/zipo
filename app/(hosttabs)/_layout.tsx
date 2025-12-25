import React from "react";
import { Tabs } from "expo-router";
import { ZipoBottomBar } from "@/components/navigation/ZippoBottomBar";

export default function HostTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ZipoBottomBar {...props} />}
    >
      <Tabs.Screen name="hub" />
      <Tabs.Screen name="cars" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="earnings" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
