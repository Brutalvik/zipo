export type IconFamily = "feather" | "material";

export type TabIcon = {
  family: IconFamily;
  name: string;
};

export type TabConfig = Record<string, { icon: TabIcon; label: string }>;
