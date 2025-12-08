// app/signup.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import Button from "@/components/Button/Button";

import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";

// --- Firebase ---
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/services/firebase";

const ZIPO_COLORS = {
  primary: "#1E1E1E",
  secondary: "#FFFFFF",
  grayText: "#5C5C5C",
  lightGray: "#F0F0F0",
  border: "#D0D0D0",
  black: "#000000",
};

// Country list
const COUNTRIES = [
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
];

// --------- Validation Schema ----------
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;

const SignupSchema = Yup.object({
  fullName: Yup.string().required("Full Name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string()
    .matches(
      passwordRegex,
      "Min 8 chars, 1 upper, 1 lower, 1 number, 1 special"
    )
    .required("Password is required"),
  country: Yup.string().required("Country is required"), // 👈 REQUIRED
  terms: Yup.boolean()
    .oneOf([true], "You must agree to the terms and conditions")
    .required(), // 👈 fixes TS type mismatch
});

// 🔥 Infer correct TypeScript type from Yup schema
type SignupFormValues = Yup.InferType<typeof SignupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const [countryOpen, setCountryOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const [showPassword, setShowPassword] = useState(false);

  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: yupResolver(SignupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      country: "",
      terms: false,
    },
  });

  const selectedCountry = watch("country");
  const termsAccepted = watch("terms");

  // --- dropdown animation ---
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

  // --- Firebase Signup Handler ---
  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    try {
      // 1️⃣ Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2️⃣ Save full name
      await updateProfile(user, {
        displayName: data.fullName,
      });

      // 3️⃣ Send verification email
      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.warn("Email verification failed", err);
      }

      // 4️⃣ Redirect → verify page
      router.push({
        pathname: "/verify-email",
        params: { email: data.email, country: data.country },
      });
    } catch (e: any) {
      console.warn("Signup error", e);

      if (e?.code === "auth/email-already-in-use") {
        Alert.alert(
          "Email already registered",
          "There is already an account using this email. Please log in instead or use a different email."
        );
      } else {
        Alert.alert(
          "Signup failed",
          "We couldn't create your account right now. Please try again."
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.logoContainer}>
            <FontAwesome name="car" size={18} color={ZIPO_COLORS.secondary} />
          </View>
          <Text style={styles.logoText}>Zipo</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Sign Up</Text>

        {/* Inputs */}
        <View style={styles.inputGroup}>
          {/* Full Name */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor={ZIPO_COLORS.grayText}
            onChangeText={(text) =>
              setValue("fullName", text, { shouldValidate: true })
            }
          />
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName.message}</Text>
          )}

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor={ZIPO_COLORS.grayText}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(text) =>
              setValue("email", text, { shouldValidate: true })
            }
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          )}

          {/* Password */}
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor={ZIPO_COLORS.grayText}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onChangeText={(text) =>
                setValue("password", text, { shouldValidate: true })
              }
            />
            <TouchableOpacity
              style={styles.passwordIcon}
              onPress={() => setShowPassword((p) => !p)}
            >
              <FontAwesome
                name={showPassword ? "eye" : "eye-slash"}
                size={18}
                color={ZIPO_COLORS.grayText}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}

          {/* Country Dropdown */}
          <View style={styles.countryWrapper}>
            <TouchableOpacity
              style={styles.countrySelector}
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

          {/* Terms */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() =>
                setValue("terms", !termsAccepted, { shouldValidate: true })
              }
              style={styles.checkboxWrapper}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked,
                ]}
              >
                {termsAccepted && (
                  <FontAwesome name="check" size={12} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text style={styles.termsLink}>terms and conditions</Text>
            </Text>
          </View>
          {errors.terms && (
            <Text style={styles.errorText}>{errors.terms.message}</Text>
          )}
        </View>

        {/* Submit */}
        <Button
          title="Sign up"
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          style={styles.primaryButton}
        />

        {/* Login link */}
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

        {/* Social */}
        <Button
          title="Sign up with Google"
          variant="social"
          iconName="google"
        />

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

// ---------------------- styles ----------------------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ZIPO_COLORS.secondary },
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
  inputGroup: { marginBottom: 16 },
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
  passwordWrapper: { position: "relative" },
  passwordInput: { paddingRight: 40 },
  passwordIcon: { position: "absolute", right: 16, top: 16 },
  errorText: { color: "red", fontSize: 12, marginBottom: 6 },

  // Country
  countryWrapper: { marginTop: 2, position: "relative", zIndex: 10 },
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
  countryText: { fontSize: 15, color: ZIPO_COLORS.black },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemPressed: { backgroundColor: "#F2F2F2" },
  dropdownItemSelected: { backgroundColor: "#F7F7F7" },
  flag: { fontSize: 18, marginRight: 10 },
  dropdownLabel: { fontSize: 15, color: ZIPO_COLORS.black },

  // Terms
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  checkboxWrapper: { marginRight: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: ZIPO_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: ZIPO_COLORS.primary,
    borderColor: ZIPO_COLORS.primary,
  },
  termsText: { flex: 1, fontSize: 13, color: ZIPO_COLORS.grayText },
  termsLink: { color: ZIPO_COLORS.primary, fontWeight: "600" },

  primaryButton: { marginTop: 8, borderRadius: 30 },
  secondaryButton: { marginTop: 10, borderRadius: 30 },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  divider: { flex: 1, height: 1, backgroundColor: "#E1E1E1" },
  orText: { marginHorizontal: 10, color: ZIPO_COLORS.grayText, fontSize: 13 },

  footerText: {
    textAlign: "center",
    marginTop: 18,
    color: ZIPO_COLORS.grayText,
    fontSize: 13,
  },
  footerLink: { fontWeight: "700", color: ZIPO_COLORS.black },
});
