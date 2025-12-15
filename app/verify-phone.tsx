// app/verify-phone.tsx
import React, { useEffect, useRef, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";
import {
  PhoneAuthProvider,
  linkWithCredential,
  updatePhoneNumber,
} from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import Constants from "expo-constants";

import {
  setPhoneRemindLater,
  getRemindAfterMs,
  phoneSkipSession,
  phoneVerifyFailed,
  phoneVerifySuccess,
} from "@/lib/phoneGate";

// ✅ Redux update (so Profile updates immediately after syncing)
import { useAppDispatch } from "@/redux/hooks";
import { updateUser } from "@/redux/slices/authSlice";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
if (!API_BASE) {
  throw new Error("EXPO_PUBLIC_API_BASE is not set");
}

const ZIPO_COLORS = {
  primary: "#111827",
  secondary: "#F9FAFB",
  grayText: "#6B7280",
  border: "#D1D5DB",
  black: "#000000",
  accent: "#111827",
};

const CODE_LENGTH = 6;

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

function formatInternationalDisplay(localDigits: string, dialCode: string) {
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
    for (let i = 0; i < n; i += 3) groups.push(localDigits.slice(i, i + 3));
  }

  return { e164, display: `${dialCode}-${groups.join("-")}` };
}

function maskPhone(dialCode: string, localDigits: string) {
  if (!localDigits) return dialCode;
  const last2 = localDigits.slice(-2);
  return `${dialCode}******${last2}`;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const params = useLocalSearchParams<{ next?: string; from?: string }>();
  const nextRoute = params?.next ? String(params.next) : "/(tabs)/profile";
  const from = params?.from ? String(params.from) : "unknown";

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

  const [cooldownMs, setCooldownMs] = useState(0);

  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);
  const firebaseConfig = Constants.expoConfig?.extra?.firebaseConfig;

  const codeInputRef = useRef<TextInput | null>(null);

  // -----------------------------------------
  // ✅ Helper: backend sync (Firebase token -> DB)
  // -----------------------------------------
  const syncPhoneFromFirebaseToDb = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error("Not signed in");

    await current.reload();

    const idToken = await current.getIdToken(true);
    if (!idToken) throw new Error("Missing auth token");

    // ✅ Firebase truth:
    const phone = current.phoneNumber; // string | null
    const phoneVerified = !!phone;

    if (!phone) {
      // nothing to sync
      return;
    }

    const res = await fetch(`${API_BASE}/api/users/phone`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_e164: phone, // already E.164
        phone_verified: phoneVerified,
      }),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || "Failed to sync phone");

    const json = JSON.parse(text);
    if (json?.user) dispatch(updateUser(json.user));
  };

  // -----------------------------------------
  // ✅ On screen entry: if Firebase already has phoneNumber -> sync + leave
  // -----------------------------------------
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;

      // Ensure auth is fresh
      try {
        await user.reload();
      } catch {
        // ignore
      }

      // Firebase sets currentUser.phoneNumber when phone is linked/verified
      if (user.phoneNumber) {
        try {
          await syncPhoneFromFirebaseToDb();
          Alert.alert("Phone verified", "Your phone is already verified.");
        } catch (e: any) {
          console.warn("phone sync on enter failed", e?.message || e);
          // Even if sync fails, still exit verify screen (optional)
          Alert.alert(
            "Phone verified",
            "Your phone is verified, but we couldn’t sync it to the server yet."
          );
        } finally {
          // Go back to profile / next route
          router.replace(nextRoute);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------
  // Reminder cooldown ticker
  // -----------------------------------------
  useEffect(() => {
    let t: any;

    (async () => {
      const ms = await getRemindAfterMs();
      setCooldownMs(ms);
    })();

    t = setInterval(async () => {
      const ms = await getRemindAfterMs();
      setCooldownMs(ms);
    }, 1000);

    return () => clearInterval(t);
  }, []);

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
    }).start(({ finished }) => finished && setDropdownOpen(false));
  };
  const toggleDropdown = () =>
    dropdownOpen ? closeDropdown() : openDropdown();

  // -----------------------------------------
  // Send OTP
  // -----------------------------------------
  const handleSendCode = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not signed in", "Please sign in again.");
      router.replace("/login");
      return;
    }

    // If user already has phoneNumber (verified), don’t allow sending OTP again
    if (user.phoneNumber) {
      try {
        await syncPhoneFromFirebaseToDb();
      } catch {}
      Alert.alert("Phone verified", "Your phone is already verified.");
      router.replace(nextRoute);
      return;
    }

    const localDigits = normalizeLocalNumber(rawPhone);
    if (!localDigits || localDigits.length < 7) {
      Alert.alert("Invalid number", "Please enter a valid phone number.");
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
        // @ts-ignore
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
      Alert.alert("Error", error?.message || "We couldn't send the SMS.");
    } finally {
      setIsSending(false);
    }
  };

  // -----------------------------------------
  // Confirm OTP
  // -----------------------------------------
  const handleVerifyCode = async () => {
    const user = auth.currentUser;
    if (!user || !verificationId) {
      Alert.alert("Missing info", "Please try again.");
      return;
    }

    if (!verificationCode || verificationCode.length !== CODE_LENGTH) {
      Alert.alert(
        "Invalid code",
        `Please enter the ${CODE_LENGTH}-digit code.`
      );
      return;
    }

    try {
      setIsVerifying(true);

      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );

      // ✅ Fix: if phone provider already linked, update instead of link
      const hasPhoneProvider = (user.providerData ?? []).some(
        (p: any) => p?.providerId === "phone"
      );

      if (hasPhoneProvider) {
        await updatePhoneNumber(user, credential);
      } else {
        await linkWithCredential(user, credential);
      }

      await user.reload(); // refresh user.phoneNumber
      await phoneVerifySuccess();

      // ✅ sync Firebase -> DB so profile updates
      try {
        await syncPhoneFromFirebaseToDb();
      } catch (e: any) {
        console.warn("sync after verify failed", e?.message || e);
      }

      Alert.alert("Phone verified", "Your phone number has been verified.");
      router.replace(nextRoute);
    } catch (error: any) {
      await phoneVerifyFailed(error?.message);
      console.warn("Phone verify confirm error:", error);

      // Optional nicer message
      const msg =
        error?.code === "auth/provider-already-linked"
          ? "This account already has a phone linked."
          : error?.message || "The code was invalid or expired.";

      Alert.alert("Verification failed", msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkipForNow = async () => {
    await phoneSkipSession(from);
    router.replace(nextRoute);
  };

  const handleRemindLater = async () => {
    await setPhoneRemindLater(30);
    router.replace(nextRoute);
  };

  const handleChangeCode = (text: string) => {
    const digitsOnly = text.replace(/\D/g, "");
    setVerificationCode(digitsOnly.slice(0, CODE_LENGTH));
  };

  const localDigits = normalizeLocalNumber(rawPhone);
  const preview =
    localDigits.length > 0
      ? formatInternationalDisplay(localDigits, selectedCountry.dialCode)
          .display
      : "";

  const codeChars = verificationCode
    .padEnd(CODE_LENGTH, " ")
    .split("")
    .slice(0, CODE_LENGTH);

  const remindActive = cooldownMs > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
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

              <View style={styles.content}>
                {step === "phone" && (
                  <>
                    <Text style={styles.title}>Verify your phone number</Text>
                    <Text style={styles.subtitle}>
                      We’ll use your phone to keep bookings secure and share
                      important updates.
                    </Text>

                    {cooldownMs > 0 && (
                      <View style={styles.cooldownPill}>
                        <Text style={styles.cooldownText}>
                          Reminder active — we’ll ask again in{" "}
                          {formatCountdown(cooldownMs)}
                        </Text>
                      </View>
                    )}

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
                              onPress={() => {
                                setSelectedCountry(country);
                                closeDropdown();
                              }}
                              style={({ pressed }) => [
                                styles.dropdownItem,
                                pressed && styles.dropdownPressed,
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
                      <Text style={styles.previewText}>
                        {preview
                          ? `We’ll verify ${preview}`
                          : "Enter your phone number to receive an SMS code."}
                      </Text>
                    </View>

                    <View style={styles.buttonGroup}>
                      <Button
                        title="Continue"
                        variant="primary"
                        onPress={handleSendCode}
                        isLoading={isSending}
                      />

                      {/* ✅ Remove remind later if reminder is active */}
                      {!remindActive ? (
                        <TouchableOpacity
                          onPress={handleRemindLater}
                          disabled={isSending}
                          style={styles.skipBtn}
                        >
                          <Text style={styles.skipText}>
                            Remind me later (30 min)
                          </Text>
                        </TouchableOpacity>
                      ) : null}

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

                      {/* ✅ Remove remind later if reminder is active */}
                      {!remindActive ? (
                        <TouchableOpacity
                          onPress={handleRemindLater}
                          disabled={isSending || isVerifying}
                          style={styles.skipBtn}
                        >
                          <Text style={styles.skipText}>
                            Remind me later (30 min)
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        onPress={handleSkipForNow}
                        disabled={isSending || isVerifying}
                        style={styles.skipBtn}
                      >
                        <Text style={styles.skipText}>Skip for now</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <Text style={styles.footerHint}>
                You can verify later, but you may be asked again before booking
                if not verified.
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F3F4F6" },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: "space-between",
  },

  headerRow: { flexDirection: "row", alignItems: "center" },
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

  content: { marginTop: 28 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: ZIPO_COLORS.primary,
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: ZIPO_COLORS.grayText, marginBottom: 14 },
  subtitleCenter: {
    fontSize: 14,
    color: ZIPO_COLORS.grayText,
    marginBottom: 24,
    textAlign: "center",
  },
  boldText: { fontWeight: "600", color: ZIPO_COLORS.primary },

  cooldownPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  cooldownText: { color: "#111827", fontSize: 13, fontWeight: "500" },

  countryWrapper: { marginBottom: 16, position: "relative", zIndex: 10 },
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
  dropdownLabel: { fontSize: 14, color: ZIPO_COLORS.primary, flex: 1 },
  dropdownDial: { fontSize: 13, color: ZIPO_COLORS.grayText },

  phoneWrapper: { marginTop: 8, marginBottom: 18 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ZIPO_COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  previewText: { marginTop: 6, fontSize: 12, color: ZIPO_COLORS.grayText },

  buttonGroup: { marginTop: 8, gap: 10 },
  skipBtn: { alignSelf: "center", paddingVertical: 6, paddingHorizontal: 8 },
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

  codeBoxesWrapper: { alignItems: "center", marginBottom: 24 },
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
  codeBoxText: { fontSize: 20, fontWeight: "600", color: ZIPO_COLORS.primary },
  hiddenInput: { position: "absolute", opacity: 0, height: 0, width: 0 },

  resendBtn: { alignSelf: "center", paddingVertical: 6, paddingHorizontal: 8 },
  resendText: {
    fontSize: 13,
    color: ZIPO_COLORS.grayText,
    textAlign: "center",
  },
});
