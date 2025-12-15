import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/services/firebase";
import { useAppDispatch } from "@/redux/hooks";
import { updateUser } from "@/redux/slices/authSlice";

type MenuItem = {
  id: string;
  label: string;
  iconType:
    | "heart"
    | "history"
    | "bell"
    | "link"
    | "settings"
    | "language"
    | "invite"
    | "privacy"
    | "help"
    | "logout";
  onPress?: () => void;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;

if (!API_BASE) {
  throw new Error("EXPO_PUBLIC_API_BASE is not set");
}

// -------------------------
// Storage keys (only for remind later + analytics counters)
// -------------------------
const STORAGE_KEYS = {
  PHONE_REMIND_UNTIL: "zipo.phoneVerify.remindUntil",
  PHONE_SKIP_COUNT: "zipo.phoneVerify.skipCount",
};

// Pulse dot once per app session (not persisted)
let sessionPulseShown = false;

type AppMode = "guest" | "host";

function boolish(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}

// -------------------------
// Analytics hook (swap later)
// -------------------------
function track(event: string, props?: Record<string, any>) {
  console.log(`[analytics] ${event}`, props ?? {});
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, logout } = useAuth();

  const generalItems: MenuItem[] = [
    { id: "favorite", label: "Favorite Cars", iconType: "heart" },
    { id: "previous", label: "Previous Rents", iconType: "history" },
    { id: "notif", label: "Notifications", iconType: "bell" },
    { id: "partners", label: "Become a Partner", iconType: "link" },
  ];

  const supportItems: MenuItem[] = [
    { id: "settings", label: "Settings", iconType: "settings" },
    { id: "languages", label: "Languages", iconType: "language" },
    { id: "invite", label: "Invite Friends", iconType: "invite" },
    { id: "privacy", label: "Privacy policy", iconType: "privacy" },
    { id: "help", label: "Help & Support", iconType: "help" },
    { id: "logout", label: "Log out", iconType: "logout", onPress: logout },
  ];

  // --- user fields (resilient)
  const displayName =
    (user as any)?.name ??
    (user as any)?.fullName ??
    (user as any)?.displayName ??
    "Guest User";

  const displayEmail = (user as any)?.email ?? "";
  const displayPhone =
    (user as any)?.phoneNumber ??
    (user as any)?.phone ??
    (user as any)?.phone_e164 ??
    "";

  const avatarUrl =
    (user as any)?.photoURL ||
    (user as any)?.profile_photo_url ||
    (user as any)?.photoUrl ||
    (user as any)?.avatarUrl ||
    undefined;

  const hasAvatar = !!avatarUrl;

  const initials =
    displayName && displayName.trim().length > 0
      ? displayName.trim().charAt(0).toUpperCase()
      : "?";

  // verification flags (supports multiple field names)
  const emailVerified = boolish(
    (user as any)?.emailVerified ??
      (user as any)?.email_verified ??
      (user as any)?.isEmailVerified
  );

  const phoneVerified = boolish(
    (user as any)?.phoneVerified ??
      (user as any)?.phone_verified ??
      (user as any)?.isPhoneVerified ??
      (user as any)?.phoneNumberVerified
  );

  const anyVerified = emailVerified || phoneVerified;

  const statusLine = `${
    emailVerified ? "Email verified" : "Email not verified"
  } • ${phoneVerified ? "Phone verified" : "Phone not verified"}`;

  // -------------------------
  // Mode (Guest/Host) from DB user.mode
  // -------------------------
  const mode: AppMode = (
    (user as any)?.mode === "host" || (user as any)?.mode === "guest"
      ? (user as any)?.mode
      : "guest"
  ) as AppMode;

  const isHost = mode === "host";

  const updateModeOnBackend = async (nextMode: AppMode) => {
    const current = auth.currentUser;
    const idToken = await current?.getIdToken(true);

    if (!idToken) {
      throw new Error("Missing auth token");
    }

    const res = await fetch(`${API_BASE}/api/users/mode`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode: nextMode }),
    });

    const text = await res.text();
    if (!res.ok) {
      // backend returns JSON errors usually
      throw new Error(text || "Failed to switch mode");
    }

    const json = JSON.parse(text);
    return json.user;
  };

  const handleToggleMode = async () => {
    const nextMode: AppMode = isHost ? "guest" : "host";

    try {
      track("app_mode_switch_tap", { from: mode, to: nextMode });

      // Call backend (still important so DB stays source of truth)
      await updateModeOnBackend(nextMode);

      // ✅ Update redux user (minimal + safe)
      dispatch(updateUser({ mode: nextMode }));

      // ✅ Re-enter the app via the mode gate so correct tabs render
      router.replace("/(app)");
    } catch (e: any) {
      console.warn("Mode switch failed:", e?.message || e);
      Alert.alert("Error", e?.message || "Could not switch mode.");
    }
  };

  // -------------------------
  // Verify Phone CTA: always visible if not verified
  // Remind later still tracked, but DOES NOT hide CTA anymore.
  // -------------------------
  const [remindActive, setRemindActive] = React.useState(false);

  const pulse = React.useRef(new Animated.Value(0)).current;

  const shouldShowVerifyPhone = !phoneVerified;

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_REMIND_UNTIL);
        const remindUntil = raw ? Number(raw) : 0;
        setRemindActive(!!(remindUntil && Date.now() < remindUntil));
      } catch {
        setRemindActive(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!shouldShowVerifyPhone) return;
    if (sessionPulseShown) return;

    // if remind is active, don't pulse (keeps it subtle)
    if (remindActive) return;

    sessionPulseShown = true;

    pulse.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();
    const t = setTimeout(() => anim.stop(), 5200);

    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [shouldShowVerifyPhone, remindActive, pulse]);

  const verifyLabel = displayPhone ? "Verify phone number" : "Add phone number";

  const handleVerifyPhone = () => {
    track("phone_verify_cta_tap", {
      from: "profile",
      hasPhone: !!displayPhone,
      emailVerified,
      phoneVerified,
      mode,
    });

    router.push({
      pathname: "/verify-phone",
      params: { next: "/(tabs)", from: "profile" },
    } as any);
  };

  const handleRemindLater = async () => {
    // keep it simple: 24h remind in profile
    const remindUntil = Date.now() + 24 * 60 * 60 * 1000;

    let next = 1;
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PHONE_REMIND_UNTIL,
        String(remindUntil)
      );

      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PHONE_SKIP_COUNT);
      next = (raw ? Number(raw) : 0) + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.PHONE_SKIP_COUNT, String(next));
    } catch {
      // ignore
    }

    track("phone_verify_remind_later", {
      from: "profile",
      skipCount: next,
      mode,
    });

    // ✅ CTA stays visible, we just stop pulsing + show subtle text
    setRemindActive(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.brand}>Zipo</Text>

          {/* User card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarClip}>
                  {hasAvatar ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cameraBadge}>
                  <Feather name="camera" size={14} color="#111827" />
                </View>
              </View>

              <View style={styles.identityCol}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>

                {/* Email directly under name */}
                {!!displayEmail && (
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                )}

                {/* Mode pill (Guest / Host) */}
                <View style={styles.modeRow}>
                  <View
                    style={[
                      styles.modePill,
                      isHost ? styles.modePillHost : styles.modePillGuest,
                    ]}
                  >
                    <Feather
                      name={isHost ? "briefcase" : "user"}
                      size={12}
                      color="rgba(17,24,39,0.85)"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.modePillText}>
                      {isHost ? "Host mode" : "Guest mode"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleToggleMode}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modeSwitchTiny}>
                      Switch to {isHost ? "guest" : "host"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Verified pill */}
                <View
                  style={[
                    styles.verifiedPill,
                    !anyVerified && styles.notVerifiedPill,
                  ]}
                >
                  <Feather
                    name={anyVerified ? "check" : "alert-circle"}
                    size={12}
                    color={
                      anyVerified
                        ? "rgba(16,185,129,0.95)"
                        : "rgba(245,158,11,0.95)"
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      !anyVerified && styles.notVerifiedText,
                    ]}
                  >
                    {anyVerified ? "Verified" : "Not verified"}
                  </Text>
                </View>

                <Text style={styles.statusLine} numberOfLines={1}>
                  {statusLine}
                </Text>
              </View>
            </View>

            {/* Verify phone CTA (ALWAYS visible if not verified) */}
            {shouldShowVerifyPhone ? (
              <View style={styles.verifyBlock}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleVerifyPhone}
                  style={styles.verifyRow}
                >
                  <View style={styles.verifyLeft}>
                    <View style={styles.verifyIconWrap}>
                      <Feather name="phone" size={16} color="#111827" />

                      {!remindActive && (
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.pulseDot,
                            {
                              transform: [
                                {
                                  scale: pulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.45],
                                  }),
                                },
                              ],
                              opacity: pulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.55, 1],
                              }),
                            },
                          ]}
                        />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyText}>{verifyLabel}</Text>
                      {remindActive ? (
                        <Text style={styles.remindActiveHint}>
                          Reminder active — we’ll ask again later.
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Feather
                    name="chevron-right"
                    size={18}
                    color="rgba(17,24,39,0.30)"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleRemindLater}
                >
                  <Text style={styles.remindLaterText}>Remind me later</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Edit profile row */}
            <TouchableOpacity activeOpacity={0.9} style={styles.editRow}>
              <Text style={styles.editRowText}>Edit profile</Text>
              <Feather
                name="chevron-right"
                size={18}
                color="rgba(17,24,39,0.30)"
              />
            </TouchableOpacity>
          </View>

          {/* GENERAL */}
          <Section title="General">
            {generalItems.map((item, index) => (
              <MenuRow
                key={item.id}
                item={item}
                isLast={index === generalItems.length - 1}
              />
            ))}
          </Section>

          {/* SUPPORT */}
          <Section title="Support">
            {supportItems.map((item, index) => (
              <MenuRow
                key={item.id}
                item={item}
                isLast={index === supportItems.length - 1}
                danger={item.iconType === "logout"}
              />
            ))}
          </Section>

          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
};

const MenuRow: React.FC<{
  item: MenuItem;
  isLast?: boolean;
  danger?: boolean;
}> = ({ item, isLast, danger }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={item.onPress}
      style={[styles.menuRow, !isLast && styles.menuRowBorder]}
    >
      <View style={styles.menuLeft}>
        <View
          style={[styles.menuIconCircle, danger && styles.menuIconCircleDanger]}
        >
          {renderIcon(item.iconType, danger)}
        </View>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>
          {item.label}
        </Text>
      </View>

      <Feather
        name="chevron-right"
        size={18}
        color={danger ? "rgba(220,38,38,0.55)" : "rgba(17,24,39,0.25)"}
      />
    </TouchableOpacity>
  );
};

const renderIcon = (type: MenuItem["iconType"], danger?: boolean) => {
  const c = danger ? "rgba(220,38,38,0.75)" : "rgba(17,24,39,0.50)";
  switch (type) {
    case "heart":
      return <Feather name="heart" size={18} color={c} />;
    case "history":
      return <MaterialIcons name="history" size={18} color={c} />;
    case "bell":
      return <Feather name="bell" size={18} color={c} />;
    case "link":
      return <Feather name="link-2" size={18} color={c} />;
    case "settings":
      return <Feather name="settings" size={18} color={c} />;
    case "language":
      return <MaterialIcons name="language" size={18} color={c} />;
    case "invite":
      return <Feather name="user-plus" size={18} color={c} />;
    case "privacy":
      return (
        <MaterialCommunityIcons name="shield-outline" size={18} color={c} />
      );
    case "help":
      return <Feather name="help-circle" size={18} color={c} />;
    case "logout":
      return <MaterialIcons name="logout" size={18} color={c} />;
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  scrollContent: { paddingHorizontal: 18, paddingTop: 10 },

  brand: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.4,
    marginBottom: 10,
  },

  profileCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },

  avatarRow: { flexDirection: "row", alignItems: "center" },

  avatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    position: "relative",
  },
  avatarClip: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: "hidden",
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  avatar: { width: "100%", height: "100%", borderRadius: 42 },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarInitials: {
    fontSize: 30,
    fontWeight: "900",
    color: "rgba(17,24,39,0.65)",
  },

  cameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  identityCol: { flex: 1, marginLeft: 14 },

  profileName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
    marginBottom: 4,
  },

  profileEmail: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.48)",
    marginBottom: 8,
  },

  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  modePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  modePillGuest: {
    backgroundColor: "rgba(17,24,39,0.04)",
    borderColor: "rgba(17,24,39,0.10)",
  },
  modePillHost: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.18)",
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.78)",
  },
  modeSwitchTiny: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
  },

  verifiedPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.10)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.18)",
    marginBottom: 6,
  },
  notVerifiedPill: {
    backgroundColor: "rgba(245,158,11,0.10)",
    borderColor: "rgba(245,158,11,0.18)",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(16,185,129,0.95)",
  },
  notVerifiedText: { color: "rgba(245,158,11,0.95)" },

  statusLine: { fontSize: 12, fontWeight: "700", color: "rgba(17,24,39,0.42)" },

  verifyBlock: { marginTop: 14, alignItems: "center" },
  verifyRow: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  verifyLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  verifyIconWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseDot: {
    position: "absolute",
    top: -5,
    right: -7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(245,158,11,0.95)",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  verifyText: { fontSize: 15, fontWeight: "900", color: "#111827" },
  remindActiveHint: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
  },
  remindLaterText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.40)",
  },

  editRow: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editRowText: { fontSize: 15, fontWeight: "900", color: "#111827" },

  sectionWrap: { marginTop: 18 },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.38)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingLeft: 2,
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17,24,39,0.08)",
  },
  menuLeft: { flexDirection: "row", alignItems: "center" },

  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    backgroundColor: "rgba(17,24,39,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIconCircleDanger: {
    borderColor: "rgba(220,38,38,0.18)",
    backgroundColor: "rgba(220,38,38,0.06)",
  },

  menuLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.88)",
  },
  menuLabelDanger: { color: "rgba(220,38,38,0.85)" },
});
