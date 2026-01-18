import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function CarIdRedirectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;
    router.replace(`/car/car-details?carId=${id}`);
  }, [id, router]);
}
