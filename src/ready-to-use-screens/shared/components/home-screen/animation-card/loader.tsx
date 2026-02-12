import { FC, useEffect } from "react";
import { View, ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { cn } from "../../../lib/utils/cn";

type LoaderProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
} & ViewProps;

const dotSizes = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
};

const containerSizes = {
  sm: "h-4",
  md: "h-5",
  lg: "h-6",
};

/**
 * DotsLoader component - displays three animated dots that bounce in sequence
 * Adapted from React web version to React Native using react-native-reanimated
 */
export const DotsLoader: FC<LoaderProps> = ({ className, size = "md", ...props }) => {
  // Create shared values for each dot's animation progress
  const dot1Progress = useSharedValue(0);
  const dot2Progress = useSharedValue(0);
  const dot3Progress = useSharedValue(0);

  useEffect(() => {
    // Animation duration: 1.4s total (matching original CSS animation)
    const duration = 1400;
    // Easing function that mimics the bounce effect
    const easing = Easing.inOut(Easing.ease);

    // Create the base animation that repeats infinitely
    const baseAnimation = withRepeat(
      withTiming(1, { duration, easing }),
      -1, // Infinite repeat
      false // Don't reverse, start from beginning each cycle
    );

    // Start animations with delays (matching original: 0ms, 160ms, 320ms)
    dot1Progress.value = baseAnimation;
    dot2Progress.value = withDelay(160, baseAnimation);
    dot3Progress.value = withDelay(320, baseAnimation);
  }, [dot1Progress, dot2Progress, dot3Progress]);

  // Animated style for dot 1
  const dot1Style = useAnimatedStyle(() => {
    // Interpolate scale: 0 -> 0.8, 0.5 -> 1.2, 1 -> 0.8
    // This creates the bounce effect: scale(0.8) -> scale(1.2) -> scale(0.8)
    const scale = interpolate(dot1Progress.value, [0, 0.5, 1], [0.8, 1.2, 0.8], "clamp");

    // Interpolate opacity: 0 -> 0.5, 0.5 -> 1, 1 -> 0.5
    // This creates the fade effect: opacity(0.5) -> opacity(1) -> opacity(0.5)
    const opacity = interpolate(dot1Progress.value, [0, 0.5, 1], [0.5, 1, 0.5], "clamp");

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for dot 2
  const dot2Style = useAnimatedStyle(() => {
    const scale = interpolate(dot2Progress.value, [0, 0.5, 1], [0.8, 1.2, 0.8], "clamp");

    const opacity = interpolate(dot2Progress.value, [0, 0.5, 1], [0.5, 1, 0.5], "clamp");

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for dot 3
  const dot3Style = useAnimatedStyle(() => {
    const scale = interpolate(dot3Progress.value, [0, 0.5, 1], [0.8, 1.2, 0.8], "clamp");

    const opacity = interpolate(dot3Progress.value, [0, 0.5, 1], [0.5, 1, 0.5], "clamp");

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View className={cn("flex-row items-center gap-1", containerSizes[size], className)} {...props}>
      <Animated.View className={cn("rounded-full bg-brand", dotSizes[size])} style={dot1Style} />
      <Animated.View className={cn("rounded-full bg-brand", dotSizes[size])} style={dot2Style} />
      <Animated.View className={cn("rounded-full bg-brand", dotSizes[size])} style={dot3Style} />
    </View>
  );
};
