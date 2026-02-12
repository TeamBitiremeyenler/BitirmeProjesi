import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { useHomeAnimation } from "../../lib/providers/home-animation";

// raycast-home-search-transition-animation 🔽

// Why: BlurView isn't natively animated by Reanimated.
// Wrapping with createAnimatedComponent lets us drive props (intensity) on the UI thread
// for smooth 60fps transitions. See docs: createAnimatedComponent.
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const AnimatedBlur = () => {
  const { blurIntensity } = useHomeAnimation();

  // Why: Use animatedProps to update intensity without re-rendering React tree.
  // blurIntensity is a shared value controlled by provider and scroll.
  const backdropAnimatedProps = useAnimatedProps(() => {
    return {
      intensity: blurIntensity.value,
    };
  });

  return (
    <AnimatedBlurView
      tint="dark"
      style={[StyleSheet.absoluteFill, styles.container]}
      animatedProps={backdropAnimatedProps}
      // Why: dimezisBlurView uses fast-path blur on iOS and a software fallback on Android.
      // Android blur is experimental; prefer lower intensities for perf.
      experimentalBlurMethod="dimezisBlurView"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    // Why: Blur is purely visual background; block interactions from being captured here.
    pointerEvents: "none",
  },
});

// raycast-home-search-transition-animation 🔼
