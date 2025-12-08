import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store } from "@/redux/store";
import { Provider } from "react-redux";
import AuthGuard from "@/app/AuthGuard";

function RootLayoutNav() {
  return (
    // Wrap the navigation stack with SafeAreaProvider and StatusBar
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

// The main default export that wraps the application with Redux and the AuthGuard
export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthGuard>
        <RootLayoutNav />
      </AuthGuard>
    </Provider>
  );
}
