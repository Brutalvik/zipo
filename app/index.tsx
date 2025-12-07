import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ImageBackground, // 🛑 Replace this with import { SafeAreaView } from 'react-native-safe-area-context'; // once you install the package to fix the deprecation warning
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { Link, Stack } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

const ZIPO_COLORS = {
  primaryDark: "#1E1E1E",
  textWhite: "#FFFFFF",
  semiTransparent: "rgba(0, 0, 0, 0.7)",
};

export default function WelcomeScreen() {
  // Assuming you have the car image in this path after setting up absolute imports
  const backgroundImage = require("@/assets/images/car.png");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <FontAwesome name="car" size={28} color={ZIPO_COLORS.textWhite} />
            </View>
            <Text style={styles.title}>Welcome to{"\n"}Zipo</Text>
          </View>
          <Link href="/(tabs)" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </Link>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

// --- Styling ---

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ZIPO_COLORS.semiTransparent,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  header: {
    marginTop: 40,
    gap: 32, // 🚨 MARGIN ADDED HERE: Pushes the whole header group slightly right
    marginLeft: 8,
  },
  logoContainer: {
    // 💡 Increased size for better visual presence
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ZIPO_COLORS.semiTransparent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: ZIPO_COLORS.textWhite,
  },
  title: {
    fontSize: 52,
    fontWeight: "bold",
    color: ZIPO_COLORS.textWhite,
    lineHeight: 60,
  },
  button: {
    backgroundColor: ZIPO_COLORS.primaryDark, // 🚨 PADDING REDUCED HERE: Makes the button vertically smaller
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: ZIPO_COLORS.textWhite, // 💡 Slightly reduced size for better fit
    fontSize: 17,
    fontWeight: "600",
  },
});
