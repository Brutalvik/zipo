import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { auth } from "@/services/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { BRAND } from "@/theme/ui";

export default function ResetPasswordWebScreen() {
  const params = useLocalSearchParams();

  const oobCode = useMemo(
    () => (typeof params?.oobCode === "string" ? params.oobCode : ""),
    [params]
  );
  const mode = useMemo(
    () => (typeof params?.mode === "string" ? params.mode : ""),
    [params]
  );

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [status, setStatus] = useState<"checking" | "ready" | "done" | "error">(
    "checking"
  );
  const [msg, setMsg] = useState<string>("");

  // Try opening the app first (best-effort)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!oobCode) return;

    const deepLink = `zipo://reset-password?oobCode=${encodeURIComponent(oobCode)}&mode=resetPassword`;
    try {
      window.location.href = deepLink;
    } catch {
      // ignore
    }
  }, [oobCode]);

  // Validate code for web fallback
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setStatus("checking");
        setMsg("");

        if (mode && mode !== "resetPassword")
          throw new Error("Invalid reset mode.");
        if (!oobCode) throw new Error("Missing reset code.");

        await verifyPasswordResetCode(auth, oobCode);

        if (!alive) return;
        setStatus("ready");
      } catch (e: any) {
        if (!alive) return;
        setStatus("error");
        setMsg(e?.message || "This reset link is invalid or expired.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [mode, oobCode]);

  async function onSubmit() {
    try {
      setMsg("");

      if (newPass.length < 6) {
        setMsg("Password must be at least 6 characters.");
        return;
      }
      if (newPass !== confirmPass) {
        setMsg("Passwords do not match.");
        return;
      }

      await confirmPasswordReset(auth, oobCode, newPass);
      setStatus("done");
      setMsg(
        "Your password has been updated. You can return to the app and sign in."
      );
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Failed to reset password. Please try again.");
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.shell}>
        {/* Top brand bar */}
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>Z</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandName}>Zipo</Text>
            <Text style={styles.brandTag}>Secure account recovery</Text>
          </View>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.h1}>Reset your password</Text>
          <Text style={styles.p}>
            For your security, this link works for a limited time. If your app
            opens, you can finish there. Otherwise, reset your password here.
          </Text>

          {status === "checking" ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Checking your link…</Text>
              <Text style={styles.bannerBody}>
                Just a moment while we validate your request.
              </Text>
            </View>
          ) : null}

          {status === "ready" ? (
            <>
              <Text style={styles.label}>New password</Text>
              <TextInput
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Enter a new password"
                secureTextEntry
                style={styles.input}
              />

              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Re-enter your new password"
                secureTextEntry
                style={styles.input}
              />

              {msg ? (
                <Text style={[styles.message, styles.messageWarn]}>{msg}</Text>
              ) : null}

              <Pressable
                onPress={onSubmit}
                style={styles.btn}
                accessibilityRole="button"
              >
                <Text style={styles.btnText}>Update password</Text>
              </Pressable>

              <Text style={styles.small}>
                Tip: If you didn’t request this, you can safely close this page.
              </Text>
            </>
          ) : null}

          {status === "done" ? (
            <View style={[styles.banner, styles.bannerOk]}>
              <Text style={[styles.bannerTitle, styles.okTitle]}>
                Password updated
              </Text>
              <Text style={styles.bannerBody}>{msg}</Text>
            </View>
          ) : null}

          {status === "error" ? (
            <View style={[styles.banner, styles.bannerErr]}>
              <Text style={[styles.bannerTitle, styles.errTitle]}>
                Reset link problem
              </Text>
              <Text style={styles.bannerBody}>
                {msg ||
                  "This reset link is invalid or expired. Please request a new reset email from the app."}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} Zipo • If you need help, contact support.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: BRAND.bg,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  shell: {
    width: "100%",
    maxWidth: 520,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  brandName: { fontSize: 22, fontWeight: "900", color: BRAND.text },
  brandTag: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: BRAND.muted,
  },

  card: {
    backgroundColor: BRAND.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 18,
    padding: 18,
  },
  h1: { fontSize: 22, fontWeight: "900", color: BRAND.text },
  p: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    color: BRAND.muted,
  },

  label: { marginTop: 14, fontSize: 12, fontWeight: "900", color: BRAND.text },
  input: {
    marginTop: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "#fff",
  },

  btn: {
    marginTop: 16,
    height: 48,
    borderRadius: 14,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "900" },

  message: { marginTop: 12, fontSize: 12, fontWeight: "800" },
  messageWarn: { color: BRAND.danger },

  banner: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  bannerOk: {
    backgroundColor: "rgba(5,150,105,0.08)",
    borderColor: "rgba(5,150,105,0.25)",
  },
  bannerErr: {
    backgroundColor: "rgba(220,38,38,0.06)",
    borderColor: "rgba(220,38,38,0.25)",
  },
  bannerTitle: { fontSize: 14, fontWeight: "900", color: BRAND.text },
  bannerBody: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: BRAND.muted,
    lineHeight: 16,
  },
  okTitle: { color: BRAND.success },
  errTitle: { color: BRAND.danger },

  small: { marginTop: 12, fontSize: 12, fontWeight: "700", color: BRAND.muted },
  footer: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: BRAND.muted,
  },
});
