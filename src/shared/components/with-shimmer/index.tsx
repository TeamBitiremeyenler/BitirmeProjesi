import MaskedView from "@react-native-masked-view/masked-view";
import React, { useState, isValidElement, useEffect } from "react";
import { StyleSheet, View, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { WithShimmerProps } from "./types";

/**
 * Thanks to furkananter for the original react-native-shimmer-text package
 * @see https://github.com/furkananter/react-native-shimmer-text
 * This component was adapted from the original package and adjusted to meet our specific needs.
 */

/**
 * WithShimmer - A generic wrapper component that adds a shimmer effect to any child component.
 * Automatically measures the child's dimensions and applies a shimmer animation.
 *
 * @param {React.ReactElement} children - The React element to apply shimmer effect to (must be a valid React element)
 * @param {import("react-native").ViewStyle | import("./types").WebShimmerStyle} [shimmerStyle] - Optional style for the shimmer gradient
 * @param {import("react-native").ViewStyle} [containerStyle] - Optional style for the container
 * @param {number} [duration=3] - Animation duration (seconds). Controls how fast the shimmer is passing the width of content. Lower values = faster animation.
 * @param {number} [delay=0] - Delay between shimmer rounds (seconds). Time to wait before starting the next shimmer cycle. Default: 0.
 * @param {number} [highlightWidth] - Shimmer width percentage (0-100). Controls the width of the shimmer highlight band. Defaults to 8% when not provided.
 * @param {"ltr" | "rtl"} [direction="ltr"] - Animation direction: "ltr" (left-to-right) or "rtl" (right-to-left). Default: "ltr".
 * @param {number} [angle=100] - Gradient angle (degrees). Controls the angle of the shimmer gradient. Default: 100.
 * @param {{ light?: Partial<import("./types").ShimmerColors>; dark?: Partial<import("./types").ShimmerColors> }} [colors] - Optional custom shimmer colors for light/dark mode
 * @returns {React.ReactElement} The wrapped component with shimmer effect applied
 */
export function WithShimmer({
  children,
  shimmerStyle,
  containerStyle,
  duration = 3,
  delay = 0,
  highlightWidth,
  direction = "ltr",
  angle = 100,
  colors,
}: WithShimmerProps) {
  // State to track measured dimensions of the children
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  // Shared value for animation translateX
  // Represents percentage offset: -25% to 25% for ltr, 25% to -25% for rtl
  const translateX = useSharedValue(direction === "ltr" ? -25 : 25);

  // Web-specific gradient background property for linear gradient
  const gradientBackground = "experimental_backgroundImage" as const;

  const shimmerColors = {
    ...{ start: "#cccccc", middle: "#ffffff", end: "#cccccc" },
    ...colors,
  };

  // Calculate gradient stop positions for the shimmer highlight band
  // highlightWidth is clamped between 0-100, then converted to gradient stops
  // If not provided, defaults to 8% width (46% to 54% gradient stops)
  const hw = Math.max(0, Math.min(100, highlightWidth ?? NaN));
  const startStop = Number.isFinite(hw) ? 50 - hw / 2 : 46;
  const endStop = Number.isFinite(hw) ? 50 + hw / 2 : 54;

  // Animated style for the gradient that applies the translateX transform
  // Must be called before any conditional returns (React Hook rules)
  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: `${translateX.value}%` }],
    };
  });

  // Start animation when component mounts or when duration/direction/delay changes
  useEffect(() => {
    const startValue = direction === "ltr" ? -25 : 25;
    const endValue = direction === "ltr" ? 25 : -25;

    translateX.value = startValue;

    // Create animation sequence: shimmer animation + delay (if delay > 0)
    const animationSequence =
      delay > 0
        ? withSequence(
            withTiming(endValue, {
              duration: duration * 1000, // Convert seconds to milliseconds
              easing: Easing.linear,
            }),
            withDelay(
              delay * 1000, // Convert seconds to milliseconds
              withTiming(startValue, {
                duration: 0, // Instant return to start position
                easing: Easing.linear,
              })
            )
          )
        : withTiming(endValue, {
            duration: duration * 1000,
            easing: Easing.linear,
          });

    translateX.value = withRepeat(
      animationSequence,
      -1, // Infinite repetition
      false // Don't reverse the animation
    );
  }, [duration, delay, direction, translateX]);

  // Validate that children is a valid React element
  if (!isValidElement(children)) {
    console.warn("WithShimmer: children must be a valid React element");
    return <>{children}</>;
  }

  // Handle layout measurement to get children's natural dimensions
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout;
    if (measuredWidth > 0 && measuredHeight > 0) {
      setWidth(measuredWidth);
      setHeight(measuredHeight);
    }
  };

  // Main render: apply shimmer effect once dimensions are known
  return (
    <View style={containerStyle}>
      {/* Shadow container: invisible measurement element to track size changes */}
      <View style={styles.shadowContainer} onLayout={handleLayout}>
        {children}
      </View>

      {/* MaskedView: uses children as a mask to reveal the animated gradient underneath */}
      <MaskedView
        style={[styles.mask, { width, height }]}
        maskElement={<View style={styles.maskContainer}>{children}</View>}
      >
        {/* Animated gradient: creates the shimmer effect */}
        <Animated.View
          style={[
            styles.gradient,
            {
              // Linear gradient with configurable angle and color stops
              // The gradient creates a highlight band that moves across the content
              [gradientBackground]: `linear-gradient(${angle}deg, ${shimmerColors.start} ${startStop}%, ${shimmerColors.middle} 50%, ${shimmerColors.end} ${endStop}%)`,
            },
            // Animation: translates the gradient horizontally to create shimmer movement
            // Gradient is 300% width with -100% margin, so only middle third is visible
            // Animation moves from -25% to 25% translateX (or reverse for rtl), creating smooth infinite loop
            animatedGradientStyle,
            shimmerStyle,
          ]}
        />
      </MaskedView>
    </View>
  );
}

export default WithShimmer;

const styles = StyleSheet.create({
  shadowContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0,
    pointerEvents: "none",
  },
  mask: {
    overflow: "hidden",
  },
  maskContainer: {
    backgroundColor: "transparent",
  },
  gradient: {
    flex: 1,
    width: "300%",
    marginHorizontal: "-100%",
  },
});
