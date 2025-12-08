import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/app/components/Button/Button";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function VerifyOTP() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    if (otp.length !== 4) return;

    // TODO: verify OTP with backend
    // await axios.post("https://cloud-function/verifyOtp", { email, otp });

    router.replace("/");
  };

  const handlePressDigit = (digit: string) => {
    if (otp.length < 4) {
      setOtp((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setOtp((prev) => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Enter verification code</Text>

      <Text style={styles.subtitle}>We have sent a code to: {email}</Text>

      {/* OTP Boxes */}
      <View style={styles.otpRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.otpBox}>
            <Text style={styles.otpText}>{otp[i] || ""}</Text>
          </View>
        ))}
      </View>

      <Button
        title="Continue"
        variant="primary"
        onPress={handleVerify}
        style={{ marginVertical: 20 }}
      />

      {/* Custom Numeric Keypad */}
      <View style={styles.keyboard}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.key}
            onPress={() => handlePressDigit(num)}
          >
            <Text style={styles.keyText}>{num}</Text>
          </TouchableOpacity>
        ))}

        {/* Backspace */}
        <TouchableOpacity style={styles.key} onPress={handleBackspace}>
          <Text style={styles.keyText}>⌫</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 10 },
  subtitle: { color: "#555", marginBottom: 20 },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 30,
  },
  otpBox: {
    width: 65,
    height: 65,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  otpText: { fontSize: 28, fontWeight: "600" },

  // Keyboard styling
  keyboard: {
    marginTop: 40,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
  },
  key: {
    width: "28%",
    paddingVertical: 18,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
  },
  keyText: { fontSize: 24, fontWeight: "600" },
});
