import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

type Item = {
  label: string;
  value: string;
};

function normalize(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

export default function SearchPickerModal({
  visible,
  title,
  items,
  value,
  placeholder = "Search...",
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  items: Item[];
  value: string | null;
  placeholder?: string;
  onClose: () => void;
  onSelect: (item: Item) => void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!visible) setQ("");
  }, [visible]);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    if (!nq) return items;

    return items.filter((it) => {
      const l = normalize(it.label);
      const v = normalize(it.value);
      // prefix match OR includes match
      return (
        l.startsWith(nq) || v.startsWith(nq) || l.includes(nq) || v.includes(nq)
      );
    });
  }, [items, q]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={18} color="#111827" />
              </Pressable>

              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>

              <View style={{ width: 42 }} />
            </View>

            <View style={styles.searchWrap}>
              <Feather name="search" size={16} color="rgba(17,24,39,0.45)" />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={placeholder}
                placeholderTextColor="rgba(17,24,39,0.35)"
                style={styles.input}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(it) => it.value}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = value === item.value;
                return (
                  <Pressable
                    onPress={() => onSelect(item)}
                    style={({ pressed }) => [
                      styles.row,
                      selected && styles.rowSelected,
                      pressed && { opacity: 0.9 },
                    ]}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.rowText,
                        selected && styles.rowTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <Feather name="check" size={16} color="#111827" />
                    ) : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No results</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.25)",
    justifyContent: "flex-end",
  },
  kav: { flex: 1, justifyContent: "flex-end" },

  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingBottom: 10,
    maxHeight: "88%",
  },

  header: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },

  searchWrap: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },

  row: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowSelected: {
    backgroundColor: "rgba(17,24,39,0.08)",
    borderColor: "rgba(17,24,39,0.16)",
  },
  rowText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  rowTextSelected: {},

  empty: { paddingVertical: 18, alignItems: "center" },
  emptyText: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },
});
