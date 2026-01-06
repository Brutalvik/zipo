import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "@/theme/ui";

type CalendarProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  initialDate?: Date;
  mode: "pickup" | "return";
  disabledDates?: Date[];
  minDate?: Date;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const OPTION_HEIGHT = 44;

export default function CustomCalendar({
  visible,
  onClose,
  onSelect,
  initialDate,
  mode,
  disabledDates = [],
  minDate,
}: CalendarProps) {
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate || null
  );
  const [editingTime, setEditingTime] = useState(false);

  // Calculate +2 hours from now, rounded to nearest 5 mins
  const getInitialTimeState = () => {
    if (initialDate) {
      return {
        hour: initialDate.getHours() % 12 || 12,
        minute: (Math.round(initialDate.getMinutes() / 5) * 5) % 60,
        period: initialDate.getHours() >= 12 ? "pm" : "am",
      };
    }
    const date = new Date();
    date.setHours(date.getHours() + 2);
    // Round minutes to nearest 5
    const roundedMins = Math.ceil(date.getMinutes() / 5) * 5;
    if (roundedMins === 60) {
      date.setHours(date.getHours() + 1);
      date.setMinutes(0);
    } else {
      date.setMinutes(roundedMins);
    }

    return {
      hour: date.getHours() % 12 || 12,
      minute: date.getMinutes(),
      period: date.getHours() >= 12 ? "pm" : "am",
    };
  };

  const [time, setTime] = useState(getInitialTimeState());

  // Center the time picker on open based on the calculated +2h
  useEffect(() => {
    if (editingTime) {
      setTimeout(() => {
        hourScrollRef.current?.scrollTo({
          y: (time.hour - 1) * OPTION_HEIGHT,
          animated: true,
        });
        minuteScrollRef.current?.scrollTo({
          y: (time.minute / 5) * OPTION_HEIGHT,
          animated: true,
        });
      }, 100);
    }
  }, [editingTime]);

  const isTimeDisabled = (h: number, m: number, p: string) => {
    const now = new Date();
    const minTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const isToday = selectedDate
      ? selectedDate.toDateString() === now.toDateString()
      : true;

    if (!isToday) return false;

    let selectedH = h;
    if (p === "pm" && h !== 12) selectedH += 12;
    if (p === "am" && h === 12) selectedH = 0;

    const check = new Date(now);
    check.setHours(selectedH, m, 0, 0);
    return check < minTime;
  };

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }
    return days;
  }, [currentMonth]);

  const handleDone = () => {
    if (!selectedDate) return;
    const final = new Date(selectedDate);
    let h = time.hour;
    if (time.period === "pm" && h !== 12) h += 12;
    if (time.period === "am" && h === 12) h = 0;
    final.setHours(h, time.minute, 0, 0);
    onSelect(final);
    onClose();
  };

  if (editingTime) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.title}>{mode} Time</Text>
            <View style={styles.disclaimerBox}>
              <Feather name="info" size={14} color="#666" />
              <Text style={styles.disclaimerText}>
                Note: A 2-hour buffer is required for car maintenance and
                preparation.
              </Text>
            </View>
            <View style={styles.timePickerRow}>
              <ScrollView
                ref={hourScrollRef}
                style={styles.timePicker}
                showsVerticalScrollIndicator={false}
                snapToInterval={OPTION_HEIGHT}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => {
                  const disabled = isTimeDisabled(h, time.minute, time.period);
                  return (
                    <Pressable
                      key={h}
                      disabled={disabled}
                      style={[
                        styles.timeOption,
                        time.hour === h && styles.timeOptionActive,
                        disabled && { opacity: 0.15 },
                      ]}
                      onPress={() => setTime((p) => ({ ...p, hour: h }))}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          time.hour === h && styles.timeOptionTextActive,
                        ]}
                      >
                        {String(h).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.timeSeparator}>:</Text>
              <ScrollView
                ref={minuteScrollRef}
                style={styles.timePicker}
                showsVerticalScrollIndicator={false}
                snapToInterval={OPTION_HEIGHT}
              >
                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => {
                  const disabled = isTimeDisabled(time.hour, m, time.period);
                  return (
                    <Pressable
                      key={m}
                      disabled={disabled}
                      style={[
                        styles.timeOption,
                        time.minute === m && styles.timeOptionActive,
                        disabled && { opacity: 0.15 },
                      ]}
                      onPress={() => setTime((p) => ({ ...p, minute: m }))}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          time.minute === m && styles.timeOptionTextActive,
                        ]}
                      >
                        {String(m).padStart(2, "0")}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.periodPicker}>
                {["am", "pm"].map((p) => {
                  const disabled = isTimeDisabled(time.hour, time.minute, p);
                  return (
                    <Pressable
                      key={p}
                      disabled={disabled}
                      style={[
                        styles.periodBtn,
                        time.period === p && styles.periodBtnActive,
                        disabled && { opacity: 0.15 },
                      ]}
                      onPress={() =>
                        setTime((prev) => ({
                          ...prev,
                          period: p as "am" | "pm",
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.periodText,
                          time.period === p && styles.periodTextActive,
                        ]}
                      >
                        {p.toUpperCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Pressable
              style={styles.btnDoneWide}
              onPress={() => setEditingTime(false)}
            >
              <Text style={styles.btnDoneText}>Confirm Time</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{mode} Time</Text>
          <Pressable
            style={styles.timeBox}
            onPress={() => setEditingTime(true)}
          >
            <Feather name="clock" size={16} color={COLORS.white} />
            <Text style={styles.timeText}>
              {String(time.hour).padStart(2, "0")}:
              {String(time.minute).padStart(2, "0")} {time.period.toUpperCase()}
            </Text>
          </Pressable>

          <Text style={[styles.title, { marginTop: 24 }]}>{mode} Date</Text>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() - 1
                  )
                )
              }
              hitSlop={10}
            >
              <Feather name="chevron-left" size={20} />
            </Pressable>
            <Text style={styles.monthText}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable
              onPress={() =>
                setCurrentMonth(
                  new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth() + 1
                  )
                )
              }
              hitSlop={10}
            >
              <Feather name="chevron-right" size={20} />
            </Pressable>
          </View>

          <View style={styles.daysHeader}>
            {DAYS.map((d) => (
              <Text key={d} style={styles.dayLabel}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calendar}>
            {calendarDays.map(({ day, isCurrentMonth, date }, idx) => {
              const checkDate = new Date(date).setHours(0, 0, 0, 0);
              const todayVal = new Date().setHours(0, 0, 0, 0);
              const limit = minDate
                ? new Date(minDate).setHours(0, 0, 0, 0)
                : todayVal;

              const isSelected =
                selectedDate?.toDateString() === date.toDateString();
              const isToday = new Date().toDateString() === date.toDateString();
              const isPast = checkDate < limit;
              const isUnavailable = disabledDates.some(
                (d) => d.toDateString() === date.toDateString()
              );
              const isDisabled = isPast || isUnavailable || !isCurrentMonth;

              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.todayBorder,
                  ]}
                  onPress={() => !isDisabled && setSelectedDate(date)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dayTextFaded,
                      isPast && isCurrentMonth && { color: "#e0e0e0" },
                      isUnavailable && isCurrentMonth && { color: "#ccc" },
                      isSelected && styles.dayTextSelected,
                      isToday &&
                        !isSelected && {
                          color: COLORS.black,
                          fontWeight: "800",
                        },
                    ]}
                  >
                    {String(day).padStart(2, "0")}
                  </Text>
                  {isUnavailable && isCurrentMonth && (
                    <View style={styles.disabledStrike} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnDone, !selectedDate && styles.btnDisabled]}
              onPress={handleDone}
              disabled={!selectedDate}
            >
              <Text style={styles.btnDoneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  disclaimerBox: {
    flexDirection: "row",
    backgroundColor: "#F9F9F9",
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  disclaimerText: { fontSize: 11, color: "#888", flex: 1, lineHeight: 14 },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.black,
  },
  timeText: { fontSize: 16, fontWeight: "600", color: COLORS.white },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 5,
  },
  monthText: { fontSize: 16, fontWeight: "700" },
  daysHeader: { flexDirection: "row", marginBottom: 10 },
  dayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#aaa",
  },
  calendar: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dayCellSelected: { backgroundColor: COLORS.black, borderRadius: 100 },
  todayBorder: {
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: 100,
  },
  dayText: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  dayTextFaded: { color: "#f5f5f5" },
  dayTextSelected: { color: COLORS.white, fontWeight: "700" },
  disabledStrike: {
    position: "absolute",
    width: "40%",
    height: 1.5,
    backgroundColor: "#bbb",
    transform: [{ rotate: "-45deg" }],
    top: "48%",
    left: "30%",
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 180,
    marginBottom: 20,
  },
  timePicker: { flex: 1 },
  timeSeparator: { fontSize: 20, fontWeight: "700" },
  timeOption: {
    height: OPTION_HEIGHT,
    justifyContent: "center",
    borderRadius: 8,
    alignItems: "center",
  },
  timeOptionActive: { backgroundColor: COLORS.black },
  timeOptionText: { fontSize: 16, color: COLORS.text },
  timeOptionTextActive: { color: COLORS.white, fontWeight: "700" },
  periodPicker: { gap: 8 },
  periodBtn: { padding: 12, borderRadius: 10, backgroundColor: "#f5f5f5" },
  periodBtnActive: { backgroundColor: COLORS.black },
  periodText: { fontSize: 12, fontWeight: "700", color: COLORS.text },
  periodTextActive: { color: COLORS.white },
  actions: { flexDirection: "row", gap: 12 },
  btnCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  btnCancelText: { fontWeight: "700", color: COLORS.text },
  btnDone: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.black,
    alignItems: "center",
  },
  btnDoneWide: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.black,
    alignItems: "center",
    width: "100%",
  },
  btnDoneText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.2 },
});
