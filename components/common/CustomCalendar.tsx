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
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickupDate, setPickupDate] = useState<Date | null>(
    initialPickup || null
  );
  const [dropoffDate, setDropoffDate] = useState<Date | null>(
    initialDropoff || null
  );
  const [pickupTime, setPickupTime] = useState({
    hour: 10,
    minute: 30,
    period: "am",
  });
  const [dropoffTime, setDropoffTime] = useState({
    hour: 5,
    minute: 30,
    period: "pm",
  });

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 1, day),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Next month days to fill the grid
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

    if (!pickupDate || (pickupDate && dropoffDate)) {
      setPickupDate(date);
      setDropoffDate(null);
    } else if (date >= pickupDate) {
      setDropoffDate(date);
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
    if (pickupDate && dropoffDate) {
      const pickup = new Date(pickupDate);
      pickup.setHours(
        pickupTime.period === "pm" && pickupTime.hour !== 12
          ? pickupTime.hour + 12
          : pickupTime.hour === 12 && pickupTime.period === "am"
          ? 0
          : pickupTime.hour,
        pickupTime.minute
      );

      const dropoff = new Date(dropoffDate);
      dropoff.setHours(
        dropoffTime.period === "pm" && dropoffTime.hour !== 12
          ? dropoffTime.hour + 12
          : dropoffTime.hour === 12 && dropoffTime.period === "am"
          ? 0
          : dropoffTime.hour,
        dropoffTime.minute
      );

      onSelect(pickup, dropoff);
      onClose();
    }
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Time</Text>

          <View style={styles.timeRow}>
            <View style={[styles.timeBox, styles.timeBoxActive]}>
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
            </View>

            <View style={styles.timeBox}>
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
            </View>
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
              style={[
                styles.btnDone,
                (!pickupDate || !dropoffDate) && styles.btnDisabled,
              ]}
              onPress={handleDone}
              disabled={!pickupDate || !dropoffDate}
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
