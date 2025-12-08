import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
} from "react-native";
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

const COUNTRIES = [
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];

export default function SignupScreen() {
  const router = useRouter();
  const [countryOpen, setCountryOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const {
    setValue,
    handleSubmit,
    watch,
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

  const selectedCountry = watch("country");

  const onSubmit = async (data: any) => {
    console.log("Sign up data:", data);

    // TODO: call backend /register to create user + send OTP
    router.push({
      pathname: "/verify-otp",
      params: { email: data.email },
    });
  };

  const openDropdown = () => {
    setCountryOpen(true);
    Animated.timing(dropdownAnim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setCountryOpen(false);
    });
  };

  const toggleDropdown = () => {
    countryOpen ? closeDropdown() : openDropdown();
  };

  const handleSelectCountry = (countryName: string) => {
    setValue("country", countryName, { shouldValidate: true });
    closeDropdown();
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

          {/* Country dropdown */}
          <View style={styles.countryWrapper}>
            <TouchableOpacity
              style={styles.countrySelector}
              activeOpacity={0.8}
              onPress={toggleDropdown}
            >
              <Text
                style={[
                  styles.countryText,
                  !selectedCountry && { color: ZIPO_COLORS.grayText },
                ]}
              >
                {selectedCountry || "Country"}
              </Text>
              <FontAwesome
                name={countryOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={ZIPO_COLORS.grayText}
              />
            </TouchableOpacity>

            {countryOpen && (
              <Animated.View
                style={[
                  styles.dropdown,
                  {
                    opacity: dropdownAnim,
                    transform: [
                      {
                        translateY: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-5, 0],
                        }),
                      },
                      {
                        scaleY: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {COUNTRIES.map((country) => (
                  <Pressable
                    key={country.code}
                    onPress={() => handleSelectCountry(country.name)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      selectedCountry === country.name &&
                        styles.dropdownItemSelected,
                      pressed && styles.dropdownItemPressed,
                    ]}
                  >
                    <Text style={styles.flag}>{country.flag}</Text>
                    <Text
                      style={[
                        styles.dropdownLabel,
                        selectedCountry === country.name && {
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {country.name}
                    </Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </View>
          {errors.country && (
            <Text style={styles.errorText}>{errors.country.message}</Text>
          )}
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
            Login.
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
  },
  passwordInput: {
    paddingRight: 40,
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

  // Country dropdown styles
  countryWrapper: {
    marginTop: 2,
    position: "relative",
    zIndex: 10, // keep it above other content
  },
  countrySelector: {
    backgroundColor: ZIPO_COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countryText: {
    fontSize: 15,
    color: ZIPO_COLORS.black,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemPressed: {
    backgroundColor: "#F2F2F2",
  },
  dropdownItemSelected: {
    backgroundColor: "#F7F7F7",
  },
  flag: {
    fontSize: 18,
    marginRight: 10,
  },
  dropdownLabel: {
    fontSize: 15,
    color: ZIPO_COLORS.black,
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
