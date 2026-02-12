import { cn } from "@/src/shared/lib/utils/cn";
import React, { FC } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FULL_DRAG_DISTANCE,
  TRIGGER_DRAG_DISTANCE,
  useHomeAnimation,
} from "../../lib/providers/home-animation";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useHeaderHeight } from "../../lib/hooks/use-header-height";
import { useHapticOnScroll } from "@/src/shared/lib/hooks/use-haptic-on-scroll";
import { useScrollDirection } from "@/src/shared/lib/hooks/use-scroll-direction";
import { TopGradient } from "./top-gradient";
import { scheduleOnRN } from "react-native-worklets";

// raycast-home-search-transition-animation 🔽

type FavoriteItemProps = {
  iconClassName?: string;
  labelClassName?: string;
};

const FavoriteItem: FC<FavoriteItemProps> = ({ iconClassName, labelClassName }) => {
  return (
    <View className="flex-1 gap-3 items-center justify-center">
      <View className={cn("w-14 h-14 rounded-2xl", iconClassName)} style={styles.borderCurve} />
      <View className={cn("h-2 w-5 rounded-full bg-neutral-200/10", labelClassName)} />
    </View>
  );
};

export const Favorites = () => {
  const insets = useSafeAreaInsets();
  const { grossHeight } = useHeaderHeight();

  const { screenView, offsetY, isListDragging, blurIntensity, onGoToCommands } = useHomeAnimation();

  // Why: Track scroll direction including negative pulls to coordinate haptics and thresholds.
  const {
    onScroll: scrollDirectionOnScroll,
    scrollDirection,
    offsetYAnchorOnChangeDirection,
  } = useScrollDirection("include-negative");

  // Why: Provide a single haptic feedback exactly when crossing trigger offset upward.
  const { singleHapticOnScroll } = useHapticOnScroll({
    isListDragging,
    scrollDirection,
    offsetYAnchorOnChangeDirection,
    triggerOffset: TRIGGER_DRAG_DISTANCE,
  });

  // Why: Central scroll handler drives shared values used across components.
  // - offsetY: negative when pulling down
  // - blurIntensity: interpolates 0→100 up to FULL_DRAG_DISTANCE while in favorites
  // - onEndDrag: switches to commands when threshold exceeded
  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => {
      isListDragging.value = true;
    },
    onScroll: (event) => {
      const offsetYValue = event.contentOffset.y;

      offsetY.value = offsetYValue;

      if (screenView.value === "favorites") {
        // Map pull distance to blur intensity; clamp to 0..100 to avoid spikes.
        blurIntensity.value = interpolate(
          offsetYValue,
          [0, FULL_DRAG_DISTANCE],
          [0, 100],
          Extrapolation.CLAMP
        );
      }

      scrollDirectionOnScroll(event);
      singleHapticOnScroll(event);
    },
    onEndDrag: (event) => {
      isListDragging.value = false;
      const scrollY = event.contentOffset.y;
      // Switch to commands when pulled beyond trigger. Use scheduleOnRN to keep UI thread responsive.
      if (scrollY < TRIGGER_DRAG_DISTANCE) {
        scheduleOnRN(onGoToCommands);
      }
    },
  });

  const rContainerStyle = useAnimatedStyle(() => {
    return {
      pointerEvents: screenView.value === "commands" ? "none" : "auto",
    };
  });

  const rTopGradientStyle = useAnimatedStyle(() => {
    return {
      // Why: Keep top gradient on during favorites (non-negative offset) for depth.
      // withTiming smooths appearance/disappearance when toggling views.
      opacity: offsetY.value < 0 ? 0 : screenView.value === "favorites" ? withTiming(1) : 0,
    };
  });

  return (
    <Animated.View className="flex-1" style={rContainerStyle}>
      <Animated.ScrollView
        className="px-5"
        style={{
          paddingBottom: insets.bottom + 8,
          paddingTop: grossHeight + 40,
        }}
        // Why: ~60fps scroll updates for smooth interpolation and haptic thresholding.
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        <View className="flex-row mb-10">
          <FavoriteItem iconClassName="bg-rose-950" />
          <FavoriteItem iconClassName="bg-orange-900" labelClassName="w-10" />
          <FavoriteItem iconClassName="bg-indigo-900" labelClassName="w-16" />
          <FavoriteItem iconClassName="bg-sky-800" labelClassName="w-14" />
        </View>
        <View className="h-3 w-20 rounded-full bg-neutral-200/10 mb-10" />
        <View className="h-8 w-full rounded-xl bg-neutral-700/5 mb-1" />
        <View className="h-8 w-full rounded-xl bg-neutral-700/5 mb-10" />
        <View className="items-center">
          <View className="h-3 w-3/4 rounded-full bg-neutral-200/10 mb-2" />
          <View className="h-3 w-1/2 rounded-full bg-neutral-200/10 mb-4" />
          <View className="h-8 w-32 rounded-xl bg-neutral-200/10 mb-2" />
        </View>
      </Animated.ScrollView>
      <Animated.View
        style={[rTopGradientStyle, StyleSheet.absoluteFillObject, { height: grossHeight }]}
      >
        <TopGradient />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  borderCurve: {
    borderCurve: "continuous",
  },
});

// raycast-home-search-transition-animation 🔼
