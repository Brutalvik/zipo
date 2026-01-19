// app/lib/phoneGate.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/services/firebase";

/**
 * Cooldown keys per user:
 * - if user taps "Remind me later", we store a future timestamp.
 */
const remindKey = (uid: string) => `zipo:phone_remind_after:${uid}`;

export type PhoneGateDecision =
  | { ok: true }
  | {
      ok: false;
      reason: "needs_verification" | "cooldown_active";
      remindAfterMs?: number;
    };

export type PhoneGateAnalyticsEvent =
  | "phone_gate_required"
  | "phone_gate_cooldown_active"
  | "phone_skip_session"
  | "phone_remind_later"
  | "phone_verify_success"
  | "phone_verify_failed"
  | "phone_gate_opened";

async function logEvent(
  name: PhoneGateAnalyticsEvent,
  params?: Record<string, any>
) {
  // Works without any analytics package. If expo-firebase-analytics exists, it will log.
  try {
    // optional dependency; safe to fail
    const mod = await import("expo-firebase-analytics" as any);
    // @ts-ignore
    await mod.logEvent(name, params ?? {});
  } catch {
    // fallback no-op
    console.log(`[analytics] ${name}`, params ?? {});
  }
}

export async function setPhoneRemindLater(minutes: number) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const until = Date.now() + minutes * 60 * 1000;
  await AsyncStorage.setItem(remindKey(uid), String(until));
  await logEvent("phone_remind_later", { minutes });
}

export async function clearPhoneRemindLater() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  await AsyncStorage.removeItem(remindKey(uid));
}

export async function getRemindAfterMs(): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) return 0;

  const raw = await AsyncStorage.getItem(remindKey(uid));
  const until = raw ? Number(raw) : 0;
  if (!until || Number.isNaN(until)) return 0;

  const ms = until - Date.now();
  return ms > 0 ? ms : 0;
}

/**
 * Core decision:
 * - If phone verified -> ok
 * - If not verified:
 *    - If cooldown active -> block (cooldown_active)
 *    - Else -> require verification
 */
export async function phoneGateDecision(): Promise<PhoneGateDecision> {
  const user = auth.currentUser;
  const hasPhone = !!user?.phoneNumber;

  if (hasPhone) return { ok: true };

  const remindAfterMs = await getRemindAfterMs();
  if (remindAfterMs > 0) {
    await logEvent("phone_gate_cooldown_active", { remindAfterMs });
    return { ok: false, reason: "cooldown_active", remindAfterMs };
  }

  await logEvent("phone_gate_required");
  return { ok: false, reason: "needs_verification" };
}

/**
 * Convenience:
 * - called when gate is shown
 */
export async function phoneGateOpened(from?: string) {
  await logEvent("phone_gate_opened", { from: from ?? "unknown" });
}

/**
 * convenience:
 * - called when user skips in current session (not persisted)
 */
export async function phoneSkipSession(from?: string) {
  await logEvent("phone_skip_session", { from: from ?? "unknown" });
}

export async function phoneVerifySuccess() {
  await logEvent("phone_verify_success");
  await clearPhoneRemindLater();
}

export async function phoneVerifyFailed(message?: string) {
  await logEvent("phone_verify_failed", { message });
}
