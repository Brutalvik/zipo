import AsyncStorage from "@react-native-async-storage/async-storage";

const FIRST_LAUNCH_KEY = "@Zipo:hasLaunchedBefore";

export const setFirstLaunch = async () => {
  try {
    await AsyncStorage.setItem(FIRST_LAUNCH_KEY, "true");
    console.log("Set first launch flag successfully.");
  } catch (e) {
    console.error("Failed to set first launch flag", e);
  }
};

export const getFirstLaunchStatus = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
    // If value is null, it means it's the first launch (return false)
    return value === "true";
  } catch (e) {
    console.error("Failed to get first launch status", e);
    return false; // Default to showing standard screen on error
  }
};
