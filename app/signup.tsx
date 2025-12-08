import React from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import Button from "@/app/components/Button/Button";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

// --------- Validation schema ----------
const SignupSchema = Yup.object({
  fullName: Yup.string().required("Full Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  country: Yup.string().optional(),
});

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  lightGray: "#F0F0F0",
  border: "#D0D0D0",
  black: "#000000",
};

export default function SignupScreen() {
  const router = useRouter();

  const {
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(SignupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      country: "",
    },
  });

  const onSubmit = async (data: any) => {
    console.log("Sign up data:", data);

    // TODO: call backend /register to create user + send OTP
    router.push({
      pathname: "/verify-otp",
      params: { email: data.email },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (same structure as login) */}
        <View style={styles.headerArea}>
          <View style={styles.logoContainer}>
            <FontAwesome name="car" size={18} color={ZIPO_COLORS.secondary} />
          </View>
          <Text style={styles.logoText}>Zipo</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Sign Up</Text>

        {/* Inputs section */}
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={ZIPO_COLORS.grayText}
            onChangeText={(text) => setValue("fullName", text)}
          />
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName.message}</Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={ZIPO_COLORS.grayText}
            keyboardType="email-address"
            onChangeText={(text) => setValue("email", text)}
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          )}

          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor={ZIPO_COLORS.grayText}
              secureTextEntry
              onChangeText={(text) => setValue("password", text)}
            />
            <FontAwesome
              name="eye-slash"
              size={18}
              color={ZIPO_COLORS.grayText}
              style={styles.passwordIcon}
            />
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Country"
            placeholderTextColor={ZIPO_COLORS.grayText}
            onChangeText={(text) => setValue("country", text)}
          />
        </View>

        {/* Primary Sign up button (rounded, same as login) */}
        <Button
          title="Sign up"
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          style={styles.primaryButton}
        />

        {/* Outline Login button (rounded) */}
        <Button
          title="Login"
          variant="secondary"
          onPress={() => router.push("/login")}
          style={styles.secondaryButton}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.orText}>Or</Text>
          <View style={styles.divider} />
        </View>

        {/* Social buttons – centered icon + text, same width */}
        <Button
          title="Sign up with Apple"
          variant="social"
          iconName="apple"
          onPress={() => {}}
        />

        <View style={{ height: 10 }} />

        <Button
          title="Sign up with Google"
          variant="social"
          iconName="google"
          onPress={() => {}}
        />

        {/* Footer */}
        <Text style={styles.footerText}>
          Already have an account?
          <Text style={styles.footerLink} onPress={() => router.push("/login")}>
            {" "}
            Sign Up.
          </Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ZIPO_COLORS.secondary,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },

  headerArea: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
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
    fontSize: 28,
    fontWeight: "700",
    color: ZIPO_COLORS.black,
    marginBottom: 24,
    textAlign: "center",
  },

  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: ZIPO_COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    fontSize: 15,
    marginBottom: 10,
  },
  passwordWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  passwordInput: {
    paddingRight: 40,
    marginBottom: 0,
  },
  passwordIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginBottom: 6,
  },

  primaryButton: {
    marginTop: 8,
    borderRadius: 30,
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 30,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E1E1E1",
  },
  orText: {
    marginHorizontal: 10,
    color: ZIPO_COLORS.grayText,
    fontSize: 13,
  },

  footerText: {
    textAlign: "center",
    marginTop: 18,
    color: ZIPO_COLORS.grayText,
    fontSize: 13,
  },
  footerLink: {
    fontWeight: "700",
    color: ZIPO_COLORS.black,
  },
});
