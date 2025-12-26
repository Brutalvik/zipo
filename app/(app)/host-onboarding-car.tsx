// app/host-onboarding-car.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Button from "@/components/Button/Button";
import { useAppSelector } from "@/redux/hooks";
import { selectHost } from "@/redux/slices/hostSlice";
import { createHostCarDraft } from "@/services/hostApi";

// ✅ Reuse NEW components you created
import HostStepIndicator from "@/components/host/HostStepIndicator";
import SearchPickerModal from "@/components/host/SearchPickerModal";
import {
  ALL_BRANDS,
  CA_PROVINCES,
  CAProvince,
  POPULAR_BRANDS,
  SelectOption,
  Transmission,
  TRANSMISSIONS,
  VEHICLE_TYPE_ITEMS,
  VehicleType,
} from "@/components/host/dataTypes";

// ✅ Optional: if you already added geocodeAddress in your codebase, use it.
// If you haven’t created it yet, either create it or remove this import + usage.
import { geocodeAddress } from "@/lib/geoCode";
import { auth } from "@/services/firebase";

async function getIdToken() {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) throw new Error("Missing auth token");
  return token;
}

function yearsOptions(): SelectOption[] {
  const now = new Date().getFullYear();
  const min = 1990;
  const max = now + 1;
  const out: SelectOption[] = [];
  for (let y = max; y >= min; y--)
    out.push({ label: String(y), value: String(y) });
  return out;
}

function autoTitleFrom(year: string, make: string, model: string) {
  const base = [year.trim(), make.trim(), model.trim()]
    .filter(Boolean)
    .join(" ");
  return base || "Your car listing";
}

function normalizePostal(input: string) {
  const s = (input || "").toUpperCase().replace(/\s+/g, "").trim();
  if (s.length !== 6) return input.toUpperCase();
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

function isValidCanadianPostal(input: string) {
  const s = (input || "").trim();
  return /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(s);
}

function buildFullCaAddress(args: {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postal: string;
}) {
  const l1 = args.line1.trim();
  const l2 = (args.line2 || "").trim();
  const city = args.city.trim();
  const prov = args.province.trim().toUpperCase();
  const postal = normalizePostal(args.postal.trim());
  return `${l1}${l2 ? ", " + l2 : ""}, ${city}, ${prov} ${postal}, CA`;
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: any;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Feather name={icon} size={16} color="rgba(17,24,39,0.78)" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function SegPill({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : {}}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillOn : styles.pillOff,
        pressed && { opacity: 0.92 },
      ]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={14}
          color={selected ? "#111827" : "rgba(17,24,39,0.60)"}
        />
      ) : null}
      <Text style={[styles.pillText, selected && styles.pillTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SelectField({
  label,
  valueText,
  placeholder,
  onPress,
}: {
  label: string;
  valueText?: string;
  placeholder?: string;
  onPress?: () => void;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.selectWrap,
          pressed && { opacity: 0.98 },
        ]}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.selectText,
            !valueText ? { color: "rgba(17,24,39,0.35)" } : null,
          ]}
          numberOfLines={1}
        >
          {valueText || placeholder || "Select"}
        </Text>

        <View style={styles.selectRight}>
          <Feather name="chevron-down" size={18} color="rgba(17,24,39,0.55)" />
        </View>
      </Pressable>
    </View>
  );
}

export default function HostOnboardingCarScreen() {
  const router = useRouter();
  const host = useAppSelector(selectHost);

  const defaultCity = (host?.base_city ?? "").toString();
  const defaultProvince = (
    host?.verification?.license?.region ?? "AB"
  ).toString();

  const [saving, setSaving] = useState(false);

  // Vehicle
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const [vehicleType, setVehicleType] = useState<VehicleType>(
    VEHICLE_TYPE_ITEMS?.[0]?.value ?? "sedan"
  );
  const [transmission, setTransmission] = useState<Transmission>("automatic");
  const [seats, setSeats] = useState("5");

  // Title (auto)
  const titleAuto = useMemo(
    () => autoTitleFrom(year, make, model),
    [year, make, model]
  );

  // Pricing
  const [pricePerDay, setPricePerDay] = useState("");

  // Address (Canada)
  const countryCode = "CA";
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [province, setProvince] = useState<CAProvince>(
    (CA_PROVINCES.includes(defaultProvince as any)
      ? defaultProvince
      : "AB") as CAProvince
  );
  const [postalCode, setPostalCode] = useState("");

  // Modals (replacing PickerModal)
  const [yearOpen, setYearOpen] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);

  const yearItems = useMemo(() => yearsOptions(), []);

  const makeItems = useMemo(() => {
    const popular = POPULAR_BRANDS.map((b) => ({ label: b, value: b }));
    const all = Array.from(new Set(ALL_BRANDS))
      .sort((a, b) => a.localeCompare(b))
      .map((b) => ({ label: b, value: b }));

    // de-dupe while keeping labels
    const map = new Map<string, SelectOption>();
    for (const o of [...popular, ...all]) map.set(o.value, o);
    return Array.from(map.values());
  }, []);

  const provinceItems = useMemo<SelectOption[]>(
    () => CA_PROVINCES.map((p) => ({ label: p, value: p })),
    []
  );

  const parsedYear = useMemo(() => Number(year), [year]);
  const parsedSeats = useMemo(() => Number(seats), [seats]);
  const parsedPrice = useMemo(() => Number(pricePerDay), [pricePerDay]);

  const isValid = useMemo(() => {
    const yOk =
      Number.isFinite(parsedYear) &&
      parsedYear >= 1990 &&
      parsedYear <= new Date().getFullYear() + 1;

    const makeOk = make.trim().length >= 2;
    const modelOk = model.trim().length >= 1;

    const seatsOk =
      Number.isFinite(parsedSeats) && parsedSeats >= 2 && parsedSeats <= 9;

    const priceOk =
      Number.isFinite(parsedPrice) && parsedPrice >= 10 && parsedPrice <= 1000;

    const address1Ok = address1.trim().length >= 5;
    const cityOk = city.trim().length >= 2;
    const provinceOk = CA_PROVINCES.includes(province);
    const postalOk = isValidCanadianPostal(postalCode);

    return (
      yOk &&
      makeOk &&
      modelOk &&
      seatsOk &&
      priceOk &&
      address1Ok &&
      cityOk &&
      provinceOk &&
      postalOk
    );
  }, [
    parsedYear,
    make,
    model,
    parsedSeats,
    parsedPrice,
    address1,
    city,
    province,
    postalCode,
  ]);

  const handleCreateDraft = useCallback(async () => {
    try {
      if (!isValid) {
        Alert.alert(
          "Missing info",
          "Please fill the required fields to create a draft car."
        );
        return;
      }

      setSaving(true);

      const fullAddress = buildFullCaAddress({
        line1: address1,
        line2: address2,
        city,
        province,
        postal: postalCode,
      });

      // ✅ geocode pickup coords (if your /api/geocode exists)
      let pickup_lat: number | null = null;
      let pickup_lng: number | null = null;

      try {
        const token = await getIdToken();
        const geo = await geocodeAddress({ address: fullAddress, token });
        pickup_lat = geo.lat;
        pickup_lng = geo.lng;
      } catch (e: any) {
        // Don’t block draft creation if geocode fails; just log it
        console.warn("geocode failed:", e?.message || e);
      }

      const payload: any = {
        title: titleAuto.trim(),

        vehicle_type: vehicleType,
        transmission,
        seats: Number(parsedSeats),
        price_per_day: Number(parsedPrice),

        country_code: countryCode,
        city: city.trim(),
        area: province, // keep your existing mapping
        full_address: fullAddress,

        pickup_address: fullAddress,
        pickup_lat,
        pickup_lng,

        image_path: "draft/placeholder.jpg",
        has_image: false,
        image_public: true,

        features: {
          vehicle: {
            year: Number(parsedYear),
            make: make.trim(),
            model: model.trim(),
          },
          address: {
            country_code: "CA",
            line1: address1.trim(),
            line2: address2.trim() || null,
            city: city.trim(),
            province,
            postal_code: normalizePostal(postalCode),
            full_address: fullAddress,
          },
          pickup: {
            pickup_address: fullAddress,
            pickup_lat,
            pickup_lng,
          },
        },
      };

      const created = await createHostCarDraft(payload);
      const carId = created?.id;
      if (!carId) throw new Error("Car created but no id returned.");

      router.push(`/host-onboarding-photos?carId=${encodeURIComponent(carId)}`);
    } catch (e: any) {
      console.warn("create draft car failed:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to create draft car.");
    } finally {
      setSaving(false);
    }
  }, [
    isValid,
    titleAuto,
    vehicleType,
    transmission,
    parsedSeats,
    parsedPrice,
    address1,
    address2,
    city,
    province,
    postalCode,
    parsedYear,
    make,
    model,
    router,
  ]);

  const vehicleTypeLabel = useMemo(() => {
    const hit = VEHICLE_TYPE_ITEMS.find((x) => x.value === vehicleType);
    return hit?.label ?? vehicleType;
  }, [vehicleType]);

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
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Top header */}
          <View style={styles.topHeader}>
            <View style={styles.stepPill}>
              <Feather name="truck" size={14} color="rgba(17,24,39,0.78)" />
              <Text style={styles.stepPillText}>Add car</Text>
            </View>

            {/* ✅ only shows if host is still onboarding */}
            <HostStepIndicator current={2} total={3} />
          </View>

          <Text style={styles.h1}>Car information</Text>
          <Text style={styles.h2}>
            Start with the basics. You’ll add photos next.
          </Text>

          {/* Vehicle details */}
          <View style={styles.card}>
            <SectionHeader
              icon="settings"
              title="Vehicle details"
              subtitle="Year + brand + model"
            />

            <SelectField
              label="YEAR"
              valueText={year}
              placeholder="Select year"
              onPress={() => setYearOpen(true)}
            />

            <SelectField
              label="MAKE (BRAND)"
              valueText={make}
              placeholder="Select make"
              onPress={() => setMakeOpen(true)}
            />

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>MODEL</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={model}
                  onChangeText={setModel}
                  placeholder="e.g. Corolla"
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.hr} />

            {/* ✅ Vehicle type now uses SearchPickerModal + expanded types */}
            <SelectField
              label="VEHICLE TYPE"
              valueText={vehicleTypeLabel}
              placeholder="Select type"
              onPress={() => setTypeOpen(true)}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>TRANSMISSION</Text>
            <View style={styles.pillRow}>
              {TRANSMISSIONS.map((t) => (
                <SegPill
                  key={t.key}
                  label={t.label}
                  selected={transmission === t.key}
                  onPress={() => setTransmission(t.key)}
                />
              ))}
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>SEATS</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={seats}
                  onChangeText={(v) =>
                    setSeats(v.replace(/[^\d]/g, "").slice(0, 1))
                  }
                  placeholder="5"
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
            </View>
          </View>

          {/* Listing basics */}
          <View style={styles.card}>
            <SectionHeader
              icon="file-text"
              title="Listing basics"
              subtitle="Auto title + pricing"
            />

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>TITLE (AUTO)</Text>
              <View style={styles.readonlyWrap}>
                <Text style={styles.readonlyText} numberOfLines={2}>
                  {titleAuto}
                </Text>
                <Text style={styles.readonlyHint}>
                  Generated from Year + Make + Model
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>PRICE PER DAY (CAD)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={pricePerDay}
                  onChangeText={(v) =>
                    setPricePerDay(v.replace(/[^\d]/g, "").slice(0, 4))
                  }
                  placeholder="e.g. 89"
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Canadian address */}
          <View style={styles.card}>
            <SectionHeader
              icon="map-pin"
              title="Pickup address (Canada)"
              subtitle="Used for pickup area & map"
            />

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>STREET ADDRESS</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={address1}
                  onChangeText={setAddress1}
                  placeholder="e.g. 123 8 Ave SW"
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>UNIT / APT (OPTIONAL)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={address2}
                  onChangeText={setAddress2}
                  placeholder="e.g. Unit 1203"
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.input}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.row2}>
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

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <SelectField
                  label="PROVINCE"
                  valueText={province}
                  placeholder="Select"
                  onPress={() => setProvinceOpen(true)}
                />
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>POSTAL CODE</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={postalCode}
                  onChangeText={(v) => setPostalCode(v.toUpperCase())}
                  onBlur={() => setPostalCode((p) => normalizePostal(p))}
                  placeholder="e.g. T2P 1B3"
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.input}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                />
              </View>
              <Text style={styles.note}>
                Your listing is Canada-only for now ({countryCode}).
              </Text>
            </View>
          </View>

          <View style={{ height: 12 }} />

          {saving ? (
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <ActivityIndicator />
            </View>
          ) : null}

          <Button
            title={saving ? "Creating…" : "Create draft"}
            onPress={handleCreateDraft}
            variant="primary"
            size="lg"
            disabled={!isValid || saving}
          />

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backLink,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>

          <View style={{ height: 28 }} />
        </ScrollView>

        {/* ✅ Search modals (keyboard-safe, fixed filtering) */}
        <SearchPickerModal
          visible={yearOpen}
          title="Select year"
          items={yearItems}
          value={year}
          placeholder="Type year (e.g. 2012)"
          onClose={() => setYearOpen(false)}
          onSelect={(it: any) => {
            setYear(it.value);
            setYearOpen(false);
          }}
        />

        <SearchPickerModal
          visible={makeOpen}
          title="Select make"
          items={makeItems}
          value={make}
          placeholder="Type brand (e.g. BMW)"
          onClose={() => setMakeOpen(false)}
          onSelect={(it: any) => {
            setMake(it.value);
            setMakeOpen(false);
          }}
        />

        <SearchPickerModal
          visible={typeOpen}
          title="Select vehicle type"
          items={VEHICLE_TYPE_ITEMS}
          value={vehicleType}
          placeholder="Search type"
          onClose={() => setTypeOpen(false)}
          onSelect={(it: any) => {
            setVehicleType(it.value);
            setTypeOpen(false);
          }}
        />

        <SearchPickerModal
          visible={provinceOpen}
          title="Select province"
          items={provinceItems}
          value={province}
          placeholder="Search province (e.g. AB)"
          onClose={() => setProvinceOpen(false)}
          onSelect={(it: any) => {
            setProvince(it.value as CAProvince);
            setProvinceOpen(false);
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  h1: {
    fontSize: 24,
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
    marginBottom: 12,
  },

  card: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 14,
    marginTop: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.92)",
    letterSpacing: -0.1,
  },
  sectionSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
    letterSpacing: 0.7,
    marginBottom: 10,
  },

  row2: { flexDirection: "row", alignItems: "flex-start", marginTop: 14 },

  inputWrap: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    padding: 0,
  },

  readonlyWrap: {
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  readonlyText: {
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(17,24,39,0.80)",
  },
  readonlyHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
  },

  selectWrap: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    flex: 1,
  },
  selectRight: { flexDirection: "row", alignItems: "center", gap: 8 },

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillOn: {
    backgroundColor: "rgba(17,24,39,0.10)",
    borderColor: "rgba(17,24,39,0.18)",
  },
  pillOff: {
    backgroundColor: "rgba(17,24,39,0.03)",
    borderColor: "rgba(17,24,39,0.10)",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.62)",
  },
  pillTextOn: { color: "rgba(17,24,39,0.90)" },

  hr: {
    marginTop: 16,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },

  note: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
  },

  backLink: {
    alignSelf: "center",
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(17,24,39,0.55)",
  },
});
