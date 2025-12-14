import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";
import DaysPickerModal from "@/components/home/DaysPickerModal";
import { addDays, formatDateTime } from "@/lib/date";

export type HomeSearchState = {
  location: string;
  pickupAt: Date;
  days: number; // 1..30
};

// Helpers to merge date + time into one Date
function mergeDateAndTime(datePart: Date, timePart: Date) {
  const merged = new Date(datePart);
  merged.setHours(timePart.getHours());
  merged.setMinutes(timePart.getMinutes());
  merged.setSeconds(0);
  merged.setMilliseconds(0);
  return merged;
}

export default function HomeSearchPanel({
  value,
  onChange,
}: {
  value: HomeSearchState;
  onChange: (next: HomeSearchState) => void;
}) {
  const [daysOpen, setDaysOpen] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);

  // iOS temp state (separate date + time for reliability)
  const [tempDate, setTempDate] = useState<Date>(value.pickupAt);
  const [tempTime, setTempTime] = useState<Date>(value.pickupAt);

  const dropoffAt = useMemo(
    () => addDays(value.pickupAt, value.days),
    [value.pickupAt, value.days]
  );

  const openPicker = () => {
    // seed temp pickers
    setTempDate(value.pickupAt);
    setTempTime(value.pickupAt);
    setPickerOpen(true);
  };

  const closePicker = () => setPickerOpen(false);

  const applyPicker = () => {
    const merged = mergeDateAndTime(tempDate, tempTime);
    onChange({ ...value, pickupAt: merged });
    setPickerOpen(false);
  };

  // Android: use native datetime dialog (works fine)
  const onAndroidChange = (e: DateTimePickerEvent, selected?: Date) => {
    if (e.type === "dismissed") {
      setPickerOpen(false);
      return;
    }
    if (selected) onChange({ ...value, pickupAt: selected });
    setPickerOpen(false);
  };

  return (
    <View style={[styles.card, SHADOW_CARD]}>
      <Text style={styles.title}>Find your car</Text>

      {/* Location */}
      <Text style={styles.label}>Location</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value.location}
          onChangeText={(t) => onChange({ ...value, location: t })}
          placeholder="Search city, airport, or address"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          returnKeyType="search"
        />
      </View>

      {/* Pickup */}
      <Text style={[styles.label, { marginTop: 12 }]}>Pickup date & time</Text>
      <Pressable
        onPress={openPicker}
        style={styles.selectRow}
        accessibilityRole="button"
      >
        <Text style={styles.selectText}>{formatDateTime(value.pickupAt)}</Text>
        <Text style={styles.selectHint}>Change</Text>
      </Pressable>

      {/* Trip length */}
      <Text style={[styles.label, { marginTop: 12 }]}>Trip length</Text>
      <Pressable
        onPress={() => setDaysOpen(true)}
        style={styles.selectRow}
        accessibilityRole="button"
      >
        <Text style={styles.selectText}>
          {value.days} {value.days === 1 ? "day" : "days"}
        </Text>
        <Text style={styles.selectHint}>Select</Text>
      </Pressable>

      {/* Dropoff */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Dropoff</Text>
        <Text style={styles.previewValue}>{formatDateTime(dropoffAt)}</Text>
      </View>

      {/* ANDROID native picker */}
      {Platform.OS === "android" && pickerOpen ? (
        <DateTimePicker
          value={value.pickupAt}
          mode="datetime"
          display="default"
          themeVariant="light" // ✅ FORCE dark text
          onChange={onAndroidChange}
          minimumDate={new Date()}
        />
      ) : null}

      {/* iOS modal sheet picker (DATE + TIME separately) */}
      {Platform.OS === "ios" ? (
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

            {/* Calendar */}
            <Text style={styles.iosSection}>Date</Text>
            <View style={styles.iosPickerBlock}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                themeVariant="light" // ✅ FORCE dark text
                onChange={(_e, d) => d && setTempDate(d)}
                minimumDate={new Date()}
              />
            </View>

            {/* Time */}
            <Text style={styles.iosSection}>Time</Text>
            <View style={styles.iosTimeBlock}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                themeVariant="light" // ✅ FORCE dark text
                onChange={(_e, d) => d && setTempTime(d)}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      <DaysPickerModal
        visible={daysOpen}
        value={value.days}
        maxDays={30}
        onClose={() => setDaysOpen(false)}
        onSelect={(d) => onChange({ ...value, days: d })}
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

  inputWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FBFBFD",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { fontSize: 14, color: COLORS.text },

  selectRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FBFBFD",
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
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

  // iOS pageSheet
  iosSheetRoot: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 18,
    paddingHorizontal: 14,
  },
  iosHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  iosTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  iosBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  iosBtnPrimary: { backgroundColor: COLORS.black },
  iosBtnText: { fontSize: 12, fontWeight: "900", color: COLORS.text },
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
    height: 180, // ensures spinner has space
    justifyContent: "center",
  },
  iosPicker: {
    alignSelf: "stretch",
  },
});
