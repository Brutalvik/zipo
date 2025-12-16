import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = {
  visible: boolean;
  value: Date | null;
  maximumDate?: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
};

export default function DobPickerModal({
  visible,
  value,
  maximumDate,
  onClose,
  onSelect,
}: Props) {
  // ✅ Never use new Date("YYYY-MM-DD") here
  const initial = useMemo(() => value ?? new Date(2000, 0, 1), [value]);
  const [temp, setTemp] = useState<Date>(initial);

  useEffect(() => {
    if (!visible) return;
    setTemp(initial);
  }, [visible, initial]);

  const handleDone = () => {
    onSelect(temp);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.btn}>
              <Text style={styles.btnText}>Cancel</Text>
            </Pressable>

            <Text style={styles.title}>Date of birth</Text>

            <Pressable
              onPress={handleDone}
              style={[styles.btn, styles.doneBtn]}
            >
              <Text style={[styles.btnText, styles.doneText]}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={temp}
              mode="date"
              maximumDate={maximumDate}
              display={Platform.OS === "ios" ? "inline" : "calendar"}
              themeVariant={Platform.OS === "ios" ? "light" : undefined}
              onChange={(event, selected) => {
                if (event?.type === "dismissed") return;
                if (selected) setTemp(selected);
              }}
              style={Platform.OS === "ios" ? styles.iosInline : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  sheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },

  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },

  title: { fontSize: 14, fontWeight: "900", color: "#111827" },

  btn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    minWidth: 84,
    alignItems: "center",
  },

  doneBtn: { backgroundColor: "#111827", borderColor: "#111827" },

  btnText: { fontSize: 13, fontWeight: "900", color: "#111827" },
  doneText: { color: "#fff" },

  pickerWrap: { paddingHorizontal: 10, paddingVertical: 10 },
  iosInline: { backgroundColor: "#fff" },
});
