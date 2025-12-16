import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import Button from "@/components/Button/Button";
import { auth } from "@/services/firebase";
import { updatePassword } from "firebase/auth";
import ReauthPasswordModal from "@/components/ReauthPasswordModal";
import { friendlyPasswordAuthError } from "@/utils/authError";

function isStrongPassword(pw: string) {
  // At least 8 chars, one upper, one number, one special
  return (
    pw.length >= 8 &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<
    null | (() => Promise<void>)
  >(null);

  const disabled = useMemo(() => {
    return saving || !oldPw || !newPw || !confirmPw;
  }, [saving, oldPw, newPw, confirmPw]);

  const validate = () => {
    if (newPw !== confirmPw)
      return "New password and confirmation don’t match.";
    if (!isStrongPassword(newPw)) {
      return "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.";
    }
    return null;
  };

  const doUpdate = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    const v = validate();
    if (v) {
      Alert.alert("Fix this", v);
      return;
    }

    try {
      setSaving(true);

      // We *try* to update first. If Firebase demands reauth, we handle it.
      await updatePassword(user, newPw);

      Alert.alert(
        "Password updated",
        "Your password has been updated successfully."
      );
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
      onClose();
    } catch (e: any) {
      if (e?.code === "auth/requires-recent-login") {
        setPendingRetry(async () => {
          const u = auth.currentUser;
          if (!u) return;
          await updatePassword(u, newPw);
          Alert.alert(
            "Password updated",
            "Your password has been updated successfully."
          );
          setOldPw("");
          setNewPw("");
          setConfirmPw("");
          onClose();
        });
        setReauthOpen(true);
        return;
      }

      Alert.alert("Can’t update", friendlyPasswordAuthError(e));
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <View style={styles.sheet}>
            <Text style={styles.title}>Change password</Text>
            <Text style={styles.subtitle}>
              Use a strong password: 8+ chars, uppercase, number, special
              character.
            </Text>

            <View style={{ height: 12 }} />

            <Text style={styles.label}>Old password</Text>
            <TextInput
              value={oldPw}
              onChangeText={setOldPw}
              secureTextEntry
              placeholder="Enter old password"
              placeholderTextColor="rgba(17,24,39,0.35)"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={{ height: 12 }} />

            <Text style={styles.label}>New password</Text>
            <TextInput
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              placeholder="Enter new password"
              placeholderTextColor="rgba(17,24,39,0.35)"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={{ height: 12 }} />

            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
              placeholder="Confirm new password"
              placeholderTextColor="rgba(17,24,39,0.35)"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={{ height: 14 }} />

            <View style={styles.row}>
              <Button title="Cancel" variant="secondary" onPress={onClose} />
              <View style={{ width: 10 }} />
              <Button
                title={saving ? "Saving..." : "Save"}
                variant="primary"
                onPress={doUpdate}
                disabled={disabled}
                isLoading={saving}
              />
            </View>
          </View>
        </View>
      </Modal>

      <ReauthPasswordModal
        visible={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={async () => {
          if (pendingRetry) await pendingRetry();
          setPendingRetry(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: "900", color: "#111827" },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.55)",
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
    marginBottom: 6,
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
  row: { flexDirection: "row", justifyContent: "space-between" },
});
