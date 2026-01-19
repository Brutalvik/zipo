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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/services/firebase";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateUser } from "@/redux/slices/authSlice";
import Button from "@/components/Button/Button";
import { fetchHostMe } from "@/redux/thunks/hostThunk";
import { selectHost } from "@/redux/slices/hostSlice";
import { useFreshAvatarUrl } from "@/hooks/useFreshAvatarUrl";
import ZipoLaunchSplash from "@/components/common/ZipoLaunchSplash";

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

const STORAGE_KEYS = {
  PHONE_REMIND_UNTIL: "zipo.phoneVerify.remindUntil",
  PHONE_SKIP_COUNT: "zipo.phoneVerify.skipCount",
};

let sessionPulseShown = false;

type AppMode = "guest" | "host";

function boolish(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function track(event: string, props?: Record<string, any>) {
  console.log(`[analytics] ${event}`, props ?? {});
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, logout } = useAuth();
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [switchingTo, setSwitchingTo] = React.useState<AppMode | null>(null);
  const didNavigateRef = React.useRef(false);
  useFreshAvatarUrl({ refreshMeOnFocus: false, forceSignedUrlOnFocus: true });
  const host = useAppSelector(selectHost);
  const hostExists = !!host;

  const waitMin = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const handleBecomePartner = async () => {
    try {
      await dispatch(fetchHostMe() as any);

      if (hostExists) {
        if (!isHost) {
          await updateModeOnBackend("host");
          dispatch(updateUser({ mode: "host" }));
        }
        router.replace("/(app)/host-program");
        return;
      }

      if (!isHost) {
        await updateModeOnBackend("host");
        dispatch(updateUser({ mode: "host" }));
      }
      router.push("/(app)/host-program");
    } catch (e: any) {
      console.warn("Become partner failed:", e?.message || e);
      Alert.alert("Error", e?.message || "Could not start host onboarding.");
    }
  };

  const refreshUserFromBackend = React.useCallback(async () => {
    try {
      const current = auth.currentUser;
      const idToken = await current?.getIdToken(true);
      if (!idToken) return;

      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      });

      const text = await res.text();
      if (!res.ok) {
        console.warn("GET /api/users/me failed:", text);
        return;
      }

      const json = JSON.parse(text);
      if (json?.user) {
        dispatch(updateUser(json.user));
      }
    } catch (e) {
      console.warn("refreshUserFromBackend failed", e);
    }
  }, [dispatch]);

  const generalItems: MenuItem[] = [
    { id: "favorite", label: "Favorite Cars", iconType: "heart" },
    { id: "previous", label: "Previous Rents", iconType: "history" },
    { id: "notif", label: "Notifications", iconType: "bell" },
    ...(!hostExists
      ? [
          {
            id: "partners",
            label: "Become a Partner",
            iconType: "link" as const,
            onPress: handleBecomePartner,
          },
        ]
      : []),
  ];

  const supportItems: MenuItem[] = [
    { id: "settings", label: "Settings", iconType: "settings" },
    { id: "languages", label: "Languages", iconType: "language" },
    { id: "invite", label: "Invite Friends", iconType: "invite" },
    { id: "privacy", label: "Privacy policy", iconType: "privacy" },
    { id: "help", label: "Help & Support", iconType: "help" },
    { id: "logout", label: "Log out", iconType: "logout", onPress: logout },
  ];

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

  const avatarUrl = (user as any)?.profile_photo_url ?? undefined;

  const hasAvatar = !!avatarUrl;

  const initials =
    displayName && displayName.trim().length > 0
      ? displayName.trim().charAt(0).toUpperCase()
      : "?";

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
    emailVerified ? "" : "Email not verified"
  } ${phoneVerified ? "" : "Phone not verified"}`;

  const mode: AppMode = (
    (user as any)?.mode === "host" || (user as any)?.mode === "guest"
      ? (user as any)?.mode
      : "guest"
  ) as AppMode;

  const isHost = mode === "host";

  const updateModeOnBackend = async (nextMode: AppMode) => {
    const current = auth.currentUser;
    const idToken = await current?.getIdToken(true);

    if (!idToken) throw new Error("Missing auth token");

    const res = await fetch(`${API_BASE}/api/users/mode`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode: nextMode }),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || "Failed to switch mode");

    const json = JSON.parse(text);
    return json.user;
  };

  const nextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const handleToggleMode = async () => {
    if (isSwitching) return;
    didNavigateRef.current = false;

    const nextMode: AppMode = isHost ? "guest" : "host";

    setSwitchingTo(nextMode);
    setIsSwitching(true);

    await nextFrame();
    await nextFrame();

    const minSplash = waitMin(900);

    try {
      await updateModeOnBackend(nextMode);
      dispatch(updateUser({ mode: nextMode }));

      await Promise.allSettled([
        refreshUserFromBackend(),
        dispatch(fetchHostMe() as any),
      ]);

      await minSplash;

      if (!didNavigateRef.current) {
        didNavigateRef.current = true;
        router.replace(nextMode === "host" ? "/(app)" : "/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not switch mode.");
      setIsSwitching(false);
      setSwitchingTo(null);
    }
  };

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

  useFocusEffect(
    React.useCallback(() => {
      refreshUserFromBackend();
      dispatch(fetchHostMe() as any);
    }, [refreshUserFromBackend, dispatch])
  );

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
      params: { next: "/(tabs)/profile", from: "profile" },
    } as any);
  };

  const handleRemindLater = async () => {
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
    } catch {}

    track("phone_verify_remind_later", {
      from: "profile",
      skipCount: next,
      mode,
    });

    setRemindActive(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: Brand left, Switch button right */}
          <View style={styles.headerRow}>
            <Text style={styles.brand}>Zipo</Text>

            {/* Glass button using your custom component */}
            {hostExists ? (
              <View style={{ width: 168 }}>
                <Button
                  title={`Switch to ${isHost ? "guest" : "host"}`}
                  variant="primary"
                  size="sm"
                  onPress={handleToggleMode}
                  iconName="exchange"
                />
              </View>
            ) : null}
            {/* <View style={{ width: 168 }}>
              <Button
                title={`Switch to ${isHost ? "guest" : "host"}`}
                variant="primary"
                size="sm"
                onPress={handleToggleMode}
                iconName="exchange"
              />
            </View> */}
          </View>

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
              </View>

              <View style={styles.identityCol}>
                <TouchableOpacity activeOpacity={0.8}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {displayName}
                    </Text>

                    <Feather
                      name={anyVerified ? "check-circle" : "alert-circle"}
                      size={14}
                      color={
                        anyVerified
                          ? "rgba(16,185,129,0.95)"
                          : "rgba(245,158,11,0.95)"
                      }
                      style={styles.verifyIcon}
                    />
                  </View>
                </TouchableOpacity>

                {!!displayEmail && (
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                )}

                {/* polished pills */}
                <View style={styles.modeVerifiedRow}>
                  <View
                    style={[
                      styles.modePill,
                      isHost ? styles.modePillHost : styles.modePillGuest,
                    ]}
                  >
                    <Feather
                      name={isHost ? "briefcase" : "user"}
                      size={12}
                      color={
                        isHost ? "rgba(37,99,235,0.90)" : "rgba(17,24,39,0.80)"
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.modePillText,
                        isHost ? styles.modeTextHost : styles.modeTextGuest,
                      ]}
                    >
                      {isHost ? "Host mode" : "Guest mode"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.statusLine,
                    anyVerified
                      ? styles.statusLineVerified
                      : styles.statusLineUnverified,
                  ]}
                  numberOfLines={1}
                >
                  {statusLine}
                </Text>
              </View>
            </View>

            {/* Verify phone CTA */}
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

                {!remindActive ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleRemindLater}
                  >
                    <Text style={styles.remindLaterText}>Remind me later</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.editRow}
              onPress={() => router.push("/profile-details")}
            >
              <Text style={styles.editRowText}>Edit profile</Text>
              <Feather
                name="chevron-right"
                size={18}
                color="rgba(17,24,39,0.30)"
              />
            </TouchableOpacity>
          </View>

          <Section title="General">
            {generalItems.map((item, index) => (
              <MenuRow
                key={item.id}
                item={item}
                isLast={index === generalItems.length - 1}
              />
            ))}
          </Section>

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
        {isSwitching ? (
          <View style={styles.switchOverlay} pointerEvents="auto">
            <ZipoLaunchSplash modeLabel={switchingTo ?? undefined} />
          </View>
        ) : null}
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
  switchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  safeArea: { flex: 1, backgroundColor: "#F6F7FB" },
  container: { flex: 1, backgroundColor: "#F6F7FB" },
  scrollContent: { paddingHorizontal: 18, paddingTop: 10 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  brand: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.4,
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

  modeVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
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
    backgroundColor: "rgba(17,24,39,0.06)",
    borderColor: "rgba(17,24,39,0.14)",
  },

  modePillHost: {
    backgroundColor: "rgba(37,99,235,0.10)",
    borderColor: "rgba(37,99,235,0.30)",
  },
  modePillText: { fontSize: 12, fontWeight: "900" },
  modeTextGuest: {
    color: "rgba(17,24,39,0.85)",
  },

  modeTextHost: {
    color: "rgba(37,99,235,0.95)",
  },

  verifiedPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  verifiedYes: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.18)",
  },
  verifiedNo: {
    backgroundColor: "rgba(245,158,11,0.10)",
    borderColor: "rgba(245,158,11,0.18)",
  },
  pillText: { fontSize: 12, fontWeight: "900" },
  pillTextYes: { color: "rgba(16,185,129,0.95)" },
  pillTextNo: { color: "rgba(245,158,11,0.95)" },

  statusLine: { fontSize: 12, fontWeight: "700", color: "rgba(17,24,39,0.42)" },
  statusLineVerified: { color: "rgba(16,185,129,0.85)" },
  statusLineUnverified: { color: "rgba(245,158,11,0.85)" },

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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  verifyIcon: {
    marginTop: 1,
  },
});
