import React from "react";
import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { useHeaderHeight } from "../../lib/hooks/use-header-height";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  FULL_DRAG_DISTANCE,
  TRIGGER_DRAG_DISTANCE,
  useHomeAnimation,
} from "../../lib/providers/home-animation";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { TopGradient } from "./top-gradient";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";

// raycast-home-search-transition-animation 🔽

const CommandItem = () => {
  const randomWidth = React.useMemo(() => Math.floor(Math.random() * 151) + 50, []);

  return (
    <Pressable className="flex-row items-center gap-3" onPress={simulatePress}>
      <View className="w-8 h-8 rounded-xl bg-orange-800" />
      <View className="h-3 rounded-full bg-neutral-200/25" style={{ width: randomWidth }} />
    </Pressable>
  );
};

export const CommandsList = () => {
  const insets = useSafeAreaInsets();

  const { grossHeight, netHeight } = useHeaderHeight();

  const { screenView, offsetY } = useHomeAnimation();

  // Why: Fade in commands as user pulls farther (favorites view) or keep fully visible in commands.
  // Opacity maps from 0→1 between 20% and 100% of FULL_DRAG_DISTANCE, clamped to avoid overshoot.
  // translateY negates offsetY so content anchors to header while pulling.
  const rContainerStyle = useAnimatedStyle(() => {
    return {
      opacity:
        screenView.value === "commands"
          ? 1
          : interpolate(
              offsetY.value,
              [FULL_DRAG_DISTANCE * 0.2, FULL_DRAG_DISTANCE],
              [0, 1],
              Extrapolation.CLAMP
            ),
      transform: [{ translateY: -offsetY.value }],
      // Why: Prevent accidental taps when still in favorites.
      pointerEvents: screenView.value === "commands" ? "auto" : "none",
    };
  });

  // Why: Top blur/gradient appears only after threshold to preserve performance and avoid flashing.
  // Slow 1000ms timing feels like a soft veil over content.
  const rTopGradientStyle = useAnimatedStyle(() => {
    return {
      opacity:
        screenView.value === "commands" && offsetY.value > TRIGGER_DRAG_DISTANCE
          ? withTiming(1, { duration: 1000 })
          : 0,
    };
  });

  return (
    <Animated.View className="absolute w-full h-full" style={rContainerStyle}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <FlatList
          data={Array.from({ length: 30 })}
          renderItem={() => <CommandItem />}
          keyExtractor={(_, index) => index.toString()}
          className="flex-1"
          contentContainerClassName="gap-4 px-5"
          contentContainerStyle={{
            paddingTop: grossHeight + 20,
            paddingBottom: insets.bottom + 8,
          }}
          indicatorStyle="white"
          // Why: Keeps native scrollbar clear of absolute header (uses net height only).
          scrollIndicatorInsets={{ top: netHeight + 16 }}
        />
      </KeyboardAvoidingView>
      <Animated.View
        style={[rTopGradientStyle, StyleSheet.absoluteFillObject, { height: grossHeight }]}
      >
        <TopGradient />
      </Animated.View>
    </Animated.View>
  );
};

// raycast-home-search-transition-animation 🔼
