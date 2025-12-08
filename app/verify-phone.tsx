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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import Button from "@/components/Button/Button";

import { auth } from "@/services/firebase";
import { PhoneAuthProvider, linkWithCredential } from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import Constants from "expo-constants";

const ZIPO_COLORS = {
  primary: "#111827",
  secondary: "#F9FAFB",
  grayText: "#6B7280",
  lightGray: "#E5E7EB",
  border: "#D1D5DB",
  black: "#000000",
  accent: "#111827",
};

const CODE_LENGTH = 6;

// same list as signup + dial codes
const COUNTRIES = [
  { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dialCode: "+60" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65" },
];

type Country = (typeof COUNTRIES)[number];

function normalizeLocalNumber(local: string): string {
  let digits = local.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function formatInternationalDisplay(
  localDigits: string,
  dialCode: string
): { e164: string; display: string } {
  const e164 = `${dialCode}${localDigits}`;

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
    for (let i = 0; i < n; i += 3) {
      groups.push(localDigits.slice(i, i + 3));
    }
  }

  const display = `${dialCode}-${groups.join("-")}`;
  return { e164, display };
}

// Simple mask: +62******99
function maskPhone(dialCode: string, localDigits: string): string {
  if (!localDigits) return dialCode;
  const last2 = localDigits.slice(-2);
  return `${dialCode}******${last2}`;
}

export default function VerifyPhoneScreen() {
  const router = useRouter();

  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[1]); // default ID
  const [rawPhone, setRawPhone] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sentToMasked, setSentToMasked] = useState<string | null>(null);

  // recaptcha for phone auth
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);
  const firebaseConfig = Constants.expoConfig?.extra?.firebaseConfig;

  // hidden input ref for OTP
  const codeInputRef = useRef<TextInput | null>(null);

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

  const handleSendCode = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(
        "Not signed in",
        "We couldn't find a logged-in user. Please sign in again."
      );
      router.replace("/login");
      return;
    }

    const localDigits = normalizeLocalNumber(rawPhone);
    if (!localDigits || localDigits.length < 7) {
      Alert.alert(
        "Invalid number",
        "Please enter a valid phone number with enough digits."
      );
      return;
    }

    const { e164 } = formatInternationalDisplay(
      localDigits,
      selectedCountry.dialCode
    );

    const masked = maskPhone(selectedCountry.dialCode, localDigits);
    setSentToMasked(masked);

    try {
      setIsSending(true);

      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(
        e164,
        // @ts-ignore – recaptchaVerifier type not perfect in TS
        recaptchaVerifier.current
      );

      setVerificationId(id);
      setStep("code");
      setVerificationCode("");

      Alert.alert(
        "Code sent",
        `We’ve sent an SMS with a 6-digit code to ${masked}.`
      );
    } catch (error: any) {
      console.warn("Phone verify send error:", error);
      Alert.alert(
        "Error",
        error?.message || "We couldn't send the SMS. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleChangeCode = (text: string) => {
    const digitsOnly = text.replace(/\D/g, "");
    setVerificationCode(digitsOnly.slice(0, CODE_LENGTH));
  };

  const handleVerifyCode = async () => {
    const user = auth.currentUser;
    if (!user || !verificationId) {
      Alert.alert(
        "Missing info",
        "We’re missing the verification details. Please try again."
      );
      return;
    }

    if (!verificationCode || verificationCode.length !== CODE_LENGTH) {
      Alert.alert(
        "Invalid code",
        `Please enter the ${CODE_LENGTH}-digit code from the SMS.`
      );
      return;
    }

    try {
      setIsVerifying(true);

      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );

      // link phone to existing email user
      await linkWithCredential(user, credential);

      Alert.alert("Phone verified", "Your phone number has been verified.");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.warn("Phone verify confirm error:", error);
      Alert.alert(
        "Verification failed",
        error?.message || "The code was invalid or expired. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkipForNow = () => {
    // User can skip; AuthGuard can still re-check phone later if you want
    router.replace("/(tabs)");
  };

  const localDigits = normalizeLocalNumber(rawPhone);
  const preview =
    localDigits.length > 0
      ? formatInternationalDisplay(localDigits, selectedCountry.dialCode)
          .display
      : "";

  // For code UI: pad to length 6 so we always have slots
  const codeChars = verificationCode
    .padEnd(CODE_LENGTH, " ")
    .split("")
    .slice(0, CODE_LENGTH);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Recaptcha modal for phone auth */}
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.logoContainer}>
                  <FontAwesome
                    name="car"
                    size={18}
                    color={ZIPO_COLORS.secondary}
                  />
                </View>
                <Text style={styles.logoText}>Zipo</Text>
              </View>

              {/* Content */}
              <View style={styles.content}>
                {step === "phone" && (
                  <>
                    <Text style={styles.title}>Verify your phone number</Text>
                    <Text style={styles.subtitle}>
                      We’ll use your phone to keep your bookings secure and
                      share important updates.
                    </Text>

                    {/* Country selector */}
                    <View style={styles.countryWrapper}>
                      <TouchableOpacity
                        style={styles.countrySelector}
                        onPress={toggleDropdown}
                        activeOpacity={0.9}
                      >
                        <View style={styles.countryLeft}>
                          <Text style={styles.flag}>
                            {selectedCountry.flag}
                          </Text>
                          <Text style={styles.countryName}>
                            {selectedCountry.name}
                          </Text>
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
                              <Text style={styles.dropdownLabel}>
                                {country.name}
                              </Text>
                              <Text style={styles.dropdownDial}>
                                {country.dialCode}
                              </Text>
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
                        returnKeyType="done"
                      />
                      {preview ? (
                        <Text style={styles.previewText}>
                          We’ll verify {preview}
                        </Text>
                      ) : (
                        <Text style={styles.previewText}>
                          Example (ID): 0813 205 8699 → +62-813-205-8699
                        </Text>
                      )}
                    </View>

                    <View style={styles.buttonGroup}>
                      <Button
                        title="Continue"
                        variant="primary"
                        onPress={handleSendCode}
                        isLoading={isSending}
                      />
                      <TouchableOpacity
                        onPress={handleSkipForNow}
                        disabled={isSending}
                        style={styles.skipBtn}
                      >
                        <Text style={styles.skipText}>Skip for now</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {step === "code" && (
                  <>
                    <Text style={styles.title}>Enter verification code</Text>
                    <Text style={styles.subtitleCenter}>
                      We have sent a code to:{" "}
                      <Text style={styles.boldText}>
                        {sentToMasked || "your phone"}
                      </Text>
                    </Text>

                    {/* 6-digit code boxes */}
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => codeInputRef.current?.focus()}
                      style={styles.codeBoxesWrapper}
                    >
                      <View style={styles.codeBoxesRow}>
                        {codeChars.map((char, idx) => {
                          const isActive = idx === verificationCode.length;
                          const showChar =
                            char.trim().length > 0 && /\d/.test(char)
                              ? char
                              : "";
                          return (
                            <View
                              key={idx}
                              style={[
                                styles.codeBox,
                                isActive && styles.codeBoxActive,
                              ]}
                            >
                              <Text style={styles.codeBoxText}>{showChar}</Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Hidden input that actually captures the code */}
                      <TextInput
                        ref={codeInputRef}
                        style={styles.hiddenInput}
                        keyboardType="number-pad"
                        value={verificationCode}
                        onChangeText={handleChangeCode}
                        maxLength={CODE_LENGTH}
                        autoFocus
                      />
                    </TouchableOpacity>

                    <View style={styles.buttonGroup}>
                      <Button
                        title="Continue"
                        variant="primary"
                        onPress={handleVerifyCode}
                        isLoading={isVerifying}
                      />
                      <TouchableOpacity
                        onPress={handleSendCode}
                        disabled={isSending || isVerifying}
                        style={styles.resendBtn}
                      >
                        <Text style={styles.resendText}>
                          Didn’t receive the OTP?{" "}
                          <Text style={styles.boldText}>Resend.</Text>
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <Text style={styles.footerHint}>
                Once your phone is verified you won’t be asked again on this
                account.
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    flexGrow: 1,
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
  subtitleCenter: {
    fontSize: 14,
    color: ZIPO_COLORS.grayText,
    marginBottom: 24,
    textAlign: "center",
  },
  boldText: {
    fontWeight: "600",
    color: ZIPO_COLORS.primary,
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
  dropdownLabel: { fontSize: 14, color: ZIPO_COLORS.primary, flex: 1 },
  dropdownDial: { fontSize: 13, color: ZIPO_COLORS.grayText },
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
  buttonGroup: { marginTop: 16, gap: 8 },
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
  codeBoxesWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  codeBoxesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 16,
  },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  codeBoxActive: {
    borderColor: ZIPO_COLORS.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  codeBoxText: {
    fontSize: 20,
    fontWeight: "600",
    color: ZIPO_COLORS.primary,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  resendBtn: {
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  resendText: {
    fontSize: 13,
    color: ZIPO_COLORS.grayText,
    textAlign: "center",
  },
});
