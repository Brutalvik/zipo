import React from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export type SelectOption = {
  value: string;
  label: string;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;

  options: SelectOption[];
  selectedValue?: string;

  onSelect: (value: string) => void;
  onClose: () => void;

  searchable?: boolean;
  searchPlaceholder?: string;

  /** Allow user to type a custom value (e.g. brand that isn't in list) */
  allowCustom?: boolean;
  customPlaceholder?: string;

  /** Optional: limit sheet height (default: ~78% of screen) */
  maxHeightPct?: number; // 0..1
};

export default function PickerModal({
  visible,
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = "Search…",
  allowCustom = false,
  customPlaceholder = "Type and press Done",
  maxHeightPct = 0.78,
}: Props) {
  const insets = useSafeAreaInsets();

  const [q, setQ] = React.useState("");
  const [custom, setCustom] = React.useState("");

  // Reset search when closing
  React.useEffect(() => {
    if (!visible) {
      setQ("");
      setCustom("");
    }
  }, [visible]);

  const filtered = React.useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq));
  }, [q, options]);

  const pick = React.useCallback(
    (v: string) => {
      onSelect(v);
      onClose();
    },
    [onSelect, onClose]
  );

  const submitCustom = React.useCallback(() => {
    const v = custom.trim();
    if (!v) return;
    pick(v);
  }, [custom, pick]);

  const sheetMaxHeight = `${
    Math.max(0.45, Math.min(0.92, maxHeightPct)) * 100
  }%`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Fullscreen root */}
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Bottom sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kav}
        >
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(14, insets.bottom + 10),
                maxHeight: sheetMaxHeight as any,
              },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={16} color="#111827" />
              </Pressable>
            </View>

            {searchable ? (
              <View style={styles.searchWrap}>
                <Feather name="search" size={16} color="rgba(17,24,39,0.45)" />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.searchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </View>
            ) : null}

            {allowCustom ? (
              <View style={styles.customWrap}>
                <Feather name="edit-3" size={16} color="rgba(17,24,39,0.45)" />
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder={customPlaceholder}
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  style={styles.customInput}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={submitCustom}
                />
                <Pressable
                  onPress={submitCustom}
                  style={({ pressed }) => [
                    styles.donePill,
                    pressed && { opacity: 0.9 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ paddingBottom: 12 }}
              renderItem={({ item }) => {
                const selected = String(item.value) === String(selectedValue);
                return (
                  <Pressable
                    onPress={() => pick(item.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                      pressed && { opacity: 0.95 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={selected ? { selected: true } : {}}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {selected ? (
                      <Feather name="check" size={18} color="#111827" />
                    ) : (
                      <View style={{ width: 18 }} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No results</Text>
                  <Text style={styles.emptySub}>Try a different search.</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  kav: {
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  handle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.14)",
    marginBottom: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 10,
  },

  title: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.50)",
    lineHeight: 16,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    padding: 0,
  },

  customWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(17,24,39,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginBottom: 10,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    padding: 0,
  },
  donePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  doneText: { fontSize: 12, fontWeight: "900", color: "#111827" },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  optionRowSelected: {
    backgroundColor: "rgba(17,24,39,0.06)",
    borderColor: "rgba(17,24,39,0.12)",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.85)",
  },
  optionTextSelected: {
    color: "#111827",
  },

  empty: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: "rgba(17,24,39,0.75)" },
  emptySub: { fontSize: 12, fontWeight: "800", color: "rgba(17,24,39,0.45)" },
});
