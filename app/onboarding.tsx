import React from "react";
import { StyleSheet, View, Text, Image } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/app/components/Button/Button";

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container}>
        <View style={styles.topSection}>
          <Image
            source={require("@/assets/images/blackcar.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.title}>Rent Cars Easily</Text>
          <Text style={styles.subtitle}>
            The simplest peer-to-peer car rental experience.
          </Text>

          <Button
            title="Continue"
            variant="primary"
            onPress={() => router.replace("/signup")}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  topSection: { flex: 1, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "70%" },
  bottomSection: { gap: 16 },
  title: { fontSize: 32, fontWeight: "bold", textAlign: "center" },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 20,
  },
});
