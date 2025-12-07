import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { Stack, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { setFirstLaunch } from "../services/storage"; // Import the setter

// --- Constants ---
const ZIPO_COLORS = {
  primaryDark: "#1E1E1E",
  textWhite: "#FFFFFF",
  semiTransparent: "rgba(0, 0, 0, 0.6)", // Slightly lighter overlay for this screen
};

export default function OnboardingScreen() {
  // NOTE: Replace with the actual image for the black car
  const backgroundImage = require("@/assets/images/blackcar.png");

  // Function to set the flag and navigate
  const handleGetStarted = () => {
    setFirstLaunch(); // Set the flag so this screen doesn't show again
  };

  return (
    <>
      {/* Hide header and tab bar */}
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <SafeAreaView style={styles.container}>
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <FontAwesome name="car" size={24} color={ZIPO_COLORS.textWhite} />
            </View>
            <Text style={styles.title}>
              Lets Start{"\n"}A New Experience{"\n"}With Car rental.
            </Text>
          </View>

          {/* Body Text */}
          <View style={styles.footer}>
            <Text style={styles.bodyText}>
              Discover your next adventure with Zipo. we're here to provide you
              with a seamless car rental experience. Let's get started on your
              journey.
            </Text>

            {/* Action Button: Navigates to the standard Welcome Screen first */}
            <Link href="/" asChild onPress={handleGetStarted}>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Get Started</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ZIPO_COLORS.semiTransparent,
  },
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  header: { marginTop: 40, paddingLeft: 4 },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ZIPO_COLORS.semiTransparent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: ZIPO_COLORS.textWhite,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: ZIPO_COLORS.textWhite,
    lineHeight: 56,
  },
  footer: { marginBottom: 10 },
  bodyText: {
    color: ZIPO_COLORS.textWhite,
    fontSize: 14,
    marginBottom: 30,
    lineHeight: 20,
  },
  button: {
    backgroundColor: ZIPO_COLORS.primaryDark,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: ZIPO_COLORS.textWhite, fontSize: 18, fontWeight: "600" },
});
