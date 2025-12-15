import React, { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, SHADOW_CARD } from "@/theme/ui";

type DateLike = Date | string | number | null | undefined;

type Props = {
  visible: boolean;
  value: DateLike; // <-- now supports string/number too
  timeLabel?: string;
  unavailableDates?: string[]; // YYYY-MM-DD
  onClose: () => void;
  onSelect: (date: Date) => void;
};

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isValidDate(d: any): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function normalizeDate(input: DateLike): Date | null {
  if (isValidDate(input)) return input;
  if (typeof input === "number") {
    const d = new Date(input);
    return isValidDate(d) ? d : null;
  }
  if (typeof input === "string") {
    // supports "YYYY-MM-DD" or ISO strings
    const d = new Date(input);
    return isValidDate(d) ? d : null;
  }
  return null;
}

function startOfMonthSafe(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthTitle(d: Date) {
  const months = [
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
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function DaysPickerModal({
  visible,
  value,
  timeLabel = "10 : 30 am",
  unavailableDates = [],
  onClose,
  onSelect,
}: Props) {
  const unavailableSet = useMemo(
    () => new Set(unavailableDates),
    [unavailableDates]
  );

  const normalizedValue = useMemo(() => normalizeDate(value), [value]);

  // month being viewed (always a valid Date)
  const [cursorMonth, setCursorMonth] = useState<Date>(() => {
    const base = normalizedValue ?? new Date();
    return startOfMonthSafe(base);
  });

  // temp selection
  const [temp, setTemp] = useState<Date | null>(normalizedValue);

  useEffect(() => {
    if (!visible) return;
    const base = normalizedValue ?? new Date();
    setTemp(normalizedValue);
    setCursorMonth(startOfMonthSafe(base));
  }, [visible, normalizedValue]);

  const daysGrid = useMemo(() => {
    const first = startOfMonthSafe(cursorMonth);
    const last = endOfMonth(cursorMonth);
    const leadingBlanks = first.getDay();
    const totalDays = last.getDate();

    const cells: Array<{ kind: "blank" } | { kind: "day"; date: Date }> = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push({ kind: "blank" });

    for (let day = 1; day <= totalDays; day++) {
      cells.push({
        kind: "day",
        date: new Date(first.getFullYear(), first.getMonth(), day),
      });
    }

    while (cells.length % 7 !== 0) cells.push({ kind: "blank" });

    return cells;
  }, [cursorMonth]);

  const handleDone = () => {
    if (temp) onSelect(temp);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.card, SHADOW_CARD]}>
          <Text style={styles.sectionLabel}>Time</Text>

          <View style={styles.timeRow}>
            <View style={styles.timePill}>
              <Text style={styles.timeIcon}>🕒</Text>
              <Text style={styles.timeText}>{timeLabel}</Text>
            </View>
          </View>

          <View style={styles.monthHeader}>
            <Pressable
              onPress={() => setCursorMonth((m) => addMonths(m, -1))}
              style={styles.arrowBtn}
            >
              <Text style={styles.arrow}>‹</Text>
            </Pressable>

            <Text style={styles.monthTitle}>{monthTitle(cursorMonth)}</Text>

            <Pressable
              onPress={() => setCursorMonth((m) => addMonths(m, 1))}
              style={styles.arrowBtn}
            >
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEK.map((w) => (
              <Text key={w} style={styles.weekDay}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.grid}>
            {daysGrid.map((cell, idx) => {
              if (cell.kind === "blank")
                return <View key={`b-${idx}`} style={styles.cell} />;

              const d = cell.date;
              const key = toKey(d);
              const isUnavailable = unavailableSet.has(key);
              const isSelected = temp ? sameDay(temp, d) : false;

              return (
                <Pressable
                  key={key}
                  disabled={isUnavailable}
                  onPress={() => setTemp(d)}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isUnavailable && styles.dayTextUnavailable,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable onPress={handleDone} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CARD_W = 330;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  card: {
    width: "100%",
    maxWidth: CARD_W,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 10,
  },
  timeRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "#111315",
  },
  timeIcon: { marginRight: 8, fontSize: 14 },
  timeText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: 0.2,
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { fontSize: 20, fontWeight: "900", color: COLORS.text, opacity: 0.85 },
  monthTitle: { fontSize: 16, fontWeight: "900", color: COLORS.text },

  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  weekDay: {
    width: 38,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },

  divider: { height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginBottom: 10 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cell: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: "#1E2326" },
  dayText: { fontSize: 12, fontWeight: "900", color: COLORS.text },
  dayTextSelected: { color: COLORS.white },
  dayTextUnavailable: { color: "rgba(0,0,0,0.25)", fontWeight: "800" },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
  },
  cancelBtn: {
    flex: 1,
    marginRight: 10,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: COLORS.white,
  },
  cancelText: { fontSize: 13, fontWeight: "900", color: COLORS.text },
  doneBtn: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#1E2326",
  },
  doneText: { fontSize: 13, fontWeight: "900", color: COLORS.white },
});
