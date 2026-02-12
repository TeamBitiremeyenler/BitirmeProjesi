import React, { FC } from "react";
import { Text, Pressable } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import {
  CANCEL_CONTAINER_WIDTH,
  SETTINGS_CONTAINER_WIDTH,
  useHomeAnimation,
} from "../../../lib/providers/home-animation";

// raycast-home-search-transition-animation 🔽

// Why: We animate Pressable container width/opacity directly; wrapping lets Reanimated
// update layout on the UI thread without React re-render cycles.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const CancelButton: FC = () => {
  const { screenView, onGoToFavorites } = useHomeAnimation();

  // Why: Expand to CANCEL width and fade in only in commands view.
  // withTiming avoids spring bounce on text/button.
  const rContainerStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(
        screenView.value === "commands" ? CANCEL_CONTAINER_WIDTH : SETTINGS_CONTAINER_WIDTH
      ),
      opacity: screenView.value === "commands" ? withTiming(1) : 0,
      pointerEvents: screenView.value === "commands" ? "auto" : "none",
    };
  });

  return (
    <AnimatedPressable
      onPress={onGoToFavorites}
      className="items-center justify-center z-[999]"
      style={rContainerStyle}
    >
      <Text className="text-neutral-400 font-medium">Cancel</Text>
    </AnimatedPressable>
  );
};

// raycast-home-search-transition-animation 🔼
