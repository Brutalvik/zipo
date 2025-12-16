// components/ReauthPasswordModal.tsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { auth } from "@/services/firebase";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

function friendlyAuthError(err: any) {
  const code = err?.code ?? "";
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "That password doesn't look right. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a bit and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
    default:
      return (
        err?.message || "Couldn't confirm your password. Please try again."
      );
  }
}

export default function ReauthPasswordModal({
  visible,
  onClose,
  onSuccess,
}: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const email = useMemo(() => auth.currentUser?.email ?? "", [visible]);

  const handleCancel = () => {
    if (busy) return;
    setPassword("");
    setShowPw(false);
    onClose();
  };

  const handleConfirm = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert("Not signed in", "Please sign in again.");
      handleCancel();
      return;
    }
    if (!password.trim()) {
      Alert.alert(
        "Password required",
        "Please enter your password to continue."
      );
      return;
    }

    try {
      setBusy(true);

      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);

      setPassword("");
      setShowPw(false);
      onClose();
      await onSuccess();
    } catch (e: any) {
      Alert.alert("Can't continue", friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.backdrop} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>Confirm your password</Text>
            <Text style={styles.subtitle}>
              For security, please re-enter your password to continue.
            </Text>

            <Text style={styles.label}>Password</Text>

            <View style={styles.pwRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="rgba(17,24,39,0.35)"
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
              />

              <Pressable
                onPress={() => setShowPw((p) => !p)}
                style={({ pressed }) => [
                  styles.eyeBtn,
                  pressed && !busy && { opacity: 0.7 },
                  busy && { opacity: 0.5 },
                ]}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={showPw ? "Hide password" : "Show password"}
              >
                <Feather
                  name={showPw ? "eye" : "eye-off"}
                  size={18}
                  color="#111827"
                />
              </Pressable>
            </View>

            <View style={styles.btnStack}>
              <Pressable
                onPress={handleConfirm}
                disabled={busy}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed &&
                    !busy && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  busy && { opacity: 0.7 },
                ]}
              >
                {busy ? (
                  <View style={styles.rowCenter}>
                    <ActivityIndicator color="#fff" />
                    <Text style={[styles.primaryText, { marginLeft: 10 }]}>
                      Confirming…
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryText}>Confirm</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleCancel}
                disabled={busy}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed &&
                    !busy && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  busy && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  kav: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.55)",
  },

  label: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },

  pwRow: { position: "relative" },
  input: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 44,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  btnStack: { marginTop: 16, gap: 10 },
  primaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  secondaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.04)",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#111827", fontSize: 15, fontWeight: "900" },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
