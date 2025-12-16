// app/verify-email.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";
import { verifyBeforeUpdateEmail } from "firebase/auth";

import { useAppDispatch } from "@/redux/hooks";
import { signOut, updateUser } from "@/redux/slices/authSlice";

import { FirebaseError } from "firebase/app";
import * as Updates from "expo-updates";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  black: "#000000",
  accent: "#2563EB",
};

type VerifyParams = {
  email?: string;
  next?: string;
};

function normalizeEmail(v: any) {
  return (v ?? "").toString().trim().toLowerCase();
}

function isAuthError(code: string, err: unknown) {
  return err instanceof FirebaseError && err.code === code;
}
``;
export default function VerifyEmailScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { email, next } = useLocalSearchParams<VerifyParams>();

  const targetEmail = normalizeEmail(email);
  const displayEmail = targetEmail || "your email";

  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const syncEmailToDb = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    // Force token refresh to get latest claims
    const idToken = await user.getIdToken(true);

    const res = await fetch(`${API_BASE}/api/users/email/sync`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || "Failed to sync email");

    const json = JSON.parse(text);
    if (json?.user) dispatch(updateUser(json.user));
  };

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

    if (!targetEmail) {
      Alert.alert("Error", "No target email specified for verification.");
      return;
    }

    setIsResending(true);
    try {
      // Reload user first to get latest state
      await user.reload();
      const refreshed = auth.currentUser;

      if (!refreshed) {
        throw new Error("Could not refresh user state");
      }

      // Use verifyBeforeUpdateEmail again - this sends to the NEW email
      await verifyBeforeUpdateEmail(refreshed, targetEmail);

      Alert.alert(
        "Verification sent",
        `We've sent another verification link to ${targetEmail}.`
      );
    } catch (error: any) {
      console.warn("Resend verification error:", error);

      // Handle specific errors
      if (error?.code === "auth/requires-recent-login") {
        Alert.alert("Alert", "For security, please go back and try again.");
      } else {
        Alert.alert(
          "Error",
          error?.message ||
            "We couldn't resend the verification email. Please try again."
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleContinue = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Not signed in", "Please sign in again.");
      router.replace("/login");
      return;
    }

    setIsChecking(true);
    try {
      // CRITICAL: Reload user to fetch latest state from Firebase
      const refresehedUser = await user.reload();
      console.log("Refreshed User : ", refresehedUser);
      // Get fresh reference after reload
      const refreshed = auth.currentUser;

      console.log("----REFERESHED---- : ", refreshed);

      if (!refreshed) {
        throw new Error("Could not refresh user state");
      }

      const currentEmail = normalizeEmail(refreshed.email);
      const isVerified = !!refreshed.emailVerified;

      console.log("Verification check:", {
        targetEmail,
        currentEmail,
        isVerified,
        emailMatch: currentEmail === targetEmail,
      });

      // When using verifyBeforeUpdateEmail:
      // 1. User clicks link -> Firebase updates email AND sets emailVerified=true
      // 2. We need to check BOTH conditions
      const emailMatches = targetEmail ? currentEmail === targetEmail : true;

      if (isVerified && emailMatches) {
        // Success! Sync to database
        try {
          await syncEmailToDb();
        } catch (e: any) {
          console.warn("Email sync failed:", e?.message || e);
          // Continue anyway - they can try again from profile
        }

        Alert.alert(
          "Email verified",
          "Your email has been verified successfully! Please log in again.",
          [
            {
              text: "OK",
              onPress: async () => {
                await auth.signOut();
                dispatch(signOut());
                router.replace("/login");
              },
            },
          ]
        );
        return;
      }

      // Not verified yet - show helpful message
      if (!isVerified) {
        Alert.alert(
          "Not verified yet",
          `Please tap the verification link in the email we sent to ${displayEmail}, then come back and tap Continue.`
        );
      } else if (!emailMatches) {
        Alert.alert(
          "Email mismatch",
          `Your email is verified as ${currentEmail}, but we're expecting ${targetEmail}. Please check the verification link or go back and try again.`
        );
      }
    } catch (error: any) {
      console.warn("Check verification error:", error);
      // Token expired → user MUST re-login
      if (isAuthError("auth/user-token-expired", error)) {
        Alert.alert("Session expired", "Please log in again.", [
          {
            text: "OK",
            onPress: async () => {
              await auth.signOut();
              dispatch(signOut());
              router.replace("/login");
            },
          },
        ]);
        return;
      }

      // 🔐 User disabled / deleted (rare but important)
      if (
        isAuthError("auth/user-disabled", error) ||
        isAuthError("auth/user-not-found", error)
      ) {
        await auth.signOut();
        dispatch(signOut());
        router.replace("/login");
        return;
      }

      // ❌ Everything else
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
        <View style={styles.headerArea}>
          <View style={styles.logoContainer}>
            <FontAwesome name="car" size={18} color={ZIPO_COLORS.secondary} />
          </View>
          <Text style={styles.logoText}>Zipo</Text>
        </View>

        <Text style={styles.title}>Verify your email</Text>

        <Text style={styles.subtitle}>
          We've sent a verification link to{" "}
          <Text style={styles.emailHighlight}>{displayEmail}</Text>.{"\n"}
          Tap the link in your inbox, then come back and tap{" "}
          <Text style={styles.bold}>Continue</Text>.
        </Text>

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
            title="Back"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>

        <Text style={styles.footerHint}>
          Didn't get the email? Check spam or try resending.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ZIPO_COLORS.secondary },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  headerArea: { flexDirection: "row", alignItems: "center" },
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
  subtitle: { fontSize: 14, color: ZIPO_COLORS.grayText, lineHeight: 20 },
  emailHighlight: { fontWeight: "600", color: ZIPO_COLORS.primary },
  bold: { fontWeight: "600" },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 10,
  },
  statusText: { fontSize: 13, color: ZIPO_COLORS.grayText },

  buttonGroup: { marginTop: 40, gap: 12 },
  footerHint: {
    textAlign: "center",
    fontSize: 13,
    color: ZIPO_COLORS.grayText,
  },
});
