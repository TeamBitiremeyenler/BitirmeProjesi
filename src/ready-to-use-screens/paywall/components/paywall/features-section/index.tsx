import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import React, { ReactNode } from "react";
import Animated, { EntryOrExitLayoutType, LinearTransition } from "react-native-reanimated";
import { GradientText } from "@/src/shared/components/gradient-text";

// raycast-paywall-screen-animation 🔽

// Animation notes:
// - This section animates in/out via Reanimated's entering/exiting presets supplied by parent.
// - Layout changes use a springified LinearTransition to keep reflows snappy and consistent across items.
// - We pivot transforms from the bottom to mimic cards growing from the stack baseline (Raycast-style).

interface FeaturesSectionProps {
  title: string;
  children: ReactNode;
  entering?: EntryOrExitLayoutType;
  exiting?: EntryOrExitLayoutType;
}

export const FeaturesSection = ({ title, children, entering, exiting }: FeaturesSectionProps) => {
  return (
    <Animated.View
      // Enter/exit are passed from the parent to coordinate section-level orchestration
      // (keeps stagger/timing decisions centralized while this component stays declarative)
      entering={entering}
      exiting={exiting}
      // Spring layout transition: high stiffness for quick response, high damping to avoid bounce
      // Chosen to settle quickly in dense UI without overshoot when sections mount/reflow
      layout={LinearTransition.springify().damping(85).stiffness(1000)}
      // Pivot from bottom so any scale/size changes feel anchored to the section baseline
      style={{ transformOrigin: "bottom" }}
    >
      <GradientText
        text={title}
        className="text-2xl font-semibold text-center"
        gradientProps={{ colors: ["#a3a3a390", "#fafafa", "#a3a3a390"] }}
      />
      <View
        // overflow-hidden ensures child animations (and blur) are clipped to rounded corners during entry
        className="flex-1 bg-neutral-700/40 border border-neutral-700/10 rounded-3xl mt-5 p-4 overflow-hidden"
        style={styles.container}
      >
        {/* iOS: systemThickMaterialDark gives heavy backdrop blur matching macOS/Raycast feel.
            Android: expo-blur falls back without full material tint parity; kept subtle underlay to avoid perf hits. */}
        <BlurView tint="systemThickMaterialDark" style={StyleSheet.absoluteFill} />
        {children}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    // iOS continuous corners reduce aliasing on dynamic reflow; ignored on platforms that don't support it
    borderCurve: "continuous",
  },
});

export { FeatureItem } from "./feature-item";
export { Divider } from "./divider";

// raycast-paywall-screen-animation 🔼
