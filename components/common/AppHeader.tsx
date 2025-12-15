// components/AppHeader.tsx
import React, { useMemo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppSelector } from "@/redux/hooks";
import { COLORS, SHADOW_CARD } from "@/theme/ui";

type Props = {
  title?: string;
  notificationCount?: number;
  onPressNotifications?: () => void;
  onPressProfile?: () => void;
  rightSlot?: React.ReactNode; // ✅ add this
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
  rightSlot,
}: Props) {
  const router = useRouter();
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

  const handleProfilePress = () => {
    if (onPressProfile) return onPressProfile();
    router.push("/(tabs)/profile");
  };

  const handleNotificationsPress = () => {
    if (onPressNotifications) return onPressNotifications();
  };

  return (
    <View style={styles.row}>
      {/* LEFT */}
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* RIGHT */}
      <View style={styles.right}>
        {rightSlot /* ✅ injected stuff comes first */}

        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            SHADOW_CARD,
            pressed && styles.pressed,
          ]}
          onPress={handleNotificationsPress}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true }}
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
          onPress={handleProfilePress}
          style={({ pressed }) => [
            styles.avatarWrap,
            SHADOW_CARD,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true }}
        >
          <View pointerEvents="none" style={styles.glassOverlay} />

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
    paddingTop: Platform.OS === "ios" ? 10 : 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  left: { flexDirection: "column", gap: 2 },

  // ✅ match Profile header size
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: -0.4,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#111827",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
  },

  badgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },

  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.92)",
  },

  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  avatar: { width: "100%", height: "100%" },

  initialsWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 14, fontWeight: "900", color: COLORS.text },

  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
});
