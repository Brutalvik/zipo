import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/app/components/Button/Button";

export default function ModalScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Modal Screen</Text>
          <Text style={styles.description}>
            This is an example modal using Expo Router.
          </Text>

          <Button
            title="Close"
            variant="primary"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  content: { alignItems: "center", gap: 20 },
  title: { fontSize: 32, fontWeight: "bold" },
  description: { fontSize: 16, textAlign: "center", opacity: 0.7 },
});
