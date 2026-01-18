// app/forgot-password.tsx
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/services/firebase";
import Button from "@/components/Button/Button";

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  lightGray: "#F0F0F0",
  border: "#D0D0D0",
  black: "#000000",
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    const e = email.trim().toLowerCase();
    console.log("EMAIL : ", e);
    if (!e) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }
    if (!isValidEmail(e)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      // Optional: pass redirect URL if you set it (see Option 2)
      const request = await sendPasswordResetEmail(auth, e);
      console.log("REQUEST, ", request);
      Alert.alert(
        "Check your email",
        "If an account exists for this email, you’ll receive a password reset link shortly."
      );
      console.log("SUCCESS Firebase project:", auth.app.options.projectId);
      console.log("SUCCESS Auth domain:", auth.app.options.authDomain);
      router.back();
    } catch (err: any) {
      // Keep messaging safe (don’t reveal whether the account exists)
      console.warn("sendPasswordResetEmail error:", err);
      Alert.alert(
        "Check your email",
        "If an account exists for this email, you’ll receive a password reset link shortly."
      );
      console.log("Firebase project:", auth.app.options.projectId);
      console.log("Auth domain:", auth.app.options.authDomain);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Forgot Password" }} />
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we’ll send you a reset link.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={ZIPO_COLORS.grayText}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Button
            title="Send reset link"
            onPress={handleReset}
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
          />

          <Button
            title="Back to login"
            onPress={() => router.replace("/login")}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ZIPO_COLORS.secondary,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  title: {
    marginTop: 20,
    fontSize: 26,
    fontWeight: "bold",
    color: ZIPO_COLORS.black,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: ZIPO_COLORS.grayText,
  },
  form: { marginTop: 24, gap: 12 },
  input: {
    backgroundColor: ZIPO_COLORS.lightGray,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    fontSize: 16,
    height: 55,
  },
});
