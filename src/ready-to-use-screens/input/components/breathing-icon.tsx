import { StyleSheet, View } from "react-native";
import React, { useEffect } from "react";
import { CircleUser, Send } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  interpolate,
  Extrapolation,
  withDelay,
} from "react-native-reanimated";

// perplexity-home-header-animation 🔽

// Ring dimensions: outer defines max expansion, inner defines starting size
// Icon size used for centering calculations
const OUTER_DIAMETER = 60;
const INNER_DIAMETER = 40;
const ICON_SIZE = 24;

const BreathingIcon = () => {
  // Shared value drives the entire animation sequence
  // Range: 0 (start) -> 1 (fully expanded) -> 2 (reset marker)
  const progress = useSharedValue(0);

  useEffect(() => {
    // Infinite breathing animation: expand over 1800ms, pause 500ms, then instant reset
    // Sequence pattern: timing(1) creates expansion, delay+timing(2) marks reset point
    // withRepeat(-1, false): infinite loop, no reverse (always forward)
    progress.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800 }),
          withDelay(500, withTiming(2, { duration: 0 }))
        ),
        -1,
        false
      )
    );
  }, [progress]);

  const rRingStyle = useAnimatedStyle(() => {
    // Size interpolation: delayed start (0.3) creates subtle initial pause
    // Output: 0 -> 0.5 -> 1 maps to ring expansion from inner to outer diameter
    // CLAMP ensures values stay within [0, 1] even if progress exceeds 1
    const sizeProgress = interpolate(progress.get(), [0, 0.3, 1], [0, 0.5, 1], Extrapolation.CLAMP);

    // Calculate ring size: starts at INNER_DIAMETER, expands to OUTER_DIAMETER
    // Border width scales proportionally to maintain visual consistency
    const size = INNER_DIAMETER + (OUTER_DIAMETER - INNER_DIAMETER) * sizeProgress;
    const borderWidth = (size - INNER_DIAMETER) / 2;

    // Opacity fade: starts visible (0.35), gradually fades as ring expands
    // Multi-stage interpolation creates smooth fade-out effect
    // CLAMP prevents negative opacity values
    const opacity = interpolate(
      progress.get(),
      [0, 0.5, 0.9, 1],
      [0.35, 0.29, 0.1, 0],
      Extrapolation.CLAMP
    );

    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      opacity,
    };
  });

  return (
    <>
      {/* Container positions ring absolutely to center it behind the icon */}
      <View style={styles.container}>
        {/* Animated.View: Reanimated's animated component for 60fps performance
            pointerEvents="none": allows taps to pass through to parent Pressable
            Cyan border color (#22d3ee) matches Perplexity brand */}
        <Animated.View
          pointerEvents="none"
          className="absolute border-[#22d3ee]"
          style={rRingStyle}
        />
      </View>
      <Send size={ICON_SIZE} color="black" />
    </>
  );
};

export default BreathingIcon;

const styles = StyleSheet.create({
  // Positioning calculation: centers ring behind icon by offsetting half the size difference
  // Negative offsets move container left/up to align ring center with icon center
  container: {
    width: OUTER_DIAMETER,
    height: OUTER_DIAMETER,
    position: "absolute",
    left: -(OUTER_DIAMETER - ICON_SIZE) / 2,
    top: -(OUTER_DIAMETER - ICON_SIZE) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

// perplexity-home-header-animation 🔼
