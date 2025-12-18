export type IconFamily = "feather" | "material" | "fontawesome";

export type TabIcon = {
  family: IconFamily;
  name: string;
};

export type TabConfig = Record<string, { icon: TabIcon; label: string }>;
