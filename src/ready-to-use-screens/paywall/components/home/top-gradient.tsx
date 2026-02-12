import { LinearGradient } from "expo-linear-gradient";
import React, { FC } from "react";
import { Platform, StyleSheet } from "react-native";
import { colorKit } from "reanimated-color-picker";
import { useHeaderHeight } from "../../lib/hooks/use-header-height";
import { BlurView } from "expo-blur";
import MaskedView from "@react-native-masked-view/masked-view";

// raycast-home-search-transition-animation 🔽

export const TopGradient: FC = () => {
  const { grossHeight } = useHeaderHeight();

  if (Platform.OS === "android") {
    // Why: Use pure gradient on Android—software blur is expensive and inconsistent across devices.
    // 0.9 → 0 alpha creates a soft fade; height * 1.2 covers overscroll and header parallax.
    return (
      <LinearGradient
        style={[StyleSheet.absoluteFillObject, { height: grossHeight * 1.2 }]}
        colors={[colorKit.setAlpha("#171717", 0.9).hex(), colorKit.setAlpha("#171717", 0).hex()]}
        locations={[0.75, 1]}
      />
    );
  }

  return (
    // Why: On iOS, combine BlurView with a gradient mask to mimic native frosted header
    // while keeping edges feathered. MaskedView applies transparency via the gradient.
    <MaskedView
      maskElement={
        <LinearGradient
          locations={[0.75, 1]}
          colors={["black", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
      }
      style={[StyleSheet.absoluteFill, { height: grossHeight * 1.2 }]}
    >
      {/* Why: Dark tint matches app theme; actual blur amount is handled externally when needed. */}
      <BlurView tint="dark" style={StyleSheet.absoluteFill} />
    </MaskedView>
  );
};

// raycast-home-search-transition-animation 🔼
