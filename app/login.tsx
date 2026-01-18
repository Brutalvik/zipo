// app/login.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Link, Stack, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { signInWithEmailAndPassword } from "firebase/auth";

import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { signIn } from "@/redux/slices/authSlice";

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  lightGray: "#F0F0F0",
  border: "#D0D0D0",
  black: "#000000",
};
const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

if (!API_BASE) {
  throw new Error("EXPO_PUBLIC_API_BASE is not set");
}

function getFriendlyAuthError(error: any): string {
  const code = error?.code ?? "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";

    case "auth/user-not-found":
      return "No account found with this email.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";

    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";

    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";

    case "auth/email-not-verified":
      return "Please verify your email address before logging in.";

    default:
      return "Login failed. Please check your details and try again.";
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert(
          "Verification Required",
          "Please verify your email address to log in."
        );
        return;
      }

      // ✅ Login is successful at this point
      const idToken = await user.getIdToken(true);

      let dbUser: any = null;
      try {
        const res = await fetch(`${API_BASE}/api/auth/session`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        const text = await res.text();
        if (!res.ok) throw new Error(text || "Failed to sync session");

        dbUser = JSON.parse(text).user;
      } catch (e: any) {
        console.warn("DB sync failed (will retry later):", e?.message || e);
        // Optional: show a softer message
        // Alert.alert("Signed in", "Signed in successfully, syncing profile...");
      }

      const userObject: IUser = {
        id: user.uid,
        firebase_uid: dbUser?.firebase_uid ?? user.uid,

        name: user.displayName || dbUser?.full_name || email,
        email: user.email ?? dbUser?.email ?? email,

        photoURL: dbUser?.profile_photo_url ?? user.photoURL ?? null,
        phoneNumber: dbUser?.phone_e164 ?? user.phoneNumber ?? null,

        emailVerified: user.emailVerified,
        phoneVerified: dbUser?.phone_verified ?? false,

        mode: dbUser?.mode === "host" ? "host" : "guest",
      };

      dispatch(signIn(userObject));
      router.replace("/(app)");
    } catch (error: any) {
      console.warn("Login error:", error);
      const friendlyMessage = getFriendlyAuthError(error);
      Alert.alert("Login failed", friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert("Feature", `${provider} Login Coming Soon`);
  };

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
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={ZIPO_COLORS.grayText}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.passwordIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <FontAwesome
                name={showPassword ? "eye" : "eye-slash"}
                size={18}
                color={ZIPO_COLORS.grayText}
              />
            </TouchableOpacity>
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
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgotPassword}>Forgot Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonGroup}>
          <Button
            title="Login"
            onPress={handleLogin}
            variant="primary"
            isLoading={isLoading}
            disabled={isLoading}
          />
          <Button
            title="Sign up"
            onPress={() => router.push("/signup")}
            variant="secondary"
          />

          <Text style={styles.orText}>Or</Text>

          <Button
            title="Login with Apple"
            onPress={() => handleSocialLogin("Apple")}
            variant="social"
            iconName="apple"
          />
          <Button
            title="Login with Google"
            onPress={() => handleSocialLogin("Google")}
            variant="social"
            iconName="google"
          />
        </View>

        <Text style={styles.finalSignupText}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={styles.signupLinkText}>
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
  passwordIcon: { position: "absolute", right: 15, top: 16, zIndex: 10 },
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
