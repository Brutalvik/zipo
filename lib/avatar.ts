import type { ImageSourcePropType } from "react-native";
import { AVATAR_FALLBACK } from "@/assets/images";

export function getAvatar(avatarUrl?: string | null): ImageSourcePropType {
  if (avatarUrl && avatarUrl.trim() !== "") {
    return { uri: avatarUrl };
  }

  return AVATAR_FALLBACK;
}
