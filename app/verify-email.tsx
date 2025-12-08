// app/verify-email.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import Button from "@/components/Button/Button";

import { auth } from "@/services/firebase";
import { sendEmailVerification } from "firebase/auth";

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  lightGray: "#F0F0F0",
  border: "#D0D0D0",
  black: "#000000",
  accent: "#2563EB",
};

type VerifyParams = {
  email?: string;
  country?: string;
};

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<VerifyParams>();

  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const displayEmail =
    typeof email === "string" && email.length > 0 ? email : "your email";

  const handleResend = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Not signed in",
        "We couldn't find a logged-in user. Please sign in again."
      );
      router.replace("/login");
      return;
    }

    setIsResending(true);
    try {
      await sendEmailVerification(user);
      Alert.alert(
        "Verification sent",
        `We've sent another verification link to ${displayEmail}.`
      );
    } catch (error: any) {
      console.warn("Resend verification error:", error);
      Alert.alert(
        "Error",
        "We couldn't resend the verification email. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleContinue = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Not signed in",
        "We couldn't find a logged-in user. Please sign in again."
      );
      router.replace("/login");
      return;
    }

    setIsChecking(true);
    try {
      // Refresh user from Firebase
      await user.reload();
      const refreshed = auth.currentUser;

      if (refreshed && refreshed.emailVerified) {
        router.replace("/verify-phone");
      } else {
        Alert.alert(
          "Not verified yet",
          "We still don't see your email as verified. Please tap the link in your inbox, then tap Continue."
        );
      }
    } catch (error: any) {
      console.warn("Check verification error:", error);
      Alert.alert(
        "Error",
        "We couldn't check your verification status. Please try again."
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header logo */}
        <View style={styles.headerArea}>
          <View style={styles.logoContainer}>
            <FontAwesome name="car" size={18} color={ZIPO_COLORS.secondary} />
          </View>
          <Text style={styles.logoText}>Zipo</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Verify your email</Text>

        {/* Description */}
        <Text style={styles.subtitle}>
          We’ve sent a verification link to{" "}
          <Text style={styles.emailHighlight}>{displayEmail}</Text>.{"\n"}
          Tap the link in your inbox, then come back here and tap{" "}
          <Text style={styles.bold}>Continue</Text>.
        </Text>

        {/* Status / spinner */}
        {(isResending || isChecking) && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={ZIPO_COLORS.accent} />
            <Text style={styles.statusText}>
              {isResending
                ? "Resending verification email..."
                : "Checking verification status..."}
            </Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <Button
            title="Continue"
            variant="primary"
            onPress={handleContinue}
            isLoading={isChecking}
          />
          <Button
            title="Resend verification email"
            variant="secondary"
            onPress={handleResend}
            isLoading={isResending}
          />
          <Button
            title="Back to Login"
            variant="secondary"
            onPress={() => router.replace("/login")}
          />
        </View>

        {/* Hint */}
        <Text style={styles.footerHint}>
          Didn’t get the email? Check your spam folder or try resending.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ZIPO_COLORS.secondary,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  headerArea: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ZIPO_COLORS.black,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    color: ZIPO_COLORS.black,
    marginLeft: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: ZIPO_COLORS.black,
    marginTop: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: ZIPO_COLORS.grayText,
    lineHeight: 20,
  },
  emailHighlight: {
    fontWeight: "600",
    color: ZIPO_COLORS.primary,
  },
  bold: {
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 10,
  },
  statusText: {
    fontSize: 13,
    color: ZIPO_COLORS.grayText,
  },
  buttonGroup: {
    marginTop: 40,
    gap: 12,
  },
  footerHint: {
    textAlign: "center",
    fontSize: 13,
    color: ZIPO_COLORS.grayText,
  },
});
