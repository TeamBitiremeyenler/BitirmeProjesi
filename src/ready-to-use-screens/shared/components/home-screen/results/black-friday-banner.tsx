import { FC, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { AppText } from "../../app-text";

/**
 * BlackFridayBanner - A promotional banner component for Black Friday deals.
 * Features a gradient background with animated shimmer effect and coupon code display.
 */
export const BlackFridayBanner: FC = () => {
  // Shared value for shimmer animation translateX
  // Animates from -100% to 100% to create smooth shimmer effect
  const shimmerTranslateX = useSharedValue(-100);

  // Animated style for the shimmer overlay
  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: `${shimmerTranslateX.value}%` }],
    };
  });

  // Start shimmer animation on mount
  useEffect(() => {
    shimmerTranslateX.value = withRepeat(
      withTiming(100, {
        duration: 3000, // 3 seconds for one complete cycle
        easing: Easing.linear,
      }),
      -1, // Infinite repetition
      false // Don't reverse the animation
    );
  }, [shimmerTranslateX]);

  return (
    <View
      className="rounded-[28px] overflow-hidden p-2 border-neutral-600 mb-5"
      style={styles.container}
    >
      {/* Background gradient: emerald-900 via emerald-800 to emerald-700 */}
      <LinearGradient
        colors={["#064e3b", "#065f46", "#047857"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated shimmer overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          shimmerStyle,
          {
            width: "200%",
            marginLeft: "-50%",
          },
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.1)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Content container */}
      <View className="relative z-10 flex-col items-center justify-center px-4 py-3 gap-1">
        <View className="flex-row items-center justify-center flex-wrap gap-1">
          <AppText className="text-base font-sans-semibold text-white">
            🎉 Black Friday Deal - 25% OFF.
          </AppText>
        </View>
        <View className="flex-row items-center justify-center flex-wrap gap-1">
          <AppText className="text-base font-sans-normal text-white">Use code</AppText>
          <View className="rounded-lg bg-white/20 px-2 py-0.5">
            <AppText className="text-base font-sans-bold text-white">BF2025</AppText>
          </View>
          <AppText className="text-base font-sans-normal text-white">at checkout!</AppText>
        </View>
        <AppText className="text-base font-sans-normal text-white/90 mt-0.5">
          Available Nov 27-30, 2025 only
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: Platform.OS === "ios" ? StyleSheet.hairlineWidth : 0,
    borderCurve: "continuous",
  },
});
