// app/host-onboarding-car.tsx
import React, { useMemo, useState } from "react";
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

type Transmission = "automatic" | "manual";
type VehicleType = "sedan" | "suv" | "truck" | "van";

export default function HostOnboardingCarScreen() {
  const router = useRouter();
  const host = useAppSelector(selectHost);

  const defaultCountry = (host?.base_country_code ?? "CA").toString();
  const defaultCity = (host?.base_city ?? "").toString();
  const defaultArea = (host?.base_area ?? "").toString();

  const [saving, setSaving] = useState(false);

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("sedan");
  const [transmission, setTransmission] = useState<Transmission>("automatic");
  const [seats, setSeats] = useState("5");

  const [title, setTitle] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");

  const [countryCode, setCountryCode] = useState(defaultCountry);
  const [city, setCity] = useState(defaultCity);
  const [area, setArea] = useState(defaultArea);

  const parsedYear = useMemo(() => Number(year), [year]);
  const parsedSeats = useMemo(() => Number(seats), [seats]);
  const parsedPrice = useMemo(() => Number(pricePerDay), [pricePerDay]);

  const autoTitle = useMemo(() => {
    const y = year.trim();
    const mk = make.trim();
    const md = model.trim();
    const base = [y, mk, md].filter(Boolean).join(" ");
    return base || "Your car listing";
  }, [year, make, model]);

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

    const ccOk = countryCode.trim().length === 2;
    const cityOk = city.trim().length >= 2;
    const areaOk = area.trim().length >= 2;

    const titleOk = title.trim().length >= 6 || (makeOk && modelOk);

    return (
      yOk &&
      makeOk &&
      modelOk &&
      seatsOk &&
      priceOk &&
      ccOk &&
      cityOk &&
      areaOk &&
      titleOk
    );
  }, [
    parsedYear,
    make,
    model,
    parsedSeats,
    parsedPrice,
    countryCode,
    city,
    area,
    title,
  ]);

  const handleCreateDraft = async () => {
    try {
      if (!isValid) {
        Alert.alert(
          "Missing info",
          "Please fill the required fields to create a draft car."
        );
        return;
      }

      setSaving(true);

      // Your backend sanitizeCarCreate expects flat fields:
      // title, vehicle_type, transmission, seats, price_per_day, country_code, city, area
      // It does NOT accept year/make/model right now — so we store those in features.vehicle
      const payload = {
        title: (title.trim() || autoTitle).trim(),
        vehicle_type: vehicleType,
        transmission,
        seats: Number(parsedSeats),
        price_per_day: Number(parsedPrice),

        country_code: countryCode.trim().toUpperCase(),
        city: city.trim(),
        area: area.trim(),

        full_address: `${area.trim()}, ${city.trim()}, ${countryCode
          .trim()
          .toUpperCase()}`,

        // ✅ satisfy DB constraint (placeholder for draft)
        image_path: "draft/placeholder.jpg",
        has_image: false,
        image_public: true,

        features: {
          vehicle: {
            year: Number(parsedYear),
            make: make.trim(),
            model: model.trim(),
          },
        },
      };

      const created = await createHostCarDraft(payload);

      const carId = created?.id;
      if (!carId) {
        throw new Error("Car created but no id returned.");
      }

      router.push(`/host-onboarding-photos?carId=${encodeURIComponent(carId)}`);
    } catch (e: any) {
      console.warn("create draft car failed:", e?.message || e);
      Alert.alert("Error", e?.message || "Failed to create draft car.");
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
              <Feather name="truck" size={14} color="rgba(17,24,39,0.75)" />
              <Text style={styles.stepPillText}>Add your first car</Text>
            </View>

            <View style={styles.progressPill}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "67%" }]} />
              </View>
              <Text style={styles.progressText}>2 of 3</Text>
            </View>
          </View>

          <Text style={styles.h1}>Create a draft listing</Text>
          <Text style={styles.h2}>
            Keep it simple. You’ll add photos and availability next.
          </Text>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather
                  name="settings"
                  size={16}
                  color="rgba(17,24,39,0.70)"
                />
              </View>
              <Text style={styles.cardTitle}>Vehicle details</Text>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>YEAR</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={year}
                    onChangeText={setYear}
                    placeholder="e.g. 2020"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>SEATS</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={seats}
                    onChangeText={setSeats}
                    placeholder="5"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                </View>
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>MAKE</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={make}
                    onChangeText={setMake}
                    placeholder="e.g. Toyota"
                    placeholderTextColor="rgba(17,24,39,0.35)"
                    style={styles.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={{ width: 12 }} />

              <View style={{ flex: 1 }}>
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
            </View>

            <Text style={styles.label}>VEHICLE TYPE</Text>
            <View style={styles.segRow}>
              {(["sedan", "suv", "truck", "van"] as VehicleType[]).map((t) => (
                <SegButton
                  key={t}
                  label={t.toUpperCase()}
                  selected={vehicleType === t}
                  onPress={() => setVehicleType(t)}
                />
              ))}
            </View>

            <Text style={styles.label}>TRANSMISSION</Text>
            <View style={styles.segRow}>
              <SegButton
                label="AUTOMATIC"
                selected={transmission === "automatic"}
                onPress={() => setTransmission("automatic")}
              />
              <SegButton
                label="MANUAL"
                selected={transmission === "manual"}
                onPress={() => setTransmission("manual")}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather
                  name="file-text"
                  size={16}
                  color="rgba(17,24,39,0.70)"
                />
              </View>
              <Text style={styles.cardTitle}>Listing basics</Text>
            </View>

            <Text style={styles.label}>TITLE</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={autoTitle}
                placeholderTextColor="rgba(17,24,39,0.35)"
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>PRICE PER DAY (CAD)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={pricePerDay}
                onChangeText={setPricePerDay}
                placeholder="e.g. 89"
                placeholderTextColor="rgba(17,24,39,0.35)"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.iconChip}>
                <Feather name="map-pin" size={16} color="rgba(17,24,39,0.70)" />
              </View>
              <Text style={styles.cardTitle}>Pickup area</Text>
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

            <Text style={styles.note}>
              You can fine-tune the exact address later.
            </Text>
          </View>

          <View style={{ height: 12 }} />

          {saving ? (
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <ActivityIndicator />
            </View>
          ) : null}

          <Button
            title={saving ? "Creating..." : "Create Draft Car"}
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

  progressPill: { alignItems: "flex-end", gap: 6 },
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
    marginBottom: 10,
    marginTop: 12,
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

  input: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    padding: 0,
  },

  note: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
    lineHeight: 16,
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
