import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppSelector } from "@/redux/hooks";
import { COLORS, RADIUS, SHADOW_CARD } from "@/theme/ui";

type Props = {
  title?: string;
  notificationCount?: number;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
};

function getInitials(name?: string | null, email?: string | null) {
  const base = (name || "").trim() || (email || "").trim();
  if (!base) return "U";
  const parts = base.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AppHeader({
  title = "Zipo",
  notificationCount = 0,
  onPressNotifications,
  onPressProfile,
}: Props) {
  const { user } = useAppSelector((s) => s.auth);

  const photoURL =
    (user as any)?.photoURL ||
    (user as any)?.photoUrl ||
    (user as any)?.avatarUrl ||
    null;

  const displayName =
    (user as any)?.displayName ||
    (user as any)?.fullName ||
    (user as any)?.name ||
    null;

  const email = (user as any)?.email || null;

  const initials = useMemo(
    () => getInitials(displayName, email),
    [displayName, email]
  );

  return (
    <View style={styles.row}>
      {/* LEFT: Zipo only (no icon) */}
      <Text style={styles.title}>{title}</Text>

      {/* RIGHT: bell + real user */}
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
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.initialsWrap}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
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
  title: { fontSize: 22, fontWeight: "900", color: COLORS.text },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
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
  initialsWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 14, fontWeight: "900", color: COLORS.text },
});
