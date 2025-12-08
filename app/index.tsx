import React from "react";
import { StyleSheet, View, Text, ImageBackground } from "react-native";
import { Link, Stack } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/app/components/Button/Button";

const ZIPO_COLORS = {
  primaryDark: "#1E1E1E",
  textWhite: "#FFFFFF",
  semiTransparent: "rgba(0, 0, 0, 0.7)",
};

export default function WelcomeScreen() {
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

          <Link href="/login" asChild>
            <Button title="Get Started" variant="glass" style={styles.button} />
          </Link>
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
  header: { marginTop: 40, gap: 32, marginLeft: 8 },
  logoContainer: {
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
  button: { marginBottom: 10 },
});
