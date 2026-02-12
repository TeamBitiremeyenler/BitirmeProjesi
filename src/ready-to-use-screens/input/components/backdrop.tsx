import { FC } from "react";
import { BottomSheetBackdropProps, useBottomSheet } from "@gorhom/bottom-sheet";
import { StyleSheet } from "react-native";
import Animated, {
  interpolate,
  Extrapolation,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Pressable } from "react-native";

// perplexity-bottom-sheet-backdrop-animation 🔽

// Using Animated.createAnimatedComponent so Reanimated can drive props/styles of non-animated primitives.
// - AnimatedPressable: lets us toggle pointerEvents on the UI thread based on sheet index (prevents touches when closed)
// - AnimatedBlurView: enables animating BlurView's intensity prop without JS bridge overhead
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const Backdrop: FC<BottomSheetBackdropProps> = ({ animatedIndex }) => {
  const { close } = useBottomSheet();

  // Purpose: disable interactions when sheet is hidden (index < 0) and re-enable when shown.
  const rPressableStyle = useAnimatedStyle(() => {
    return {
      pointerEvents: animatedIndex.get() >= 0 ? "auto" : "none",
    };
  });

  // Animation intent: map bottom sheet index [-1 (hidden) → 0 (expanded threshold)]
  // to a subtle blur intensity [0 → maxIntensity]. CLAMP prevents over-blurring when overshooting.
  const animatedIntensity = useAnimatedProps(() => {
    // Magic number: 30 chosen for iOS dark tint to match Perplexity's soft backdrop without muddying text.
    const maxIntensity = 30;

    const intensity = interpolate(
      animatedIndex.get(),
      [-1, 0],
      [0, maxIntensity],
      Extrapolation.CLAMP
    );

    return {
      intensity,
    };
  });

  return (
    <AnimatedPressable className="absolute inset-0" style={rPressableStyle} onPress={() => close()}>
      <AnimatedBlurView
        animatedProps={animatedIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
    </AnimatedPressable>
  );
};

// perplexity-bottom-sheet-backdrop-animation 🔼
