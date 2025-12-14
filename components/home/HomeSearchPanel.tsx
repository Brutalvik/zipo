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
  resultCount,
  onPressSearch,
}: {
  value: HomeSearchState;
  onChange: (next: HomeSearchState) => void;
  resultCount: number;
  onPressSearch: () => void;
}) {
  const [daysOpen, setDaysOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [tempDate, setTempDate] = useState<Date>(value.pickupAt);
  const [tempTime, setTempTime] = useState<Date>(value.pickupAt);

  const dropoffAt = useMemo(
    () => addDays(value.pickupAt, value.days),
    [value.pickupAt, value.days]
  );

  const openPicker = () => {
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

  const onAndroidChange = (e: DateTimePickerEvent, selected?: Date) => {
    if (e.type === "dismissed") {
      setPickerOpen(false);
      return;
    }
    if (selected) onChange({ ...value, pickupAt: selected });
    setPickerOpen(false);
  };

  const city = value.location.trim() || "your area";
  const prettyCount = resultCount === 1 ? "1 car" : `${resultCount} cars`;

  return (
    <View style={[styles.card, SHADOW_CARD]}>
      <Text style={styles.title}>Find your car</Text>

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

      <Text style={[styles.label, { marginTop: 12 }]}>Pickup date & time</Text>
      <Pressable onPress={openPicker} style={styles.selectRow}>
        <Text style={styles.selectText}>{formatDateTime(value.pickupAt)}</Text>
        <Text style={styles.selectHint}>Change</Text>
      </Pressable>

      <Text style={[styles.label, { marginTop: 12 }]}>Trip length</Text>
      <Pressable onPress={() => setDaysOpen(true)} style={styles.selectRow}>
        <Text style={styles.selectText}>
          {value.days} {value.days === 1 ? "day" : "days"}
        </Text>
        <Text style={styles.selectHint}>Select</Text>
      </Pressable>

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Dropoff</Text>
        <Text style={styles.previewValue}>{formatDateTime(dropoffAt)}</Text>
      </View>

      {/* ✅ LIVE RESULT COUNT (high contrast) */}
      <View style={styles.countRow}>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{prettyCount}</Text>
        </View>
        <Text style={styles.countText}>available in {city}</Text>
      </View>

      <Pressable onPress={onPressSearch} style={styles.cta}>
        <Text style={styles.ctaText}>Search Cars</Text>
      </Pressable>

      {/* Android native picker */}
      {Platform.OS === "android" && pickerOpen ? (
        <DateTimePicker
          value={value.pickupAt}
          mode="datetime"
          display="default"
          onChange={onAndroidChange}
          minimumDate={new Date()}
        />
      ) : null}

      {/* iOS pageSheet */}
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

            <Text style={styles.iosSection}>Date</Text>
            <View style={styles.iosPickerBlock}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                themeVariant="light"
                onChange={(_e, d) => d && setTempDate(d)}
                minimumDate={new Date()}
              />
            </View>

            <Text style={styles.iosSection}>Time</Text>
            <View style={styles.iosTimeBlock}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                themeVariant="light"
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

  countRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countBadge: {
    backgroundColor: COLORS.black,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countBadgeText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  countText: { color: COLORS.text, fontSize: 12, fontWeight: "800" },

  cta: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
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
    height: 180,
    justifyContent: "center",
  },
});
