import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

type Props = {
  appName?: string;
  notificationCount?: number;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
};

export default function HomeHeader({
  appName = "Zipo",
  notificationCount = 2,
  onPressNotifications,
  onPressProfile,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.logo, SHADOW_CARD]}>
          <Feather name="truck" size={16} color={COLORS.text} />
        </View>
        <Text style={styles.title}>{appName}</Text>
      </View>

      <View style={styles.right}>
        <Pressable
          style={[styles.iconBtn, SHADOW_CARD]}
          onPress={onPressNotifications}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Feather name="bell" size={18} color={COLORS.text} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={onPressProfile}
          style={[styles.avatarWrap, SHADOW_CARD]}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <Image
            source={{ uri: "https://i.pravatar.cc/100?img=3" }}
            style={styles.avatar}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: COLORS.text },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#111827",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  avatar: { width: "100%", height: "100%" },
});
