import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Feather,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

import { useAuth } from "@/hooks/useAuth";

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

function boolish(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}

export const ProfileScreen: React.FC = () => {
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

  // From your user object (resilient)
  const displayName =
    (user as any)?.name ??
    (user as any)?.fullName ??
    (user as any)?.displayName ??
    "Guest User";
  const displayEmail = (user as any)?.email ?? "";
  const displayPhone = (user as any)?.phoneNumber ?? (user as any)?.phone ?? "";
  const avatarUrl =
    (user as any)?.photoURL ||
    (user as any)?.photoUrl ||
    (user as any)?.avatarUrl ||
    undefined;

  const hasAvatar = !!avatarUrl;

  const initials =
    displayName && displayName.trim().length > 0
      ? displayName.trim().charAt(0).toUpperCase()
      : "?";

  // Verification status (supports multiple field names)
  const emailVerified = boolish(
    (user as any)?.emailVerified ?? (user as any)?.isEmailVerified
  );
  const phoneVerified = boolish(
    (user as any)?.phoneVerified ??
      (user as any)?.isPhoneVerified ??
      (user as any)?.phoneNumberVerified
  );

  const anyVerified = emailVerified || phoneVerified;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Row (no extra pencil button) */}
          <View style={styles.topRow}>
            <Text style={styles.brand}>Zipo</Text>
            <View style={styles.topRowRight} />
          </View>

          {/* Premium Profile Card */}
          <View style={styles.profileCard}>
            <View pointerEvents="none" style={styles.profileCardSheen} />
            <View pointerEvents="none" style={styles.profileCardBorder} />

            <View style={styles.profileRow}>
              {/* IMPORTANT: avatarWrapper must NOT overflow hidden so badge is fully visible */}
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

                {/* camera badge fully visible */}
                <View style={styles.cameraBadge}>
                  <Feather name="camera" size={14} color="#111827" />
                </View>
              </View>

              <View style={styles.profileTextWrapper}>
                <Text style={styles.profileName}>{displayName}</Text>

                {/* Verified pill */}
                <View style={styles.pillRow}>
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

                  <Text style={styles.verifyMeta}>
                    {emailVerified ? "Email verified" : "Email not verified"} •{" "}
                    {phoneVerified ? "Phone verified" : "Phone not verified"}
                  </Text>
                </View>

                {!!displayEmail && (
                  <Text style={styles.profileMeta} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                )}
                {!!displayPhone && (
                  <Text style={styles.profileMeta} numberOfLines={1}>
                    {displayPhone}
                  </Text>
                )}
              </View>
            </View>

            {/* Keep only this edit action */}
            <TouchableOpacity activeOpacity={0.9} style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit profile</Text>
              <Feather
                name="chevron-right"
                size={18}
                color="rgba(17,24,39,0.55)"
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
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        <View pointerEvents="none" style={styles.sectionSheen} />
        {children}
      </View>
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
  const c = danger ? "rgba(220,38,38,0.75)" : "rgba(17,24,39,0.55)";
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

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  brand: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.4,
  },
  topRowRight: { width: 38, height: 38 },

  // profile card
  profileCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 10,
    overflow: "hidden",
  },
  profileCardSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "55%",
    backgroundColor: "rgba(255,255,255,0.35)",
    opacity: 0.35,
  },
  profileCardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    opacity: 0.35,
  },

  profileRow: { flexDirection: "row", alignItems: "center" },

  // badge visibility fix: wrapper is NOT clipped, only avatarClip is
  avatarWrapper: {
    width: 78,
    height: 78,
    borderRadius: 39,
    position: "relative",
  },
  avatarClip: {
    width: 78,
    height: 78,
    borderRadius: 39,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "rgba(255,255,255,0.8)",
  },

  avatar: { width: "100%", height: "100%", borderRadius: 39 },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.06)",
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
  },

  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  profileTextWrapper: { flex: 1, marginLeft: 14 },

  profileName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
    marginBottom: 6,
  },

  pillRow: {
    gap: 6,
    marginBottom: 8,
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
  notVerifiedText: {
    color: "rgba(245,158,11,0.95)",
  },

  verifyMeta: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(17,24,39,0.45)",
  },

  profileMeta: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.55)",
  },

  editBtn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "900",
    color: "rgba(17,24,39,0.78)",
  },

  // sections
  sectionWrap: { marginTop: 16 },
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
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  sectionSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.25)",
    opacity: 0.25,
  },

  // menu rows
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17,24,39,0.08)",
  },
  menuLeft: { flexDirection: "row", alignItems: "center" },

  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
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
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(17,24,39,0.88)",
  },
  menuLabelDanger: {
    color: "rgba(220,38,38,0.85)",
  },
});

export default ProfileScreen;
