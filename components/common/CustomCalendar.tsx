import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS } from "@/theme/ui";

type CalendarProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (pickup: Date, dropoff: Date) => void;
  initialPickup?: Date;
  initialDropoff?: Date;
  mode?: "pickup" | "return";
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

export default function CustomCalendar({
  visible,
  onClose,
  onSelect,
  initialPickup,
  initialDropoff,
  mode = "pickup",
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickupDate, setPickupDate] = useState<Date | null>(
    initialPickup || null
  );
  const [dropoffDate, setDropoffDate] = useState<Date | null>(
    initialDropoff || null
  );
  const [editingTime, setEditingTime] = useState<"pickup" | "dropoff" | null>(
    null
  );
  const [pickupTime, setPickupTime] = useState({
    hour: (initialPickup?.getHours() ?? 10) % 12 || 10,
    minute: initialPickup?.getMinutes() ?? 30,
    period: (initialPickup?.getHours() ?? 10) >= 12 ? "pm" : "am",
  });
  const [dropoffTime, setDropoffTime] = useState({
    hour: (initialDropoff?.getHours() ?? 17) % 12 || 5,
    minute: initialDropoff?.getMinutes() ?? 30,
    period: (initialDropoff?.getHours() ?? 17) >= 12 ? "pm" : "am",
  });

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 1, day),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  }, [currentMonth]);

  const handleDayPress = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;

    if (mode === "pickup" || !pickupDate) {
      setPickupDate(date);
      setDropoffDate(null);
    } else if (!dropoffDate) {
      if (date >= pickupDate) {
        setDropoffDate(date);
      } else {
        setPickupDate(date);
        setDropoffDate(null);
      }
    } else {
      setPickupDate(date);
      setDropoffDate(null);
    }
  };

  const isInRange = (date: Date) => {
    if (!pickupDate || !dropoffDate) return false;
    return date > pickupDate && date < dropoffDate;
  };

  const isPickup = (date: Date) => {
    return pickupDate && date.toDateString() === pickupDate.toDateString();
  };

  const isDropoff = (date: Date) => {
    return dropoffDate && date.toDateString() === dropoffDate.toDateString();
  };

  const handleDone = () => {
    const finalPickup = pickupDate || new Date();
    const finalDropoff =
      dropoffDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const pickup = new Date(finalPickup);
    pickup.setHours(
      pickupTime.period === "pm" && pickupTime.hour !== 12
        ? pickupTime.hour + 12
        : pickupTime.hour === 12 && pickupTime.period === "am"
        ? 0
        : pickupTime.hour,
      pickupTime.minute,
      0,
      0
    );

    const dropoff = new Date(finalDropoff);
    dropoff.setHours(
      dropoffTime.period === "pm" && dropoffTime.hour !== 12
        ? dropoffTime.hour + 12
        : dropoffTime.hour === 12 && dropoffTime.period === "am"
        ? 0
        : dropoffTime.hour,
      dropoffTime.minute,
      0,
      0
    );

    onSelect(pickup, dropoff);
    onClose();
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const updateTime = (
    type: "pickup" | "dropoff",
    field: "hour" | "minute" | "period",
    value: number | string
  ) => {
    if (type === "pickup") {
      setPickupTime((prev) => ({ ...prev, [field]: value }));
    } else {
      setDropoffTime((prev) => ({ ...prev, [field]: value }));
    }
  };

  if (editingTime) {
    const time = editingTime === "pickup" ? pickupTime : dropoffTime;
    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text style={styles.title}>Select Time</Text>

            <View style={styles.timePickerRow}>
              <ScrollView
                style={styles.timePicker}
                showsVerticalScrollIndicator={false}
              >
                {hours.map((h) => (
                  <Pressable
                    key={h}
                    style={[
                      styles.timeOption,
                      time.hour === h && styles.timeOptionActive,
                    ]}
                    onPress={() => updateTime(editingTime, "hour", h)}
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
                ))}
              </ScrollView>

              <Text style={styles.timeSeparator}>:</Text>

              <ScrollView
                style={styles.timePicker}
                showsVerticalScrollIndicator={false}
              >
                {minutes.map((m) => (
                  <Pressable
                    key={m}
                    style={[
                      styles.timeOption,
                      time.minute === m && styles.timeOptionActive,
                    ]}
                    onPress={() => updateTime(editingTime, "minute", m)}
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
                ))}
              </ScrollView>

              <View style={styles.periodPicker}>
                <Pressable
                  style={[
                    styles.periodBtn,
                    time.period === "am" && styles.periodBtnActive,
                  ]}
                  onPress={() => updateTime(editingTime, "period", "am")}
                >
                  <Text
                    style={[
                      styles.periodText,
                      time.period === "am" && styles.periodTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.periodBtn,
                    time.period === "pm" && styles.periodBtnActive,
                  ]}
                  onPress={() => updateTime(editingTime, "period", "pm")}
                >
                  <Text
                    style={[
                      styles.periodText,
                      time.period === "pm" && styles.periodTextActive,
                    ]}
                  >
                    PM
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.btnCancel}
                onPress={() => setEditingTime(null)}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.btnDone}
                onPress={() => setEditingTime(null)}
              >
                <Text style={styles.btnDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Time</Text>

          <View style={styles.timeRow}>
            <Pressable
              style={[styles.timeBox, styles.timeBoxActive]}
              onPress={() => setEditingTime("pickup")}
            >
              <Feather name="clock" size={16} color={COLORS.white} />
              <Text style={styles.timeColon}>:</Text>
              <Text style={styles.timeText}>
                {String(pickupTime.hour).padStart(2, "0")}
              </Text>
              <Text style={styles.timeColon}>:</Text>
              <Text style={styles.timeText}>
                {String(pickupTime.minute).padStart(2, "0")}
              </Text>
              <Text style={styles.timePeriod}>{pickupTime.period}</Text>
            </Pressable>

            <Pressable
              style={styles.timeBox}
              onPress={() => setEditingTime("dropoff")}
            >
              <Feather name="clock" size={16} color={COLORS.text} />
              <Text style={[styles.timeColon, { color: COLORS.text }]}>:</Text>
              <Text style={[styles.timeText, { color: COLORS.text }]}>
                {String(dropoffTime.hour).padStart(2, "0")}
              </Text>
              <Text style={[styles.timeColon, { color: COLORS.text }]}>:</Text>
              <Text style={[styles.timeText, { color: COLORS.text }]}>
                {String(dropoffTime.minute).padStart(2, "0")}
              </Text>
              <Text style={[styles.timePeriod, { color: COLORS.text }]}>
                {dropoffTime.period}
              </Text>
            </Pressable>
          </View>

          <View style={styles.monthHeader}>
            <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={8}>
              <Feather name="chevron-left" size={20} color={COLORS.text} />
            </Pressable>
            <Text style={styles.monthText}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={8}>
              <Feather name="chevron-right" size={20} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={styles.daysHeader}>
            {DAYS.map((day) => (
              <Text key={day} style={styles.dayLabel}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendar}>
            {calendarDays.map(({ day, isCurrentMonth, date }, idx) => {
              const inRange = isInRange(date);
              const isPickupDay = isPickup(date);
              const isDropoffDay = isDropoff(date);
              const isSelected = isPickupDay || isDropoffDay;

              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.dayCell,
                    inRange && styles.dayCellInRange,
                    isSelected && styles.dayCellSelected,
                  ]}
                  onPress={() => handleDayPress(date, isCurrentMonth)}
                  disabled={!isCurrentMonth}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dayTextFaded,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {String(day).padStart(2, "0")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnDone, !pickupDate && styles.btnDisabled]}
              onPress={handleDone}
              disabled={!pickupDate}
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
    maxWidth: 420,
    maxHeight: "90%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  timeBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
  },
  timeBoxActive: {
    backgroundColor: COLORS.black,
  },
  timeColon: {
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.white,
  },
  timeText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
  },
  timePeriod: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
    marginLeft: 4,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navBtn: {
    padding: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  daysHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  dayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dayCellInRange: {
    backgroundColor: "#F0F0F0",
  },
  dayCellSelected: {
    backgroundColor: COLORS.black,
    borderRadius: 50,
  },
  dayText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  dayTextFaded: {
    color: "#CCCCCC",
  },
  dayTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  timePicker: {
    flex: 1,
    maxHeight: 200,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: COLORS.bg,
  },
  timeOptionActive: {
    backgroundColor: COLORS.black,
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  timeOptionTextActive: {
    color: COLORS.white,
  },
  periodPicker: {
    gap: 8,
  },
  periodBtn: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.bg,
  },
  periodBtnActive: {
    backgroundColor: COLORS.black,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  periodTextActive: {
    color: COLORS.white,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  btnDone: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.black,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnDoneText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
});
