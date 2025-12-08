import React from "react";
import { StyleSheet, View, Text, TextInput } from "react-native";
import { Link, Stack } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "@/app/components/Button/Button";

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  lightGray: "#F0F0F0",
  border: "#D0D0D0",
  black: "#000000",
};

export default function LoginScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.container}>
        <View style={styles.headerArea}>
          <View style={styles.logoContainer}>
            <FontAwesome name="car" size={24} color={ZIPO_COLORS.secondary} />
          </View>

          <Text style={styles.logoText}>Zipo</Text>
        </View>

        <Text style={styles.welcomeTitle}>
          Welcome Back{"\n"}Ready to hit the road.
        </Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Email/Phone Number"
            placeholderTextColor={ZIPO_COLORS.grayText}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={ZIPO_COLORS.grayText}
              secureTextEntry
            />
            <FontAwesome
              name="eye-slash"
              size={18}
              color={ZIPO_COLORS.grayText}
              style={styles.passwordIcon}
            />
          </View>
        </View>

        <View style={styles.checkboxRow}>
          <View style={styles.rememberMe}>
            <FontAwesome
              name="check-square"
              size={20}
              color={ZIPO_COLORS.primary}
            />
            <Text style={styles.textLabel}>Remember Me</Text>
          </View>

          <Text style={styles.forgotPassword}>Forgot Password</Text>
        </View>

        <View style={styles.buttonGroup}>
          <Button title="Login" onPress={() => {}} variant="primary" />
          <Button title="Sign up" onPress={() => {}} variant="secondary" />

          <Text style={styles.orText}>Or</Text>

          <Button
            title="Login with Apple"
            onPress={() => {}}
            variant="social"
            iconName="apple"
          />

          <Button
            title="Login with Google"
            onPress={() => {}}
            variant="social"
            iconName="google"
          />
        </View>

        <Text style={styles.finalSignupText}>
          Don't have an account?
          <Link href="/signup" style={styles.signupLinkText}>
            {" "}
            Sign Up.
          </Link>
        </Text>
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
    justifyContent: "space-between",
  },
  headerArea: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  logoContainer: {
    width: 50,
    height: 30,
    backgroundColor: ZIPO_COLORS.black,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
    color: ZIPO_COLORS.black,
    marginLeft: 10,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: ZIPO_COLORS.black,
    marginTop: 80,
    marginBottom: 30,
    lineHeight: 40,
  },
  inputGroup: { gap: 15, marginBottom: 20 },
  input: {
    backgroundColor: ZIPO_COLORS.lightGray,
    padding: 15,
    paddingRight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    fontSize: 16,
    height: 55,
  },
  passwordContainer: { justifyContent: "center" },
  passwordIcon: { position: "absolute", right: 15 },
  checkboxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  rememberMe: { flexDirection: "row", alignItems: "center", gap: 8 },
  textLabel: { fontSize: 14, color: ZIPO_COLORS.grayText },
  forgotPassword: {
    fontSize: 14,
    color: ZIPO_COLORS.primary,
    fontWeight: "600",
  },
  buttonGroup: { gap: 10, marginBottom: 30 },
  orText: {
    textAlign: "center",
    marginVertical: 15,
    color: ZIPO_COLORS.grayText,
  },
  finalSignupText: { textAlign: "center", color: ZIPO_COLORS.grayText },
  signupLinkText: { color: ZIPO_COLORS.primary, fontWeight: "700" },
});
