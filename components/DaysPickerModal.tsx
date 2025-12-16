import React, { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, SHADOW_CARD } from "@/theme/ui";

type DateLike = Date | string | number | null | undefined;

type CommonProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * ------------------------------
 * MODE A: "days count" picker
 * (your original usage)
 * ------------------------------
 */
type DaysCountProps = CommonProps & {
  value: number; // <-- number of days
  maxDays: number; // <-- REQUIRED (this is how we detect old mode)
  minDays?: number;
  title?: string;
  onSelect: (days: number) => void; // <-- returns number
};

/**
 * ------------------------------
 * MODE B: "date calendar" picker
 * (new DOB usage)
 * ------------------------------
 */
type CalendarDateProps = CommonProps & {
  value: DateLike; // <-- Date / string / number
  onSelect: (date: Date) => void; // <-- returns Date
  unavailableDates?: string[]; // YYYY-MM-DD
  showTime?: boolean; // default false (DOB should not show time)
  timeLabel?: string;
  minDate?: DateLike; // optional (e.g. DOB min)
  maxDate?: DateLike; // optional (e.g. DOB max)
};

type Props = DaysCountProps | CalendarDateProps;

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
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DaysPickerModal(props: Props) {
  // ✅ Backward-compat detection: old mode if maxDays exists
  const isDaysCountMode = "maxDays" in props;

  /**
   * ======================================================
   * MODE A: DAYS COUNT PICKER (your old behavior)
   * ======================================================
   */
  const [tempDays, setTempDays] = useState<number>(
    isDaysCountMode ? props.value : 1
  );

  useEffect(() => {
    if (!props.visible) return;
    if (!isDaysCountMode) return;
    setTempDays(props.value);
  }, [props.visible, isDaysCountMode, isDaysCountMode ? props.value : null]);

  if (isDaysCountMode) {
    const {
      visible,
      onClose,
      value,
      maxDays,
      minDays = 1,
      title = "Select days",
      onSelect,
    } = props;

    const safeMin = Math.max(1, minDays);
    const safeMax = Math.max(safeMin, maxDays);

    const dec = () => setTempDays((d) => clamp(d - 1, safeMin, safeMax));
    const inc = () => setTempDays((d) => clamp(d + 1, safeMin, safeMax));

    const handleDone = () => {
      onSelect(clamp(tempDays, safeMin, safeMax));
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
            <Text style={styles.monthTitleText}>{title}</Text>

            <View style={styles.daysBox}>
              <Pressable onPress={dec} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>

              <View style={styles.daysValueWrap}>
                <Text style={styles.daysValue}>{tempDays}</Text>
                <Text style={styles.daysLabel}>
                  {tempDays === 1 ? "day" : "days"}
                </Text>
              </View>

              <Pressable onPress={inc} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.hintText}>
              Min {safeMin} • Max {safeMax}
            </Text>

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

  /**
   * ======================================================
   * MODE B: DATE CALENDAR PICKER (your new behavior)
   * ======================================================
   */
  const {
    visible,
    value,
    timeLabel = "10 : 30 am",
    unavailableDates = [],
    onClose,
    onSelect,
    showTime = false, // ✅ default: hide time (DOB wants this)
    minDate,
    maxDate,
  } = props as CalendarDateProps;

  const unavailableSet = useMemo(
    () => new Set(unavailableDates),
    [unavailableDates]
  );

  const normalizedValue = useMemo(() => normalizeDate(value), [value]);
  const minD = useMemo(() => normalizeDate(minDate), [minDate]);
  const maxD = useMemo(() => normalizeDate(maxDate), [maxDate]);

  const [cursorMonth, setCursorMonth] = useState<Date>(() => {
    const base = normalizedValue ?? new Date();
    return startOfMonthSafe(base);
  });

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

  const isOutOfRange = (d: Date) => {
    if (
      minD &&
      d < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate())
    )
      return true;
    if (
      maxD &&
      d > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate())
    )
      return true;
    return false;
  };

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
          {showTime ? (
            <>
              <Text style={styles.sectionLabel}>Time</Text>

              <View style={styles.timeRow}>
                <View style={styles.timePill}>
                  <Text style={styles.timeIcon}>🕒</Text>
                  <Text style={styles.timeText}>{timeLabel}</Text>
                </View>
              </View>
            </>
          ) : null}

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
              const disabled = isUnavailable || isOutOfRange(d);

              return (
                <Pressable
                  key={key}
                  disabled={disabled}
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
                        disabled && styles.dayTextUnavailable,
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

  // ---- Days count UI ----
  monthTitleText: { fontSize: 16, fontWeight: "900", color: COLORS.text },

  daysBox: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(17,24,39,0.04)",
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    opacity: 0.9,
  },
  daysValueWrap: { alignItems: "center", justifyContent: "center" },
  daysValue: { fontSize: 26, fontWeight: "900", color: COLORS.text },
  daysLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },

  hintText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.45)",
    textAlign: "center",
  },
});
