import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import DaysPickerModal from "@/components/DaysPickerModal";
import { addDays } from "@/lib/date";
import AndroidDateTimeSheet from "@/components/home/AndroidDateTimeSheet";

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

function mergeDateAndTime(datePart: Date, timePart: Date) {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours());
  merged.setMinutes(timePart.getMinutes());
  merged.setSeconds(0);
  merged.setMilliseconds(0);
  return merged;
}

function fmtPanelDateTime(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const MMM = d.toLocaleString("en-US", { month: "short" });
  const yyyy = d.getFullYear();

  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  return `${dd}-${MMM}-${yyyy} - ${h}:${m} ${ampm}`;
}

export default function HomeSearchPanel({
  value,
  onChange,
  onPressSearch,
  containerStyle,
}: {
  value: HomeSearchState;
  onChange: (next: HomeSearchState) => void;
  onPressSearch: () => void;
  containerStyle?: any;
}) {
  const [daysOpen, setDaysOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [tempDate, setTempDate] = useState<Date>(value.pickupAt);
  const [tempTime, setTempTime] = useState<Date>(value.pickupAt);

  const minPickupAt = useMemo(() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  }, []);

  const clampPickup = (d: Date) => {
    if (d.getTime() < minPickupAt.getTime()) return new Date(minPickupAt);
    return d;
  };

  const dropoffAt = useMemo(
    () => addDays(value.pickupAt, value.days),
    [value.pickupAt, value.days]
  );

  const openPicker = () => {
    if (Platform.OS === "android") {
      setPickerOpen(true);
      return;
    }
    setTempDate(value.pickupAt);
    setTempTime(value.pickupAt);
    setPickerOpen(true);
  };

  const closePicker = () => setPickerOpen(false);

  const applyPicker = () => {
    const merged = mergeDateAndTime(tempDate, tempTime);
    onChange({ ...value, pickupAt: clampPickup(merged) });
    setPickerOpen(false);
  };

  const onAndroidChange = (e: DateTimePickerEvent, selected?: Date) => {
    if (e.type === "dismissed") {
      setPickerOpen(false);
      return;
    }
    if (selected) onChange({ ...value, pickupAt: clampPickup(selected) });
    setPickerOpen(false);
  };

  return (
    <View style={[styles.card, SHADOW_CARD, containerStyle]}>
      <Text style={styles.title}>Find your car</Text>

      {/* LOCATION */}
      <Text style={styles.label}>Location</Text>
      <GooglePlacesAutocomplete
        placeholder="Search city, airport, or address"
        fetchDetails
        debounce={300}
        enablePoweredByContainer={false}
        query={{
          key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!,
          language: "en",
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

          const label = city && state ? `${city}, ${state}` : data.description;

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
          value: value.location,
          onChangeText: (text) => {
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
        styles={{
          container: styles.placesContainer,
          textInput: styles.input,
          listView: styles.placesList,
          row: styles.placesRow,
          description: styles.placesText,
        }}
      />

      {/* PICKUP */}
      <Text style={[styles.label, { marginTop: 12 }]}>Pickup date & time</Text>
      <Pressable onPress={openPicker} style={styles.selectRow}>
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

      <Pressable onPress={onPressSearch} style={styles.cta}>
        <Text style={styles.ctaText}>Search Cars</Text>
      </Pressable>

      {/* Android picker */}
      {Platform.OS === "android" && (
        <AndroidDateTimeSheet
          visible={pickerOpen}
          value={value.pickupAt}
          onClose={() => setPickerOpen(false)}
          onConfirm={(merged) => {
            onChange({ ...value, pickupAt: clampPickup(merged) });
            setPickerOpen(false);
          }}
        />
      )}

      {/* iOS picker */}
      {Platform.OS === "ios" && (
        <Modal
          visible={pickerOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closePicker}
        >
          <View style={styles.iosSheetRoot}>
            <View style={styles.iosHeader}>
              <Pressable onPress={closePicker} style={styles.iosBtn}>
                <Text style={styles.iosBtnText}>Cancel</Text>
              </Pressable>

              <Text style={styles.iosTitle}>Pickup</Text>

              <Pressable
                onPress={applyPicker}
                style={[styles.iosBtn, styles.iosBtnPrimary]}
              >
                <Text style={[styles.iosBtnText, styles.iosBtnTextPrimary]}>
                  Done
                </Text>
              </Pressable>
            </View>

            <Text style={styles.iosSection}>Date</Text>
            <View style={styles.iosPickerBlock}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                onChange={(_e, d) => d && setTempDate(d)}
                minimumDate={minPickupAt}
              />
            </View>

            <Text style={styles.iosSection}>Time</Text>
            <View style={styles.iosTimeBlock}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={(_e, d) => d && setTempTime(d)}
              />
            </View>
          </View>
        </Modal>
      )}

      <DaysPickerModal
        visible={daysOpen}
        value={value.days}
        maxDays={30}
        onClose={() => setDaysOpen(false)}
        onSelect={(d: number) => onChange({ ...value, days: d })}
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

  placesContainer: { flex: 0 },
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
  },
  placesRow: { padding: 12 },
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

  iosSheetRoot: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 18,
    paddingHorizontal: 14,
  },
  iosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  iosTitle: { fontSize: 14, fontWeight: "900" },
  iosBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  iosBtnPrimary: { backgroundColor: COLORS.black },
  iosBtnText: { fontSize: 12, fontWeight: "900" },
  iosBtnTextPrimary: { color: COLORS.white },

  iosSection: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.muted,
  },
  iosPickerBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FBFBFD",
  },
  iosTimeBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FBFBFD",
    height: 180,
    justifyContent: "center",
  },
});
