// app/verify-otp.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import Button from "@/app/components/Button/Button";

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  lightGray: "#F0F0F0",
  border: "#D0D0D0",
  black: "#000000",
};

const API_BASE = "https://your-api-url.example.com"; // same as in signup

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const first = user[0] || "";
  return `${first}****@${domain}`;
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputs = [
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
    useRef<TextInput | null>(null),
  ];

  const maskedEmail = email ? maskEmail(email) : "";

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);

    if (value && index < inputs.length - 1) {
      inputs[index + 1].current?.focus();
    }
  };

  const handleBackspace = (index: number, value: string) => {
    if (value === "" && index > 0) {
      inputs[index - 1].current?.focus();
    }
  };

  const verifyRequest = async (emailVal: string, code: string) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailVal, code }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Invalid code");
    }
  };

  const onSubmit = async () => {
    const code = digits.join("");
    if (code.length !== 4 || !email) return;

    try {
      setIsSubmitting(true);
      await verifyRequest(email, code);

      router.replace("/"); // hero page later
    } catch (e: any) {
      console.warn("OTP verify error", e.message);
      // TODO show toast / inline error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <FontAwesome name="car" size={18} color="#fff" />
            </View>
            <Text style={styles.logoText}>Zipo</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We have sent a code to {maskedEmail || "your email"}.
            </Text>

            {/* OTP boxes */}
            <View style={styles.otpRow}>
              {digits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={inputs[idx]}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(v) => handleChange(idx, v)}
                  onKeyPress={({ nativeEvent }) =>
                    nativeEvent.key === "Backspace" &&
                    handleBackspace(idx, digit)
                  }
                />
              ))}
            </View>

            <Button
              title="Continue"
              variant="primary"
              onPress={onSubmit}
              isLoading={isSubmitting}
              style={styles.button}
            />

            <Text style={styles.resendText}>
              Didn&apos;t receive the OTP?{" "}
              <Text
                style={styles.resendLink}
                onPress={() => {
                  // TODO: call resend endpoint
                  console.log("Resend OTP");
                }}
              >
                Resend.
              </Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
  },
  button: {
    marginTop: 12,
    borderRadius: 30,
  },
  resendText: {
    marginTop: 18,
    color: "#777",
    fontSize: 13,
  },
  resendLink: {
    color: "#000",
    fontWeight: "600",
  },
});
