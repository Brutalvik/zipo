// app/config/tabConfig.ts
import type { TabConfig } from "./tablcons";

export const GUEST_TAB_CONFIG: TabConfig = {
  index: {
    icon: { family: "feather", name: "home" },
    label: "Home",
  },
  search: {
    icon: { family: "feather", name: "search" },
    label: "Search",
  },
  inbox: {
    icon: { family: "feather", name: "mail" },
    label: "Inbox",
  },
  notifications: {
    icon: { family: "feather", name: "bell" },
    label: "Alerts",
  },
  profile: {
    icon: { family: "feather", name: "user" },
    label: "Profile",
  },
};

export const HOST_TAB_CONFIG: TabConfig = {
  hub: {
    icon: { family: "feather", name: "grid" },
    label: "Hub",
  },
  cars: {
    icon: { family: "material", name: "car-multiple" },
    label: "Cars",
  },
  bookings: {
    icon: { family: "feather", name: "calendar" },
    label: "Bookings",
  },
  earnings: {
    icon: { family: "feather", name: "dollar-sign" },
    label: "Earnings",
  },
  profile: {
    icon: { family: "feather", name: "user" },
    label: "Profile",
  },
};
