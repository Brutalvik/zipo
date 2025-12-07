import React, { useState, useEffect, useCallback } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { getFirstLaunchStatus } from "@/services/storage";
import "react-native-reanimated";

// ------------------------------------------------------------------
//  REDUX IMPORTS HERE
import { Provider } from "react-redux";
import { store } from "../redux/store";
// ------------------------------------------------------------------

import { useColorScheme } from "@/components/useColorScheme";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  }); // Expo Router uses Error Boundaries to catch errors in the navigation tree.

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // State to track if the data is being loaded and if it's the first launch
  const [isReady, setIsReady] = useState(false);
  const [hasLaunched, setHasLaunched] = useState(false);

  const loadLaunchStatus = useCallback(async () => {
    try {
      const status = await getFirstLaunchStatus();
      setHasLaunched(status);
    } catch (e) {
      console.error(e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    // Start loading the status when components mount
    loadLaunchStatus();
  }, [loadLaunchStatus]);

  // If the status is not loaded yet, return null or a loading indicator
  if (!isReady) {
    return null;
  }

  // Set the initial route dynamically
  const initialRouteName = hasLaunched ? "index" : "onboarding";

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={initialRouteName}>
        {/* ADD onboarding screen */}
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        {/* index is the standard Welcome screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
