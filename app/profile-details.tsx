// app/(tabs)/profile-details.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth } from "@/services/firebase";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateUser } from "@/redux/slices/authSlice";
import Button from "@/components/Button/Button";
import DobPickerModal from "@/components/DobPickerModal";

import ReauthPasswordModal from "@/components/ReauthPasswordModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";

import { verifyBeforeUpdateEmail } from "firebase/auth";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("EXPO_PUBLIC_API_BASE is not set");

const PENDING_PHONE_KEY = "zipo_pending_phone_e164";

function toLocalYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMDToLocalDate(ymd: string) {
  const parts = (ymd || "").split("-");
  if (parts.length !== 3) return null;

  const yy = Number(parts[0]);
  const mm = Number(parts[1]);
  const dd = Number(parts[2]);

  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd))
    return null;

  const dt = new Date(yy, mm - 1, dd);
  const isValid =
    dt.getFullYear() === yy && dt.getMonth() === mm - 1 && dt.getDate() === dd;

  return isValid ? dt : null;
}

function track(event: string, props?: Record<string, any>) {
  console.log(`[analytics] ${event}`, props ?? {});
}

function boolish(v: any) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function cap(s: string) {
  const t = (s ?? "").toString();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function maxDobDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

function formatProviderLabel(providerRaw: any) {
  const p = (providerRaw ?? "").toString().toLowerCase().trim();
  if (!p) return "Zipo";

  if (p.includes("google")) return "Google";
  if (p.includes("apple")) return "Apple";
  if (p.includes("facebook")) return "Facebook";
  if (p.includes("phone")) return "Phone";
  if (p.includes("password")) return "Zipo";

  return cap(p);
}

function formatLastLogin(v: any) {
  if (!v) return "Not set";
  const d = v instanceof Date ? v : new Date(String(v));
  if (isNaN(d.getTime())) return "Not set";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const DD = String(d.getDate()).padStart(2, "0");
  const MMM = months[d.getMonth()];
  const YYYY = d.getFullYear();

  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  return `${DD}-${MMM}-${YYYY}, ${HH}:${MM}`;
}

function firebaseFriendlyMessage(error: any) {
  const code = error?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "That password doesn't look right. Please try again.";
    case "auth/user-not-found":
      return "We couldn't find an account with that email.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a bit and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    case "auth/requires-recent-login":
      return "For security, please confirm your password to continue.";
    case "auth/email-already-in-use":
      return "That email is already in use by another account.";
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/operation-not-allowed":
      return "We can't change the email yet. Please verify the new email first.";
    default:
      return error?.message || "Something went wrong. Please try again.";
  }
}

function apiFriendlyMessage(raw: any) {
  const text = typeof raw === "string" ? raw : raw?.message;

  if (!text) return "Could not save changes. Please try again.";

  try {
    const parsed = JSON.parse(text);
    const err = parsed?.error;
    const msg = parsed?.message;

    if (err === "VALIDATION_ERROR" && msg === "No updates provided.") {
      return "No changes to save.";
    }
    if (err === "FULL_NAME_IMMUTABLE") {
      return "Your name can't be changed once it's set. Contact support if you need a correction.";
    }
    if (err === "DOB_IMMUTABLE") {
      return "Date of birth can't be changed once it's set.";
    }
    if (msg) return msg;
  } catch {
    // ignore
  }

  return text;
}

type FormState = {
  full_name: string;
  email: string;
  phone_e164: string;
  date_of_birth_ymd: string | null;
};

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const dbUser = user as any;

  const fullName =
    dbUser?.full_name ??
    dbUser?.fullName ??
    dbUser?.name ??
    dbUser?.displayName ??
    "";

  const email = dbUser?.email ?? "";
  const phoneE164 =
    dbUser?.phone_e164 ?? dbUser?.phoneNumber ?? dbUser?.phone ?? "";
  const phonePending = dbUser?.phone_pending_e164 ?? null;

  const emailVerified = boolish(
    dbUser?.email_verified ?? dbUser?.emailVerified
  );
  const phoneVerified = boolish(
    dbUser?.phone_verified ?? dbUser?.phoneVerified
  );

  const modeRaw = (dbUser?.mode ?? "guest").toString();
  const modeLabel = cap(modeRaw);

  const providerLabel = formatProviderLabel(dbUser?.provider);
  const lastLoginAt = dbUser?.last_login_at ?? null;

  const kycStatus = (dbUser?.kyc_status ?? "not_started").toString();
  const kycLabel = useMemo(() => {
    const s = kycStatus.toLowerCase();
    if (s === "verified") return "Verified";
    if (s === "pending") return "Pending";
    if (s === "submitted") return "Pending";
    return "Not started";
  }, [kycStatus]);

  const profilePhotoUrl =
    dbUser?.profile_photo_url ??
    dbUser?.photoURL ??
    dbUser?.photoUrl ??
    dbUser?.avatarUrl ??
    null;

  const dobFromDbRaw = dbUser?.date_of_birth ?? null;
  const dobFromDbYmd: string | null =
    typeof dobFromDbRaw === "string"
      ? dobFromDbRaw.slice(0, 10)
      : dobFromDbRaw instanceof Date
      ? toLocalYMD(dobFromDbRaw)
      : dobFromDbRaw
      ? String(dobFromDbRaw).slice(0, 10)
      : null;

  const dobLocked = !!dobFromDbYmd;
  const isVerifiedPill = emailVerified || phoneVerified;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    full_name: fullName || "",
    email: email || "",
    phone_e164: phoneE164 || "",
    date_of_birth_ymd: dobFromDbYmd,
  }));

  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [tempDob, setTempDob] = useState<Date>(() => {
    return (
      (dobFromDbYmd ? parseYMDToLocalDate(dobFromDbYmd) : null) ??
      new Date(2000, 0, 1)
    );
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<
    null | (() => Promise<void>)
  >(null);

  const [pwModalOpen, setPwModalOpen] = useState(false);

  const refreshMe = useCallback(async () => {
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
    if (!res.ok) throw new Error(text || "Failed to refresh user");
    const json = JSON.parse(text);
    if (json?.user) dispatch(updateUser(json.user));
  }, [dispatch]);

  const patchMe = useCallback(async (payload: Record<string, any>) => {
    const current = auth.currentUser;
    const idToken = await current?.getIdToken(true);
    if (!idToken) throw new Error("Missing auth token");

    const res = await fetch(`${API_BASE}/api/users/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || "Failed to update profile");
    const json = JSON.parse(text);
    return json?.user;
  }, []);

  const syncEmailFromFirebaseToDb = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) throw new Error("Not signed in");

    const idToken = await current.getIdToken(true);

    const res = await fetch(`${API_BASE}/api/users/email/sync`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || "Failed to sync email");

    const json = JSON.parse(text);
    if (json?.user) dispatch(updateUser(json.user));
  }, [dispatch]);

  const validate = useCallback((): string | null => {
    const nextEmail = (form.email || "").trim().toLowerCase();
    const nextPhone = (form.phone_e164 || "").trim();

    if (!nextEmail) return "Please enter your email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail))
      return "Please enter a valid email address.";

    if (!nextPhone) return "Please enter your phone number (E.164).";
    if (!/^\+[1-9]\d{7,14}$/.test(nextPhone))
      return "Phone must be a valid E.164 number (e.g. +14165551234).";

    if (!dobLocked && form.date_of_birth_ymd) {
      const picked = parseYMDToLocalDate(form.date_of_birth_ymd);
      if (!picked) return "Invalid date of birth.";
      const max = maxDobDate();
      if (picked.getTime() > max.getTime()) {
        return "You must be 18+ to set your date of birth.";
      }
    }

    return null;
  }, [form.email, form.phone_e164, form.date_of_birth_ymd, dobLocked]);

  const handleToggleEdit = () => {
    if (isEditing) return;

    track("profile_details_edit_tap", { from: "view" });

    setForm({
      full_name: fullName || "",
      email: email || "",
      phone_e164: phonePending ?? phoneE164 ?? "",
      date_of_birth_ymd: dobFromDbYmd,
    });

    setTempDob(
      (dobFromDbYmd ? parseYMDToLocalDate(dobFromDbYmd) : null) ??
        new Date(2000, 0, 1)
    );
    setIsEditing(true);
  };

  const openDobPicker = () => {
    if (!isEditing || dobLocked) return;

    const initial =
      (form.date_of_birth_ymd
        ? parseYMDToLocalDate(form.date_of_birth_ymd)
        : null) ?? new Date(2000, 0, 1);

    setTempDob(initial);
    setDobPickerOpen(true);
    track("profile_details_dob_opened", { from: "profile_details" });
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      track("profile_details_save_blocked", { error });
      Alert.alert("Fix this", error);
      return;
    }

    try {
      setIsSaving(true);

      const nextEmail = (form.email || "").trim().toLowerCase();
      const nextPhone = (form.phone_e164 || "").trim();

      const currentEmail = (email || "").trim().toLowerCase();
      const currentPhone = (phoneE164 || "").trim();
      const currentPendingPhone = (phonePending || "").trim();

      const emailChanged = nextEmail !== currentEmail && nextEmail.length > 0;

      const comparePhone = currentPendingPhone || currentPhone;
      const phoneChanged = nextPhone !== comparePhone && nextPhone.length > 0;

      track("profile_details_save_tap", {
        willSetDob: !dobLocked && !!form.date_of_birth_ymd,
        emailChanged,
        phoneChanged,
      });

      // Handle email change
      // Handle email change
      if (emailChanged) {
        const doEmailFlow = async () => {
          const u = auth.currentUser;
          if (!u) throw new Error("Not signed in");

          await u.reload();
          const freshUser = auth.currentUser;
          if (!freshUser) throw new Error("Could not refresh user state");

          await verifyBeforeUpdateEmail(freshUser, nextEmail);

          setIsSaving(false);
          setIsEditing(false);

          Alert.alert(
            "Verify your new email",
            `We sent a verification link to ${nextEmail}. Open your inbox, tap the link, then come back and tap Continue.`,
            [
              {
                text: "OK",
                onPress: () => {
                  router.push({
                    pathname: "/verify-email",
                    params: {
                      email: nextEmail,
                      next: "/(tabs)/profile-details",
                    },
                  });
                },
              },
            ]
          );
        };

        // ALWAYS require password confirmation for email changes
        setPendingRetry(() => doEmailFlow);
        setReauthOpen(true);
        setIsSaving(false);
        return;
      }

      // Handle phone/DOB changes
      const payload: Record<string, any> = {};

      if (phoneChanged) {
        payload.phone_e164 = nextPhone;
      }

      if (!dobLocked && form.date_of_birth_ymd) {
        payload.date_of_birth = form.date_of_birth_ymd;
      }

      if (Object.keys(payload).length > 0) {
        const updated = await patchMe(payload);
        if (updated) dispatch(updateUser(updated));
      }

      if (phoneChanged) {
        await AsyncStorage.setItem(PENDING_PHONE_KEY, nextPhone);
        setIsSaving(false);
        setIsEditing(false);

        Alert.alert(
          "Verify your phone",
          "We saved your new number. Please verify it to complete the update.",
          [
            {
              text: "OK",
              onPress: () => {
                router.push({
                  pathname: "/verify-phone",
                  params: {
                    next: "/(tabs)/profile-details",
                    from: "profile_details",
                  },
                });
              },
            },
          ]
        );
        return;
      }

      // Refresh and exit edit mode
      await refreshMe();
      setIsEditing(false);
      track("profile_details_save_success", {});

      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      console.warn("save failed", e?.message || e);

      const msg = apiFriendlyMessage(e?.message || e);

      track("profile_details_save_failed", { message: msg });
      Alert.alert("Can't save", firebaseFriendlyMessage(e) || msg);
    } finally {
      setIsSaving(false);
    }
  };

  const pickPhoto = async () => {
    if (isUploadingPhoto) return;
    track("profile_details_photo_pick_tap", {});

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    try {
      setIsUploadingPhoto(true);

      const current = auth.currentUser;
      const idToken = await current?.getIdToken(true);
      if (!idToken) throw new Error("Missing auth token");

      track("profile_details_photo_upload_start", {});

      const contentType = "image/jpeg";

      const presignRes = await fetch(`${API_BASE}/api/uploads/profile-photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType }),
      });

      const presignText = await presignRes.text();
      if (!presignRes.ok)
        throw new Error(presignText || "Failed to prepare upload");

      const presignJson = JSON.parse(presignText);
      const uploadUrl = presignJson?.uploadUrl;
      const publicUrl = presignJson?.publicUrl;

      if (!uploadUrl || !publicUrl)
        throw new Error("Upload URL missing from server response");

      const img = await fetch(asset.uri);
      const blob = await img.blob();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob as any,
      });

      if (!putRes.ok) throw new Error("Upload failed");

      const saveRes = await fetch(`${API_BASE}/api/users/photo`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile_photo_url: publicUrl }),
      });

      const saveText = await saveRes.text();
      if (!saveRes.ok) throw new Error(saveText || "Failed to save photo");

      const saveJson = JSON.parse(saveText);
      if (saveJson?.user) dispatch(updateUser(saveJson.user));
      await refreshMe();

      track("profile_details_photo_upload_success", {});
    } catch (e: any) {
      console.warn("photo upload failed", e?.message || e);
      track("profile_details_photo_upload_failed", {
        message: e?.message || String(e),
      });
      Alert.alert("Upload failed", e?.message || "Could not upload photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // const handleReauthSuccess = async () => {
  //   try {
  //     if (pendingRetry) {
  //       const fn = pendingRetry;
  //       setPendingRetry(null);
  //       setReauthOpen(false);
  //       await fn();
  //     }
  //   } catch (e: any) {
  //     Alert.alert("Couldn't continue", firebaseFriendlyMessage(e));
  //   }
  // };

  const handleReauthSuccess = async () => {
    const fn = pendingRetry;
    setPendingRetry(null);
    setReauthOpen(false);

    if (!fn) return;

    try {
      setIsSaving(true);
      await fn();
    } catch (e: any) {
      Alert.alert("Couldn't continue", firebaseFriendlyMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const displayedPhone = phonePending
    ? `${phonePending} (pending)`
    : phoneE164 || "Not set";
  const kycIsVerified = kycLabel === "Verified";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={20} color="#111827" />
        </Pressable>

        <View style={{ width: 140 }}>
          {isEditing ? (
            <Button
              title={isSaving ? "Saving..." : "Save"}
              variant="secondary"
              size="sm"
              onPress={handleSave}
              disabled={isSaving}
            />
          ) : (
            <Button
              title="Edit"
              variant="secondary"
              size="sm"
              onPress={handleToggleEdit}
            />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.avatarWrap}>
              {profilePhotoUrl ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>
                    {(
                      fullName?.trim()?.[0] ||
                      email?.trim()?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => [
                  styles.cameraBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <Feather name="camera" size={14} color="#111827" />
                )}
              </Pressable>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.nameText} numberOfLines={1}>
                {fullName?.trim()?.length ? fullName : "Not set"}
              </Text>
              <Text style={styles.emailText} numberOfLines={1}>
                {email || "Not set"}
              </Text>

              <View style={styles.pillsRow}>
                <View style={styles.modePill}>
                  <Feather name="user" size={12} color="rgba(17,24,39,0.70)" />
                  <Text style={styles.modePillText}>{modeLabel} mode</Text>
                </View>

                <View
                  style={[
                    styles.verifiedPill,
                    !isVerifiedPill && styles.notVerifiedPill,
                  ]}
                >
                  <Feather
                    name={isVerifiedPill ? "check" : "alert-circle"}
                    size={12}
                    color={
                      isVerifiedPill
                        ? "rgba(16,185,129,0.95)"
                        : "rgba(245,158,11,0.95)"
                    }
                  />
                  <Text
                    style={[
                      styles.verifiedPillText,
                      !isVerifiedPill && styles.notVerifiedText,
                    ]}
                  >
                    {isVerifiedPill ? "Verified" : "Not verified"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <RowLabel label="Full name" locked />
          <RowPlainLocked value={fullName || "Not set"} />

          <Spacer />
          <RowLabel label="Email" />
          {isEditing ? (
            <EditableInput
              value={form.email}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              onChange={(t) => setForm((p) => ({ ...p, email: t }))}
            />
          ) : (
            <RowValue value={email || "Not set"} />
          )}

          <Spacer />
          <RowLabel label="Phone (E.164)" />
          {isEditing ? (
            <EditableInput
              value={form.phone_e164}
              placeholder="+14165551234"
              keyboardType="phone-pad"
              autoCapitalize="none"
              onChange={(t) => setForm((p) => ({ ...p, phone_e164: t }))}
            />
          ) : (
            <RowValue value={displayedPhone} subtle={!!phonePending} />
          )}

          <Spacer />
          <RowLabel label="Date of birth" locked={dobLocked} />
          {dobLocked ? (
            <RowPlainLocked value={dobFromDbYmd || "Not set"} lockOnly />
          ) : (
            <Pressable
              onPress={openDobPicker}
              disabled={!isEditing}
              style={({ pressed }) => [
                styles.rowPress,
                pressed && isEditing && styles.pressedRow,
                !isEditing && styles.rowDisabled,
              ]}
            >
              <Text style={styles.valueText}>
                {form.date_of_birth_ymd ? form.date_of_birth_ymd : "Not set"}
              </Text>
              <Feather
                name="chevron-right"
                size={18}
                color="rgba(17,24,39,0.28)"
              />
            </Pressable>
          )}

          <Text style={styles.helperText}>
            {dobLocked
              ? "Date of birth can't be changed once set."
              : "You must be 18+ to set your date of birth."}
          </Text>

          <View style={{ height: 12 }} />

          <Button
            title="Change password"
            variant="secondary"
            onPress={() => setPwModalOpen(true)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <DividerSmall />

          <KeyValueRow label="Mode" value={modeLabel} />
          <DividerSmall />
          <KeyValueRow label="Provider" value={providerLabel} />
          <DividerSmall />
          <KeyValueRow
            label="Last login"
            value={formatLastLogin(lastLoginAt)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>VERIFICATION</Text>
          <DividerSmall />

          <KeyValueRow
            label="Email verified"
            value={emailVerified ? "Yes" : "No"}
            valueTone={emailVerified ? "good" : "bad"}
          />
          <DividerSmall />
          <KeyValueRow
            label="Phone verified"
            value={phoneVerified ? "Yes" : "No"}
            valueTone={phoneVerified ? "good" : "bad"}
          />
          <DividerSmall />
          <KeyValueRow label="KYC status" value={kycLabel} valueTone="warn" />

          {!kycIsVerified ? (
            <View style={{ marginTop: 14 }}>
              <Button
                title="Start KYC"
                variant="primary"
                onPress={() => {
                  Alert.alert("KYC", "KYC flow coming soon.");
                }}
              />
            </View>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <DobPickerModal
        visible={dobPickerOpen}
        value={tempDob}
        maximumDate={maxDobDate()}
        onClose={() => setDobPickerOpen(false)}
        onSelect={(d) => {
          const ymd = toLocalYMD(d);
          setTempDob(d);
          setForm((p) => ({ ...p, date_of_birth_ymd: ymd }));
          track("profile_details_dob_selected", { value: ymd });
        }}
      />

      <ReauthPasswordModal
        visible={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={handleReauthSuccess}
      />

      <ChangePasswordModal
        visible={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
      />
    </SafeAreaView>
  );
}

function RowLabel({ label, locked }: { label: string; locked?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.labelText}>{label}</Text>
      {locked ? (
        <View style={styles.lockBadge}>
          <Feather name="lock" size={12} color="rgba(17,24,39,0.55)" />
          <Text style={styles.lockText}>Locked</Text>
        </View>
      ) : null}
    </View>
  );
}

function RowValue({ value, subtle }: { value: string; subtle?: boolean }) {
  return (
    <Text
      style={[styles.valueText, subtle && { color: "rgba(17,24,39,0.55)" }]}
    >
      {value}
    </Text>
  );
}

function RowPlainLocked({
  value,
  lockOnly,
}: {
  value: string;
  lockOnly?: boolean;
}) {
  return (
    <View style={styles.plainRow}>
      <Text style={styles.valueText}>{value}</Text>
      {lockOnly ? (
        <Feather name="lock" size={14} color="rgba(17,24,39,0.45)" />
      ) : null}
    </View>
  );
}

function Spacer() {
  return <View style={{ height: 18 }} />;
}

function DividerSmall() {
  return <View style={styles.dividerSmall} />;
}

function KeyValueRow({
  label,
  value,
  valueTone,
}: {
  label: string;
  value: string;
  valueTone?: "good" | "bad" | "warn";
}) {
  const toneStyle =
    valueTone === "good"
      ? styles.toneGood
      : valueTone === "bad"
      ? styles.toneBad
      : valueTone === "warn"
      ? styles.toneWarn
      : null;

  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, toneStyle]}>{value}</Text>
    </View>
  );
}

function EditableInput({
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const [TextInput] = React.useState(() => require("react-native").TextInput);

  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="rgba(17,24,39,0.35)"
      style={styles.input}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      returnKeyType="done"
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F7FB" },
  scroll: { paddingHorizontal: 18, paddingBottom: 20 },

  headerRow: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F6F7FB",
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 7,
    marginTop: 14,
  },

  topRow: { flexDirection: "row", alignItems: "center" },

  avatarWrap: { width: 84, height: 84, borderRadius: 42, position: "relative" },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(17,24,39,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 30,
    fontWeight: "900",
    color: "rgba(17,24,39,0.65)",
  },

  cameraBtn: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  nameText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  emailText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.45)",
    marginBottom: 10,
  },

  pillsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.75)",
  },

  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.18)",
  },
  notVerifiedPill: {
    backgroundColor: "rgba(245,158,11,0.10)",
    borderColor: "rgba(245,158,11,0.18)",
  },
  verifiedPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(16,185,129,0.95)",
  },
  notVerifiedText: { color: "rgba(245,158,11,0.95)" },

  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginTop: 16,
    marginBottom: 16,
  },
  dividerSmall: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 14,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.35)",
    letterSpacing: 0.8,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.40)",
    marginBottom: 6,
  },

  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    marginBottom: 6,
  },
  lockText: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  valueText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  plainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },

  input: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  rowPress: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressedRow: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  rowDisabled: { opacity: 0.55 },

  helperText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(17,24,39,0.40)",
  },

  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kvLabel: { fontSize: 13, fontWeight: "800", color: "rgba(17,24,39,0.40)" },
  kvValue: { fontSize: 14, fontWeight: "900", color: "#111827" },

  toneGood: { color: "rgba(16,185,129,0.95)" },
  toneBad: { color: "rgba(239,68,68,0.85)" },
  toneWarn: { color: "rgba(217,119,6,0.95)" },

  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
});
