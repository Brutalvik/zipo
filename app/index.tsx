// app/index.tsx
import React from "react";
import ModeGate from "@/components/mode/ModeGate";
import OnboardingSlides from "@/components/onboarding/OnboardingSlides";

export default function Index() {
  return (
    <ModeGate
      unauthenticated={<OnboardingSlides />}
      hostHref="/(hosttabs)/hub"
      guestHref="/(tabs)"
    />
  );
}
