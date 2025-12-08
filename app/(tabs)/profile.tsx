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
  Ionicons,
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

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const generalItems: MenuItem[] = [
    { id: "favorite", label: "Favorite Cars", iconType: "heart" },
    { id: "previous", label: "Previous Rents", iconType: "history" },
    { id: "notif", label: "Notifications", iconType: "bell" },
    {
      id: "partners",
      label: "Become a Partner",
      iconType: "link",
    },
  ];

  const supportItems: MenuItem[] = [
    { id: "settings", label: "Settings", iconType: "settings" },
    { id: "languages", label: "Languages", iconType: "language" },
    { id: "invite", label: "Invite Friends", iconType: "invite" },
    { id: "privacy", label: "privacy policy", iconType: "privacy" },
    { id: "help", label: "Help & Support", iconType: "help" },
    {
      id: "logout",
      label: "Log out",
      iconType: "logout",
      onPress: logout,
    },
  ];

  // 🔹 From your Redux user object
  const displayName = user?.name ?? "Guest User";
  const displayEmail = user?.email ?? "";
  const displayPhone = user?.phoneNumber ?? "";
  const hasAvatar = !!user?.photoURL;
  const avatarUrl = user?.photoURL || undefined;

  // First letter for placeholder avatar
  const initials =
    displayName && displayName.trim().length > 0
      ? displayName.trim().charAt(0).toUpperCase()
      : "?";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="chevron-back" size={20} color="#222" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>

          <TouchableOpacity style={styles.headerIconButton}>
            <Feather name="more-horizontal" size={20} color="#222" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* PROFILE CARD */}
          <View style={styles.profileRow}>
            <View style={styles.avatarWrapper}>
              {hasAvatar ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}

              <View style={styles.cameraBadge}>
                <Feather name="camera" size={14} color="#444" />
              </View>
            </View>

            <View style={styles.profileTextWrapper}>
              <Text style={styles.profileName}>{displayName}</Text>
              {!!displayEmail && (
                <Text style={styles.profileEmail}>{displayEmail}</Text>
              )}
              {!!displayPhone && (
                <Text style={styles.profilePhone}>{displayPhone}</Text>
              )}
            </View>

            <TouchableOpacity>
              <Text style={styles.editProfileText}>Edit profile</Text>
            </TouchableOpacity>
          </View>

          {/* GENERAL SECTION */}
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.sectionCard}>
            {generalItems.map((item, index) => (
              <MenuRow
                key={item.id}
                item={item}
                isLast={index === generalItems.length - 1}
              />
            ))}
          </View>

          {/* SUPPORT SECTION (Saport like the design) */}
          <Text style={styles.sectionTitle}>Saport</Text>
          <View style={styles.sectionCard}>
            {supportItems.map((item, index) => (
              <MenuRow
                key={item.id}
                item={item}
                isLast={index === supportItems.length - 1}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const MenuRow: React.FC<{ item: MenuItem; isLast?: boolean }> = ({
  item,
  isLast,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={item.onPress}
      style={[styles.menuRow, !isLast && styles.menuRowBorder]}
    >
      <View style={styles.menuLeft}>
        <View style={styles.menuIconCircle}>{renderIcon(item.iconType)}</View>
        <Text style={styles.menuLabel}>{item.label}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#C1C1C1" />
    </TouchableOpacity>
  );
};

const renderIcon = (type: MenuItem["iconType"]) => {
  switch (type) {
    case "heart":
      return <Feather name="heart" size={18} color="#7F7F7F" />;
    case "history":
      return <MaterialIcons name="history" size={18} color="#7F7F7F" />;
    case "bell":
      return <Feather name="bell" size={18} color="#7F7F7F" />;
    case "link":
      return <Feather name="link-2" size={18} color="#7F7F7F" />;
    case "settings":
      return <Feather name="settings" size={18} color="#7F7F7F" />;
    case "language":
      return <MaterialIcons name="language" size={18} color="#7F7F7F" />;
    case "invite":
      return <Feather name="user-plus" size={18} color="#7F7F7F" />;
    case "privacy":
      return (
        <MaterialCommunityIcons
          name="shield-outline"
          size={18}
          color="#7F7F7F"
        />
      );
    case "help":
      return <Feather name="help-circle" size={18} color="#7F7F7F" />;
    case "logout":
      return <MaterialIcons name="logout" size={18} color="#7F7F7F" />;
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120, // so “Log out” clears bottom nav
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    position: "relative",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
  },
  avatarPlaceholder: {
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: "600",
    color: "#4B5563",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  profileTextWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "#8A8A8A",
  },
  profilePhone: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  editProfileText: {
    fontSize: 13,
    color: "#7F7F7F",
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "500",
    color: "#8A8A8A",
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EFEFEF",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 14,
    color: "#222222",
  },
});

export default ProfileScreen;
