// app/host-onboarding.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// -------------------------
// Helpers
// -------------------------
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function FieldLabel({
  label,
  required,
  right,
}: {
  label: string;
  required?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={styles.label}>
        {label}{" "}
        {required ? (
          <Text style={{ color: "rgba(239,68,68,0.85)" }}>*</Text>
        ) : null}
      </Text>
      {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  disabled,
  keyboardType,
  maxLength,
  autoCapitalize,
  icon,
}: {
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  disabled?: boolean;
  keyboardType?: any;
  maxLength?: number;
  autoCapitalize?: any;
  icon?: keyof typeof Feather.glyphMap;
}) {
  return (
    <View style={[styles.inputShell, disabled && styles.inputShellDisabled]}>
      {icon ? (
        <View style={styles.inputIcon}>
          <Feather
            name={icon}
            size={16}
            color={disabled ? "rgba(17,24,39,0.35)" : "rgba(17,24,39,0.55)"}
          />
        </View>
      ) : null}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(17,24,39,0.30)"
        style={[styles.input, disabled && styles.inputDisabled]}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        editable={!disabled}
        selectTextOnFocus={!disabled}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
      {disabled ? (
        <View style={styles.lockPill}>
          <Feather name="lock" size={12} color="rgba(17,24,39,0.45)" />
        </View>
      ) : null}
    </View>
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

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Feather name={icon} size={16} color="rgba(17,24,39,0.72)" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSub}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={{ height: 10 }} />
      {children}
    </View>
  );
}

function ProgressPills({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <View style={styles.progressWrap}>
      <View style={styles.stepPill}>
        <Feather name="clipboard" size={14} color="rgba(17,24,39,0.75)" />
        <Text style={styles.stepPillText}>Host onboarding</Text>
      </View>

      <View style={styles.progressPill}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {step} of {total}
        </Text>
      </View>
    </View>
  );
}

// -------------------------
// Screen
// -------------------------
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

  // Modern, helpful "completion" for UX
  const completion = useMemo(() => {
    let score = 0;
    let total = 10;

    if ((userDisplayName || displayName).trim().length >= 2) score++;
    if (countryCode.trim().length === 2) score++;
    if (city.trim().length >= 2) score++;
    if (area.trim().length >= 2) score++;
    if (
      Number.isFinite(parsedAdvanceNotice) &&
      parsedAdvanceNotice >= 0 &&
      parsedAdvanceNotice <= 168
    )
      score++;
    if (
      Number.isFinite(parsedMinTrip) &&
      parsedMinTrip >= 1 &&
      parsedMinTrip <= 30
    )
      score++;
    if (
      parsedMaxTrip === null ||
      (Number.isFinite(parsedMaxTrip) &&
        parsedMaxTrip >= parsedMinTrip &&
        parsedMaxTrip <= 365)
    )
      score++;
    if (hostType === "individual" || businessName.trim().length >= 2) score++;
    if (licenseNumber.trim().length >= 4) score++;
    if (formatYmd(expiryDate).length === 10) score++;

    const pct = Math.round((score / total) * 100);
    return { score, total, pct };
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

        advance_notice_hours: clamp(Number(parsedAdvanceNotice), 0, 168),
        instant_book_enabled: !!instantBookEnabled,

        min_trip_days: clamp(Number(parsedMinTrip), 1, 30),
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
        {/* Modern background accents (no neon) */}
        <View pointerEvents="none" style={styles.bgAccentA} />
        <View pointerEvents="none" style={styles.bgAccentB} />

        <ScrollView
          style={styles.safe}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProgressPills step={1} total={3} />

          <View style={styles.hero}>
            <Text style={styles.h1}>Set up your host profile</Text>
            <Text style={styles.h2}>
              This only takes a minute. You can edit everything later.
            </Text>

            <View style={styles.completionCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.completionTitle}>Profile completion</Text>
                <Text style={styles.completionSub}>
                  {completion.pct}% complete • step 1 prepares your hosting
                  rules
                </Text>
              </View>
              <View style={styles.ring}>
                <Text style={styles.ringText}>{completion.pct}%</Text>
              </View>
              <View style={styles.completionBar}>
                <View
                  style={[
                    styles.completionFill,
                    { width: `${completion.pct}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          <SectionCard
            icon="user"
            title="Profile"
            subtitle="How guests will see you"
          >
            <FieldLabel
              label="DISPLAY NAME"
              required
              right={
                <Feather name="lock" size={12} color="rgba(17,24,39,0.45)" />
              }
            />
            <Input
              value={displayName}
              placeholder="e.g. Vikram"
              disabled
              autoCapitalize="words"
              icon="user"
            />

            <View style={{ height: 12 }} />
            <FieldLabel label="HOST TYPE" required />
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
                <View style={{ height: 12 }} />
                <FieldLabel label="BUSINESS NAME" required />
                <Input
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Zipo Rentals Inc."
                  autoCapitalize="words"
                  icon="briefcase"
                />
              </>
            ) : null}
          </SectionCard>

          <SectionCard
            icon="map-pin"
            title="Base location"
            subtitle="Used for default pickup city and search"
          >
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="COUNTRY" required />
                <Input
                  value={countryCode}
                  onChangeText={setCountryCode}
                  placeholder="CA"
                  autoCapitalize="characters"
                  maxLength={2}
                  icon="globe"
                />
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 2 }}>
                <FieldLabel label="CITY" required />
                <Input
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Calgary"
                  autoCapitalize="words"
                  icon="map"
                />
              </View>
            </View>

            <View style={{ height: 12 }} />
            <FieldLabel label="AREA / NEIGHBORHOOD" required />
            <Input
              value={area}
              onChangeText={setArea}
              placeholder="e.g. Downtown"
              autoCapitalize="words"
              icon="navigation"
            />
          </SectionCard>

          <SectionCard
            icon="sliders"
            title="Preferences"
            subtitle="Defaults for booking requests"
          >
            <View style={styles.switchCard}>
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

            <View style={{ height: 12 }} />
            <FieldLabel label="ADVANCE NOTICE (HOURS)" required />
            <Input
              value={advanceNoticeHours}
              onChangeText={setAdvanceNoticeHours}
              placeholder="24"
              keyboardType="number-pad"
              icon="clock"
            />

            <View style={{ height: 12 }} />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="MIN TRIP DAYS" required />
                <Input
                  value={minTripDays}
                  onChangeText={setMinTripDays}
                  placeholder="1"
                  keyboardType="number-pad"
                  icon="calendar"
                />
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <FieldLabel label="MAX TRIP DAYS (OPTIONAL)" />
                <Input
                  value={maxTripDays}
                  onChangeText={setMaxTripDays}
                  placeholder="e.g. 30"
                  keyboardType="number-pad"
                  icon="calendar"
                />
              </View>
            </View>

            <View style={{ height: 12 }} />
            <FieldLabel label="CANCELLATION POLICY" required />
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

            <View style={{ height: 12 }} />
            <FieldLabel label="ALLOWED DRIVERS" required />
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
          </SectionCard>

          <SectionCard
            icon="credit-card"
            title="Driver license"
            subtitle="Used for verification later"
          >
            <FieldLabel label="LICENSE NUMBER" required />
            <Input
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="e.g. 175178-5733"
              autoCapitalize="characters"
              icon="hash"
            />

            <View style={{ height: 12 }} />
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="COUNTRY" required />
                <Input
                  value={licenseCountry}
                  onChangeText={setLicenseCountry}
                  placeholder="CA"
                  autoCapitalize="characters"
                  maxLength={2}
                  icon="globe"
                />
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <FieldLabel label="PROVINCE / STATE" required />
                <Input
                  value={licenseRegion}
                  onChangeText={setLicenseRegion}
                  placeholder="AB"
                  autoCapitalize="characters"
                  maxLength={3}
                  icon="map-pin"
                />
              </View>
            </View>

            <View style={{ height: 12 }} />
            <FieldLabel label="EXPIRY DATE" required />
            <Pressable
              onPress={openPicker}
              style={({ pressed }) => [
                styles.inputShell,
                pressed && { opacity: 0.92 },
              ]}
              accessibilityRole="button"
            >
              <View style={styles.inputIcon}>
                <Feather
                  name="calendar"
                  size={16}
                  color="rgba(17,24,39,0.55)"
                />
              </View>
              <Text style={[styles.input, { paddingVertical: 2 }]}>
                {expiryYmd}
              </Text>
              <Feather
                name="chevron-down"
                size={16}
                color="rgba(17,24,39,0.45)"
              />
            </Pressable>

            <Text style={styles.note}>
              We may request verification later. Your details are stored
              securely.
            </Text>
          </SectionCard>

          <View style={{ height: 14 }} />

          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator />
              <Text style={styles.savingText}>Saving…</Text>
            </View>
          ) : null}

          <View style={styles.bottomCard}>
            <Button
              title="Continue"
              onPress={handleContinue}
              variant="primary"
              size="lg"
              disabled={!isValid || saving}
            />
            <Text style={styles.nextHint}>
              Next: you’ll add your first car.
            </Text>
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>

        {/* Date picker */}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },

  // Subtle modern background (no neon)
  bgAccentA: {
    position: "absolute",
    top: -140,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.06)",
  },
  bgAccentB: {
    position: "absolute",
    bottom: -160,
    right: -140,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.05)",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },

  // Hero
  hero: {
    marginBottom: 12,
  },

  h1: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  h2: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.50)",
    lineHeight: 18,
    marginBottom: 12,
  },

  // Progress
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  stepPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
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
    width: 104,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.62)",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.40)",
  },

  // Completion
  completionCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completionTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(17,24,39,0.88)",
  },
  completionSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.78)",
  },
  completionBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.10)",
    overflow: "hidden",
  },
  completionFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.55)",
  },

  // Card
  card: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.92)",
    letterSpacing: -0.1,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  // Labels + inputs
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
    letterSpacing: 0.7,
  },

  inputShell: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputShellDisabled: {
    backgroundColor: "rgba(17,24,39,0.03)",
    borderColor: "rgba(17,24,39,0.10)",
  },
  inputIcon: {
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    padding: 0,
  },
  inputDisabled: {
    color: "rgba(17,24,39,0.55)",
  },
  lockPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  row2: { flexDirection: "row", alignItems: "flex-start" },

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

  // Switch block
  switchCard: {
    borderRadius: 18,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
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

  note: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
  },

  // Bottom
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 8,
  },
  savingText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },

  bottomCard: {
    marginTop: 4,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
  },
  nextHint: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.35)",
  },

  // iOS date sheet
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
