import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export const fireHaptic = (style?: Haptics.ImpactFeedbackStyle) => {
  if (Platform.OS === "android") return;
  Haptics.impactAsync(style || Haptics.ImpactFeedbackStyle.Light);
};
