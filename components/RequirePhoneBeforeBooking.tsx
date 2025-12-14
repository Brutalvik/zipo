// app/components/RequirePhoneBeforeBooking.tsx
import React from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { phoneGateDecision, phoneGateOpened } from "@/lib/phoneGate";

type Props = {
  children: (args: { onPress: () => void }) => React.ReactNode;
  redirectAfterSuccess?: string; // where to go after verification
  from?: string; // analytics tag
};

export default function RequirePhoneBeforeBooking({
  children,
  redirectAfterSuccess = "/(tabs)",
  from,
}: Props) {
  const router = useRouter();

  const onPress = async () => {
    await phoneGateOpened(from);

    const decision = await phoneGateDecision();

    if (decision.ok) {
      // already verified
      return;
    }

    if (!decision.ok && decision.reason === "cooldown_active") {
      const mins = Math.ceil((decision.remindAfterMs ?? 0) / 60000);
      Alert.alert(
        "Phone verification paused",
        `You chose “Remind me later”. We’ll ask again in about ${mins} minute(s).`
      );
      return;
    }

    // needs verification now -> go to verify-phone and come back
    router.push({
      pathname: "/verify-phone",
      params: {
        next: redirectAfterSuccess,
        from: from ?? "booking",
      },
    });
  };

  return <>{children({ onPress })}</>;
}
