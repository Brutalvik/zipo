import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store } from "@/redux/store";
import { Provider } from "react-redux";
import AuthGuard from "@/app/AuthGuard";

// The main component defining the navigation structure
function RootLayoutNav() {
  return (
    // Wrap the navigation stack with SafeAreaProvider and StatusBar
    <SafeAreaProvider>
      {/* Set the status bar style for the entire app */}
      <StatusBar style="light" />

      {/* Define the navigation stack (your routes) */}
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* We generally let AuthGuard handle the initial redirect, but you can 
            explicitly list unprotected routes here */}
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        {/* The AuthGuard will handle routing to /login if unauthenticated */}
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
      {/* AuthGuard is used here to monitor auth state and handle redirects, 
          but it MUST contain the actual navigator (RootLayoutNav) inside it 
          or call a component that contains the navigator. 
          
          However, based on the structure of AuthGuard we defined (which renders Stack internally), 
          we need to ensure it wraps the RootLayoutNav logic properly. 
          
          A simpler approach is to merge the logic: */}
      <AuthGuard>
        {/* RootLayoutNav contains the entire Stack navigation structure */}
        <RootLayoutNav />
      </AuthGuard>
    </Provider>
  );
}
