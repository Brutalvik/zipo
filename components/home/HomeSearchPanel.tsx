import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import DaysPickerModal from "@/components/DaysPickerModal";
import { addDays } from "@/lib/date";
import CustomCalendar from "@/components/common/CustomCalendar";
import { geocodeCity } from "@/lib/locationHelpers";
import { fetchCarsForRadius } from "@/services/carsApi";

export type HomeSearchState = {
  location: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  pickupAt: Date;
  days: number;
};

function getAddressPart(details: any, type: string): string | undefined {
  return details?.address_components?.find((c: any) => c.types.includes(type))
    ?.long_name;
}

function fmtPanelDateTime(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const MMM = d.toLocaleString("en-US", { month: "short" });
  const yyyy = d.getFullYear();

  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  return `${dd}-${MMM}-${yyyy} - ${h}:${m} ${ampm}`;
}

export default function HomeSearchPanel({
  value,
  onChange,
  onPressSearch, // called after cars are fetched
  containerStyle,
  countryCode = "ca",
}: {
  value: HomeSearchState;
  onChange: (next: HomeSearchState) => void;
  onPressSearch?: (cars: any[]) => void;
  containerStyle?: any;
  countryCode?: string;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [daysOpen, setDaysOpen] = useState(false);

  const autocompleteRef = useRef<any>(null);
  const [inputText, setInputText] = useState(value.location);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setInputText(value.location);
  }, [value.location]);

  const minPickupAt = useMemo(() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  }, []);

  const dropoffAt = useMemo(
    () => addDays(value.pickupAt, value.days),
    [value.pickupAt, value.days]
  );

  const handlePickupSelect = useCallback(
    (date: Date) => {
      const clamped =
        date.getTime() < minPickupAt.getTime() ? new Date(minPickupAt) : date;
      onChange({ ...value, pickupAt: clamped });
    },
    [minPickupAt, onChange, value]
  );

  /** ===== New: handle search with auto geocode ===== */
  const handleSearch = useCallback(async () => {
    if (!value.location?.trim()) {
      alert("Please enter a location");
      return;
    }

    setSearching(true);
    try {
      let lat = value.lat;
      let lng = value.lng;
      let cityLabel = value.city;

      // Fallback geocode if coordinates missing
      if (!lat || !lng) {
        try {
          const geo = await geocodeCity(value.location);
          lat = geo.lat;
          lng = geo.lng;
          cityLabel = geo.cityLabel;

          // Update panel state with resolved coordinates
          onChange({
            ...value,
            lat,
            lng,
            city: cityLabel,
          });
        } catch (err) {
          console.warn("Geocode failed:", err);
          alert("Please select a valid location");
          setSearching(false);
          return;
        }
      }

      // Fetch cars within 15km radius
      const cars = await fetchCarsForRadius(
        process.env.EXPO_PUBLIC_API_BASE!,
        lat,
        lng,
        15
      );

      console.log("Cars found:", cars.length);

      // Callback with cars
      onPressSearch?.(cars);
    } finally {
      setSearching(false);
    }
  }, [value, onChange, onPressSearch]);

  return (
    <View style={[styles.card, SHADOW_CARD, containerStyle]}>
      <Text style={styles.title}>Find your car</Text>

      {/* LOCATION */}
      <Text style={styles.label}>Location</Text>
      <GooglePlacesAutocomplete
        ref={autocompleteRef}
        placeholder="Search city, airport, or address"
        fetchDetails
        debounce={300}
        enablePoweredByContainer={false}
        listViewDisplayed="auto"
        keepResultsAfterBlur={false}
        query={{
          key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!,
          language: "en",
          components: `country:${countryCode}`,
        }}
        onPress={(data, details) => {
          if (!details) return;

          const city =
            getAddressPart(details, "locality") ||
            getAddressPart(details, "administrative_area_level_2");
          const state = getAddressPart(details, "administrative_area_level_1");
          const country = getAddressPart(details, "country");
          const lat = details.geometry?.location?.lat;
          const lng = details.geometry?.location?.lng;
          const label = data.description;

          setInputText(label);
          setTimeout(() => {
            autocompleteRef.current?.setAddressText(label);
          }, 0);

          onChange({
            ...value,
            location: label,
            city,
            state,
            country,
            lat,
            lng,
          });
        }}
        textInputProps={{
          value: inputText,
          onChangeText: (text) => {
            setInputText(text);
            onChange({
              ...value,
              location: text,
              city: undefined,
              state: undefined,
              country: undefined,
              lat: undefined,
              lng: undefined,
            });
          },
          placeholderTextColor: "#9CA3AF",
        }}
        renderRow={(rowData) => (
          <View
            style={styles.placesRow}
            onTouchStart={() => {
              setInputText(rowData.description);
              onChange({ ...value, location: rowData.description });
            }}
          >
            <Text style={styles.placesText}>{rowData.description}</Text>
          </View>
        )}
        styles={{
          container: styles.placesContainer,
          textInput: styles.input,
          listView: styles.placesList,
          separator: { height: 0 },
        }}
      />

      {/* PICKUP */}
      <Text style={[styles.label, { marginTop: 12 }]}>Pickup date & time</Text>
      <Pressable onPress={() => setCalendarOpen(true)} style={styles.selectRow}>
        <Text style={styles.selectText}>
          {fmtPanelDateTime(value.pickupAt)}
        </Text>
        <Text style={styles.selectHint}>Change</Text>
      </Pressable>

      {/* DAYS */}
      <Text style={[styles.label, { marginTop: 12 }]}>Trip length</Text>
      <Pressable onPress={() => setDaysOpen(true)} style={styles.selectRow}>
        <Text style={styles.selectText}>
          {value.days} {value.days === 1 ? "day" : "days"}
        </Text>
        <Text style={styles.selectHint}>Select</Text>
      </Pressable>

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Dropoff</Text>
        <Text style={styles.previewValue}>{fmtPanelDateTime(dropoffAt)}</Text>
      </View>

      <Pressable
        onPress={handleSearch}
        style={[styles.cta, searching && { opacity: 0.7 }]}
        disabled={searching}
      >
        <Text style={styles.ctaText}>
          {searching ? "Searching..." : "Search Cars"}
        </Text>
      </Pressable>

      {/* CALENDAR MODAL */}
      <CustomCalendar
        visible={calendarOpen}
        mode="pickup"
        initialDate={value.pickupAt}
        minDate={minPickupAt}
        onClose={() => setCalendarOpen(false)}
        onSelect={handlePickupSelect}
      />

      {/* DAYS MODAL */}
      <DaysPickerModal
        visible={daysOpen}
        value={value.days}
        maxDays={30}
        onClose={() => setDaysOpen(false)}
        onSelect={(d: any) => onChange({ ...value, days: d })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.muted,
    marginBottom: 8,
  },
  placesContainer: { flex: 0, zIndex: 1000 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FBFBFD",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  placesList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
    backgroundColor: "#fff",
    zIndex: 10000,
  },
  placesRow: { padding: 2 },
  placesText: { fontSize: 13, fontWeight: "800" },
  selectRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FBFBFD",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectText: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  selectHint: { fontSize: 12, fontWeight: "800", color: COLORS.muted },
  preview: {
    marginTop: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 12,
  },
  previewLabel: { fontSize: 12, fontWeight: "800", color: COLORS.muted },
  previewValue: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },
  cta: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.black,
  },
  ctaText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
