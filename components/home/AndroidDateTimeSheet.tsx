import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

function toYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function clampDate(d: Date, min: Date, max: Date) {
  return new Date(
    Math.max(min.getTime(), Math.min(max.getTime(), d.getTime()))
  );
}

function roundTo5(min: number) {
  const snapped = Math.round(min / 5) * 5;
  return (snapped + 60) % 60;
}

function snapTimeTo5(date: Date) {
  const x = new Date(date);
  const m = x.getMinutes();
  const snapped = roundTo5(m);

  // if rounding pushes to 60, carry hour forward
  if (snapped === 0 && m >= 58) {
    x.setHours((x.getHours() + 1) % 24);
  }
  x.setMinutes(snapped, 0, 0);
  return x;
}

export default function AndroidDateTimeSheet({
  visible,
  value,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onConfirm: (next: Date) => void;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDay = useMemo(() => addDays(today, 365), [today]);

  const minDateStr = useMemo(() => toYMD(today), [today]);
  const maxDateStr = useMemo(() => toYMD(maxDay), [maxDay]);

  const [date, setDate] = useState<Date>(today);
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);

  // ✅ When opening: clamp to [today..today+365] AND snap minutes to 5
  useEffect(() => {
    if (!visible) return;

    const clamped = clampDate(value, today, maxDay);
    const snapped = snapTimeTo5(clamped);

    setDate(startOfDay(snapped));
    setHour(snapped.getHours());
    setMinute(snapped.getMinutes());
  }, [visible, value, today, maxDay]);

  const marked = useMemo(() => {
    const key = toYMD(date);
    return { [key]: { selected: true, selectedColor: COLORS.black } };
  }, [date]);

  const apply = () => {
    // merge selected date + time
    const merged = new Date(date);
    merged.setHours(hour);
    merged.setMinutes(minute);
    merged.setSeconds(0);
    merged.setMilliseconds(0);

    // ✅ enforce 5-min intervals + clamp window
    const snapped = snapTimeTo5(merged);
    const clamped = clampDate(snapped, today, maxDay);

    onConfirm(clamped);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, SHADOW_CARD]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.btn}>
              <Text style={styles.btnText}>Cancel</Text>
            </Pressable>

            <Text style={styles.title}>Pickup</Text>

            <Pressable onPress={apply} style={[styles.btn, styles.btnPrimary]}>
              <Text style={[styles.btnText, styles.btnTextPrimary]}>Done</Text>
            </Pressable>
          </View>

          <Calendar
            markedDates={marked}
            onDayPress={(d) => {
              // clamp date selection to [today..today+365]
              const picked = new Date(`${d.dateString}T00:00:00`);
              const clamped = clampDate(picked, today, maxDay);
              setDate(startOfDay(clamped));
            }}
            minDate={minDateStr}
            maxDate={maxDateStr}
            style={styles.calendar}
            theme={{
              backgroundColor: COLORS.white,
              calendarBackground: COLORS.white,
              textSectionTitleColor: COLORS.muted,
              dayTextColor: COLORS.text,
              monthTextColor: COLORS.text,
              textDisabledColor: "#D1D5DB",
              arrowColor: COLORS.text,
              selectedDayTextColor: COLORS.white,
              todayTextColor: COLORS.black,
            }}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Hour</Text>
              <View style={styles.stepRow}>
                <Pressable
                  onPress={() => setHour((h) => (h + 23) % 24)}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.stepTxt}>−</Text>
                </Pressable>

                <Text style={styles.timeVal}>
                  {String(hour).padStart(2, "0")}
                </Text>

                <Pressable
                  onPress={() => setHour((h) => (h + 1) % 24)}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.stepTxt}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.miniHint}>24-hour clock</Text>
            </View>

            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Min</Text>
              <View style={styles.stepRow}>
                <Pressable
                  onPress={() => setMinute((m) => (m + 55) % 60)} // -5
                  style={styles.stepBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.stepTxt}>−</Text>
                </Pressable>

                <Text style={styles.timeVal}>
                  {String(minute).padStart(2, "0")}
                </Text>

                <Pressable
                  onPress={() => setMinute((m) => (m + 5) % 60)} // +5
                  style={styles.stepBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.stepTxt}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.miniHint}>5-minute intervals</Text>
            </View>
          </View>

          <Text style={styles.rangeHint}>
            Booking window: today → 365 days ahead
          </Text>

          <View style={{ height: 10 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)", // ✅ subtle polish
  },
  title: { fontSize: 14, fontWeight: "900", color: COLORS.text },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 9, // ✅ slightly tighter
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  btnPrimary: { backgroundColor: COLORS.black },
  btnText: { fontSize: 12, fontWeight: "900", color: COLORS.text },
  btnTextPrimary: { color: COLORS.white },

  calendar: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  timeRow: {
    marginTop: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 12,
  },
  timeBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 12,
    backgroundColor: "#FBFBFD",
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.muted,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepBtn: {
    width: 36, // ✅ smaller than 44
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  stepTxt: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  timeVal: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  miniHint: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
  },
  rangeHint: {
    marginTop: 10,
    paddingHorizontal: 14,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
  },
});
