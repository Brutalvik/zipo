// app/verify-phone.tsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import Button from "@/app/components/Button/Button";
import { auth } from "@/app/services/firebase";
import { db } from "@/app/services/firebase";
import { doc, setDoc } from "firebase/firestore";

const ZIPO_COLORS = {
  primary: "#111827",
  secondary: "#F9FAFB",
  grayText: "#6B7280",
  lightGray: "#E5E7EB",
  border: "#D1D5DB",
  black: "#000000",
  accent: "#111827",
  accentSoft: "#F3F4F6",
};

// same list as signup
const COUNTRIES = [
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dialCode: "+60" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65" },
];

type Country = (typeof COUNTRIES)[number];

function normalizeLocalNumber(local: string, country: Country): string {
  // keep only digits
  let digits = local.replace(/\D/g, "");

  // common rule: if starts with 0, drop it when adding country code
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

function formatInternationalDisplay(
  localDigits: string,
  dialCode: string
): { e164: string; display: string } {
  // E.164 (no dashes)
  const e164 = `${dialCode}${localDigits}`;

  // Pretty display: +cc-XXX-XXX-XXX-XXXX style
  const groups: string[] = [];
  const n = localDigits.length;

  if (n > 7) {
    const lastGroupLen = 4;
    let remaining = n - lastGroupLen;
    let idx = 0;

    while (remaining > 0) {
      const take = Math.min(3, remaining);
      groups.push(localDigits.slice(idx, idx + take));
      idx += take;
      remaining -= take;
    }
    groups.push(localDigits.slice(n - lastGroupLen));
  } else {
    // just chunk in 3s
    for (let i = 0; i < n; i += 3) {
      groups.push(localDigits.slice(i, i + 3));
    }
  }

  const display = `${dialCode}-${groups.join("-")}`;
  return { e164, display };
}

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES[1] // default Indonesia or pick your default
  );
  const [rawPhone, setRawPhone] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const [isSaving, setIsSaving] = useState(false);

  const openDropdown = () => {
    setDropdownOpen(true);
    Animated.timing(dropdownAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 130,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDropdownOpen(false);
    });
  };

  const toggleDropdown = () => {
    dropdownOpen ? closeDropdown() : openDropdown();
  };

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    closeDropdown();
  };

  const saveProfile = async (opts: {
    phoneNumber: string;
    isPhoneVerified: boolean;
  }) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(
        "Not signed in",
        "We couldn't find a logged-in user. Please sign in again."
      );
      router.replace("/login");
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          phoneNumber: opts.phoneNumber,
          isPhoneVerified: opts.isPhoneVerified,
        },
        { merge: true }
      );

      // proceed to main app
      router.replace("/(tabs)");
    } catch (error) {
      console.warn("Failed to save phone profile", error);
      Alert.alert(
        "Error",
        "We couldn't save your phone details. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinueVerified = async () => {
    const localDigits = normalizeLocalNumber(rawPhone, selectedCountry);
    if (!localDigits || localDigits.length < 7) {
      Alert.alert(
        "Invalid number",
        "Please enter a valid phone number with enough digits."
      );
      return;
    }

    const { e164, display } = formatInternationalDisplay(
      localDigits,
      selectedCountry.dialCode
    );

    // For now we treat this as "verified" – later we can wire real SMS OTP.
    await saveProfile({
      phoneNumber: e164, // backend value
      isPhoneVerified: true,
    });

    console.log("Saved phone:", e164, display);
  };

  const handleSkipForNow = async () => {
    await saveProfile({
      phoneNumber: "",
      isPhoneVerified: false,
    });
  };

  const localDigits = normalizeLocalNumber(rawPhone, selectedCountry);
  const preview =
    localDigits.length > 0
      ? formatInternationalDisplay(localDigits, selectedCountry.dialCode)
          .display
      : "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            <FontAwesome name="car" size={18} color={ZIPO_COLORS.secondary} />
          </View>
          <Text style={styles.logoText}>Zipo</Text>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.title}>Verify your phone number</Text>
          <Text style={styles.subtitle}>
            Add your mobile number so we can keep your trips secure and share
            important updates.
          </Text>

          {/* Country selector */}
          <View style={styles.countryWrapper}>
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={toggleDropdown}
              activeOpacity={0.9}
            >
              <View style={styles.countryLeft}>
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryName}>{selectedCountry.name}</Text>
              </View>
              <View style={styles.countryRight}>
                <Text style={styles.countryDial}>
                  {selectedCountry.dialCode}
                </Text>
                <FontAwesome
                  name={dropdownOpen ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={ZIPO_COLORS.grayText}
                />
              </View>
            </TouchableOpacity>

            {dropdownOpen && (
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
                    ],
                  },
                ]}
              >
                {COUNTRIES.map((country) => (
                  <Pressable
                    key={country.code}
                    onPress={() => handleSelectCountry(country)}
                    style={({ pressed }) => [
                      styles.dropdownItem,
                      pressed && styles.dropdownPressed,
                      selectedCountry.code === country.code &&
                        styles.dropdownSelected,
                    ]}
                  >
                    <Text style={styles.flag}>{country.flag}</Text>
                    <Text style={styles.dropdownLabel}>{country.name}</Text>
                    <Text style={styles.dropdownDial}>{country.dialCode}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </View>

          {/* Phone input */}
          <View style={styles.phoneWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor={ZIPO_COLORS.grayText}
              keyboardType="phone-pad"
              value={rawPhone}
              onChangeText={setRawPhone}
            />
            {preview ? (
              <Text style={styles.previewText}>We’ll save it as {preview}</Text>
            ) : (
              <Text style={styles.previewText}>
                Example for Indonesia: 0813 205 8699 → +62-813-205-8699
              </Text>
            )}
          </View>

          {/* Primary + Skip */}
          <View style={styles.buttonGroup}>
            <Button
              title="Continue"
              variant="primary"
              onPress={handleContinueVerified}
              isLoading={isSaving}
            />
            <TouchableOpacity
              onPress={handleSkipForNow}
              disabled={isSaving}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer hint */}
        <Text style={styles.footerHint}>
          You can always verify or update your phone number later in your
          profile. For security, we may remind you again if it’s not verified.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  headerRow: {
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
    fontWeight: "700",
    marginLeft: 10,
    color: ZIPO_COLORS.black,
  },
  content: {
    marginTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: ZIPO_COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: ZIPO_COLORS.grayText,
    marginBottom: 24,
  },
  countryWrapper: {
    marginBottom: 16,
    position: "relative",
    zIndex: 10,
  },
  countrySelector: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countryLeft: { flexDirection: "row", alignItems: "center" },
  countryRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  flag: { fontSize: 18, marginRight: 8 },
  countryName: { fontSize: 14, color: ZIPO_COLORS.primary },
  countryDial: { fontSize: 14, color: ZIPO_COLORS.grayText },
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownPressed: { backgroundColor: "#F3F4F6" },
  dropdownSelected: { backgroundColor: "#E5E7EB" },
  dropdownLabel: {
    fontSize: 14,
    color: ZIPO_COLORS.primary,
    flex: 1,
  },
  dropdownDial: {
    fontSize: 13,
    color: ZIPO_COLORS.grayText,
  },
  phoneWrapper: { marginTop: 8, marginBottom: 24 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  previewText: {
    marginTop: 6,
    fontSize: 12,
    color: ZIPO_COLORS.grayText,
  },
  buttonGroup: { gap: 8 },
  skipBtn: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 13,
    color: ZIPO_COLORS.grayText,
    textDecorationLine: "underline",
  },
  footerHint: {
    fontSize: 12,
    color: ZIPO_COLORS.grayText,
    textAlign: "center",
  },
});
