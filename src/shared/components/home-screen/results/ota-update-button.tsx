import { FC } from "react";
import { Pressable } from "react-native";
import { RotateCcw } from "lucide-react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { AppText } from "../../app-text";
import { useAppStore } from "../../../lib/store/app";
import * as Updates from "expo-updates";
import { fireHaptic } from "@/src/shared/lib/utils/fire-haptic";

export const OtaUpdateButton: FC = () => {
  const isOtaUpdateAvailable = useAppStore.use.isOtaUpdateAvailable();

  if (!isOtaUpdateAvailable) {
    return null;
  }

  return (
    <Animated.View
      key="get-updates-button"
      entering={FadeInDown.springify()}
      exiting={FadeOutDown.springify()}
      className="absolute left-0 right-0 bottom-4 h-12 items-center justify-center"
    >
      <Pressable
        className="h-full px-5 bg-neutral-700 rounded-full flex-row items-center justify-center gap-2"
        onPress={() => {
          fireHaptic();
          Updates.reloadAsync();
        }}
      >
        <AppText className="text-lg text-foreground mb-0.5">Get updates</AppText>
        <RotateCcw size={16} color="#FFFFF5" />
      </Pressable>
    </Animated.View>
  );
};
