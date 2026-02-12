import { FC, useEffect } from "react";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { AppText } from "../../app-text";
import { useAppStore } from "../../../lib/store/app";
import { View } from "react-native";

/**
 * Component that displays a friendly message when an update is coming.
 * Shown when a deep link contains the last href from the apps list.
 * Automatically hides after 5000ms.
 */
export const UpdateComingMessage: FC = () => {
  const showUpdateComingMessage = useAppStore.use.showUpdateComingMessage();
  const setShowUpdateComingMessage = useAppStore.use.setShowUpdateComingMessage();
  const isOtaUpdateAvailable = useAppStore.use.isOtaUpdateAvailable();

  useEffect(() => {
    if (showUpdateComingMessage) {
      const timeoutId = setTimeout(() => {
        setShowUpdateComingMessage(false);
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [showUpdateComingMessage, setShowUpdateComingMessage]);

  if (!showUpdateComingMessage || isOtaUpdateAvailable) {
    return null;
  }

  return (
    <Animated.View
      key="update-coming-message"
      entering={FadeInDown.springify()}
      exiting={FadeOutDown.springify()}
      className="absolute left-0 right-0 bottom-4 h-12 items-center justify-center"
    >
      <View className="h-full px-5 bg-neutral-700 rounded-full flex-row items-center justify-center gap-2">
        <AppText className="text-lg text-foreground">⏳ Wait a sec, update is coming</AppText>
      </View>
    </Animated.View>
  );
};
