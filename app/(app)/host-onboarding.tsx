// app/host-onboarding.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Button from "@/components/Button/Button";
import type {
  HostType,
  CancellationPolicy,
  AllowedDrivers,
  Host,
} from "@/redux/slices/hostSlice";

import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectHost, setHost } from "@/redux/slices/hostSlice";
import { patchHostProfile } from "@/services/hostApi";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
    return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
    return null;
  return dt;
}

type Props = {
  initial?: Host | null;
  onContinue?: (data: any) => void;
};

export default function HostOnboardingScreen({ initial, onContinue }: Props) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { user } = useAuth();
  const host = useAppSelector(selectHost);

  const userDisplayName = user?.name || "";

  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState<string>(userDisplayName);

  const [hostType, setHostType] = useState<HostType>(
    (initial?.host_type ?? host?.host_type ?? "individual") as HostType
  );

  const [businessName, setBusinessName] = useState(
    String(initial?.business_name ?? host?.business_name ?? "")
  );

  const [countryCode, setCountryCode] = useState(
    String(initial?.base_country_code ?? host?.base_country_code ?? "CA")
  );
  const [city, setCity] = useState(
    String(initial?.base_city ?? host?.base_city ?? "")
  );
  const [area, setArea] = useState(
    String(initial?.base_area ?? host?.base_area ?? "")
  );

  const [advanceNoticeHours, setAdvanceNoticeHours] = useState(
    String(initial?.advance_notice_hours ?? host?.advance_notice_hours ?? 24)
  );

  const [instantBookEnabled, setInstantBookEnabled] = useState(
    Boolean(
      initial?.instant_book_enabled ?? host?.instant_book_enabled ?? false
    )
  );

  const [minTripDays, setMinTripDays] = useState(
    String(initial?.min_trip_days ?? host?.min_trip_days ?? 1)
  );

  const [maxTripDays, setMaxTripDays] = useState(() => {
    const v = initial?.max_trip_days ?? host?.max_trip_days;
    return v == null ? "" : String(v);
  });

  const [cancellationPolicy, setCancellationPolicy] =
    useState<CancellationPolicy>(
      (initial?.cancellation_policy ??
        host?.cancellation_policy ??
        "moderate") as CancellationPolicy
    );

  const [allowedDrivers, setAllowedDrivers] = useState<AllowedDrivers>(
    (initial?.allowed_drivers ??
      host?.allowed_drivers ??
      "additional_allowed") as AllowedDrivers
  );

  const existingLicense = (host?.verification?.license ||
    initial?.verification?.license ||
    {}) as any;

  const [licenseNumber, setLicenseNumber] = useState(
    String(existingLicense?.number ?? "")
  );
  const [licenseCountry, setLicenseCountry] = useState(
    String(existingLicense?.country ?? "CA")
  );
  const [licenseRegion, setLicenseRegion] = useState(
    String(existingLicense?.region ?? "AB")
  );

  const initialExpiryDate = useMemo(() => {
    const fromHost =
      typeof existingLicense?.expiry === "string" ? existingLicense.expiry : "";
    const parsed = parseYmd(fromHost);
    return (
      parsed ??
      new Date(
        new Date().getFullYear() + 1,
        new Date().getMonth(),
        new Date().getDate()
      )
    );
  }, [existingLicense?.expiry]);

  const [expiryDate, setExpiryDate] = useState<Date>(initialExpiryDate);
  const expiryYmd = useMemo(() => formatYmd(expiryDate), [expiryDate]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const openPicker = () => setPickerOpen(true);
  const closePicker = () => setPickerOpen(false);

  const onAndroidChange = (ev: DateTimePickerEvent, selected?: Date) => {
    if (ev?.type === "dismissed") {
      setPickerOpen(false);
      return;
    }
    if (selected) setExpiryDate(selected);
    setPickerOpen(false);
  };

  const parsedAdvanceNotice = useMemo(() => {
    const n = Number(advanceNoticeHours);
    return Number.isFinite(n) ? n : NaN;
  }, [advanceNoticeHours]);

  const parsedMinTrip = useMemo(() => {
    const n = Number(minTripDays);
    return Number.isFinite(n) ? n : NaN;
  }, [minTripDays]);

  const parsedMaxTrip = useMemo(() => {
    const s = (maxTripDays || "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }, [maxTripDays]);

  const isValid = useMemo(() => {
    const nameOk = (userDisplayName || displayName).trim().length >= 2;

    const ccOk = countryCode.trim().length === 2;
    const cityOk = city.trim().length >= 2;
    const areaOk = area.trim().length >= 2;

    const noticeOk =
      Number.isFinite(parsedAdvanceNotice) &&
      parsedAdvanceNotice >= 0 &&
      parsedAdvanceNotice <= 168;

    const minOk =
      Number.isFinite(parsedMinTrip) &&
      parsedMinTrip >= 1 &&
      parsedMinTrip <= 30;

    const maxOk =
      parsedMaxTrip === null ||
      (Number.isFinite(parsedMaxTrip) &&
        parsedMaxTrip >= parsedMinTrip &&
        parsedMaxTrip <= 365);

    const bizOk = hostType === "individual" || businessName.trim().length >= 2;

    const licNumOk = licenseNumber.trim().length >= 4;
    const licCountryOk = licenseCountry.trim().length >= 2;
    const licRegionOk = licenseRegion.trim().length >= 2;

    const today = new Date();
    const t0 = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const e0 = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate()
    ).getTime();
    const expOk = e0 >= t0;

    return (
      nameOk &&
      ccOk &&
      cityOk &&
      areaOk &&
      noticeOk &&
      minOk &&
      maxOk &&
      bizOk &&
      licNumOk &&
      licCountryOk &&
      licRegionOk &&
      expOk
    );
  }, [
    userDisplayName,
    displayName,
    countryCode,
    city,
    area,
    parsedAdvanceNotice,
    parsedMinTrip,
    parsedMaxTrip,
    hostType,
    businessName,
    licenseNumber,
    licenseCountry,
    licenseRegion,
    expiryDate,
  ]);

  useEffect(() => {
    if (userDisplayName) setDisplayName(userDisplayName);
  }, [userDisplayName]);

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert("Missing info", "Please complete the required fields.");
      return;
    }

    try {
      setSaving(true);

      const safeDisplayName = (userDisplayName || displayName || "Host").trim();

      const patch: Record<string, any> = {
        display_name: safeDisplayName,
        host_type: hostType,
        business_name: hostType === "business" ? businessName.trim() : null,

        base_country_code: countryCode.trim().toUpperCase(),
        base_city: city.trim(),
        base_area: area.trim(),

        advance_notice_hours: Math.max(
          0,
          Math.min(168, Number(parsedAdvanceNotice))
        ),
        instant_book_enabled: !!instantBookEnabled,

        min_trip_days: Math.max(1, Math.min(30, Number(parsedMinTrip))),
        max_trip_days: parsedMaxTrip === null ? null : Number(parsedMaxTrip),

        cancellation_policy: cancellationPolicy,
        allowed_drivers: allowedDrivers,

        verification: {
          ...(host?.verification || {}),
          license: {
            number: licenseNumber.trim(),
            country: licenseCountry.trim().toUpperCase(),
            region: licenseRegion.trim().toUpperCase(),
            expiry: expiryYmd,
          },
        },
      };

      const updatedHost = await patchHostProfile(patch);
      dispatch(setHost(updatedHost));

      onContinue?.(patch);
      router.push("/host-onboarding-car");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.safe}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topHeader}>
            <View style={styles.stepPill}>
              <Feather name="clipboard" size={14} color="rgba(17,24,39,0.75)" />
              <Text style={styles.stepPillText}>Host onboarding</Text>
            </View>

            <View style={styles.progressPill}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "34%" }]} />
              </View>
              <Text style={styles.progressText}>1 of 3</Text>
            </View>
          </View>

          <Text style={styles.h1}>Set up your host profile</Text>
          <Text style={styles.h2}>
            A few details to prepare your account. You can edit later.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather name="user" size={16} color="rgba(17,24,39,0.70)" />
              </View>
              <Text style={styles.cardTitle}>Profile</Text>
            </View>

            <View style={styles.labelInline}>
              <Text style={styles.label}>DISPLAY NAME</Text>
              <Feather name="lock" size={12} color="rgba(17,24,39,0.45)" />
            </View>

            <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
              <TextInput
                value={displayName}
                placeholder="e.g. Vikram"
                placeholderTextColor="rgba(17,24,39,0.30)"
                style={[styles.input, styles.inputDisabled]}
                autoCapitalize="words"
                autoCorrect={false}
                editable={false}
                selectTextOnFocus={false}
              />
            </View>

            <Text style={styles.label}>HOST TYPE</Text>
            <View style={styles.segRow}>
              <SegButton
                label="Individual"
                selected={hostType === "individual"}
                onPress={() => setHostType("individual")}
              />
              <SegButton
                label="Business"
                selected={hostType === "business"}
                onPress={() => setHostType("business")}
              />
            </View>

            {hostType === "business" ? (
              <>
                <Text style={styles.label}>BUSINESS NAME</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="e.g. Zipo Rentals Inc."
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather name="map-pin" size={16} color="rgba(17,24,39,0.70)" />
              </View>
              <Text style={styles.cardTitle}>Base location</Text>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>COUNTRY</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={countryCode}
                    onChangeText={setCountryCode}
                    placeholder="CA"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 2 }}>
                <Text style={styles.label}>CITY</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Calgary"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>AREA / NEIGHBORHOOD</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={area}
                onChangeText={setArea}
                placeholder="e.g. Downtown"
                placeholderTextColor="rgba(17,24,39,0.35)"
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather name="sliders" size={16} color="rgba(17,24,39,0.70)" />
              </View>
              <Text style={styles.cardTitle}>Preferences</Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Instant book</Text>
                <Text style={styles.switchSub}>
                  Let guests request bookings faster.
                </Text>
              </View>
              <Switch
                value={instantBookEnabled}
                onValueChange={setInstantBookEnabled}
              />
            </View>

            <Text style={styles.label}>ADVANCE NOTICE (HOURS)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={advanceNoticeHours}
                onChangeText={setAdvanceNoticeHours}
                placeholder="24"
                placeholderTextColor="rgba(17,24,39,0.35)"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>MIN TRIP DAYS</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={minTripDays}
                    onChangeText={setMinTripDays}
                    placeholder="1"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>MAX TRIP DAYS (OPTIONAL)</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={maxTripDays}
                    onChangeText={setMaxTripDays}
                    placeholder="e.g. 30"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>CANCELLATION POLICY</Text>
            <View style={styles.segRow}>
              <SegButton
                label="Flexible"
                selected={cancellationPolicy === "flexible"}
                onPress={() => setCancellationPolicy("flexible")}
              />
              <SegButton
                label="Moderate"
                selected={cancellationPolicy === "moderate"}
                onPress={() => setCancellationPolicy("moderate")}
              />
              <SegButton
                label="Strict"
                selected={cancellationPolicy === "strict"}
                onPress={() => setCancellationPolicy("strict")}
              />
            </View>

            <Text style={styles.label}>ALLOWED DRIVERS</Text>
            <View style={styles.segRow}>
              <SegButton
                label="Only me"
                selected={allowedDrivers === "only_primary"}
                onPress={() => setAllowedDrivers("only_primary")}
              />
              <SegButton
                label="Additional"
                selected={allowedDrivers === "additional_allowed"}
                onPress={() => setAllowedDrivers("additional_allowed")}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather
                  name="credit-card"
                  size={16}
                  color="rgba(17,24,39,0.70)"
                />
              </View>
              <Text style={styles.cardTitle}>Driver license</Text>
            </View>

            <Text style={styles.label}>LICENSE NUMBER</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="e.g. 175178-5733"
                placeholderTextColor="rgba(17,24,39,0.35)"
                style={styles.input}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>COUNTRY</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={licenseCountry}
                    onChangeText={setLicenseCountry}
                    placeholder="CA"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PROVINCE / STATE</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={licenseRegion}
                    onChangeText={setLicenseRegion}
                    placeholder="AB"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>EXPIRY DATE</Text>
            <Pressable
              onPress={openPicker}
              style={styles.inputWrap}
              accessibilityRole="button"
            >
              <Text style={[styles.input, styles.inputTextOnly]}>
                {expiryYmd}
              </Text>
            </Pressable>

            <Text style={styles.note}>
              We may request verification later. Your details are stored
              securely.
            </Text>
          </View>

          <View style={{ height: 12 }} />

          {saving ? (
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <ActivityIndicator />
            </View>
          ) : null}

          <Button
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            size="lg"
            disabled={!isValid || saving}
          />

          <Text style={styles.nextHint}>Next: you’ll add your first car.</Text>

          <View style={{ height: 28 }} />
        </ScrollView>

        {Platform.OS === "android" && pickerOpen ? (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display="default"
            onChange={onAndroidChange}
            minimumDate={new Date()}
          />
        ) : null}

        {Platform.OS === "ios" ? (
          <Modal
            visible={pickerOpen}
            transparent
            animationType="slide"
            onRequestClose={closePicker}
          >
            <Pressable style={styles.modalBackdrop} onPress={closePicker} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select expiry date</Text>
                <Pressable onPress={closePicker} style={styles.donePill}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>

              <DateTimePicker
                value={expiryDate}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setExpiryDate(d)}
                minimumDate={new Date()}
                style={{ width: "100%" }}
              />
            </View>
          </Modal>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SegButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : {}}
      style={({ pressed }) => [
        styles.segBtn,
        selected ? styles.segBtnOn : styles.segBtnOff,
        pressed && { opacity: 0.92 },
      ]}
    >
      <Text
        style={[
          styles.segText,
          selected ? styles.segTextOn : styles.segTextOff,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },

  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
  },

  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  stepPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.75)",
  },

  progressPill: {
    alignItems: "flex-end",
    gap: 6,
  },
  progressBar: {
    width: 88,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.55)",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.40)",
  },

  h1: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  h2: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    lineHeight: 18,
    marginBottom: 14,
  },

  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
    marginTop: 12,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.90)",
    letterSpacing: -0.1,
  },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
    letterSpacing: 0.7,
  },

  labelInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 10,
  },

  row2: { flexDirection: "row", alignItems: "flex-start" },

  inputWrap: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  inputWrapDisabled: {
    backgroundColor: "rgba(17,24,39,0.03)",
    borderColor: "rgba(17,24,39,0.10)",
  },

  input: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    padding: 0,
  },

  inputDisabled: {
    color: "rgba(17,24,39,0.55)",
  },

  inputTextOnly: {},

  note: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
  },

  nextHint: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.35)",
  },

  segRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  segBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  segBtnOn: {
    backgroundColor: "rgba(17,24,39,0.10)",
    borderColor: "rgba(17,24,39,0.18)",
  },
  segBtnOff: {
    backgroundColor: "rgba(17,24,39,0.03)",
    borderColor: "rgba(17,24,39,0.10)",
  },
  segText: { fontSize: 12, fontWeight: "900" },
  segTextOn: { color: "rgba(17,24,39,0.88)" },
  segTextOff: { color: "rgba(17,24,39,0.55)" },

  switchRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 8,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.88)",
    marginBottom: 4,
  },
  switchSub: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    lineHeight: 16,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 14,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.14)",
    marginBottom: 10,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },

  sheetTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },

  donePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  doneText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
});
