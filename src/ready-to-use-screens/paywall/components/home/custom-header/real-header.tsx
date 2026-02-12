import React, { FC } from "react";
import { View } from "react-native";
import { useHeaderHeight } from "../../../lib/hooks/use-header-height";
import { Searchbar } from "./searchbar";
import { CancelButton } from "./cancel-button";
import { EditHomeButton } from "./edit-home-button";
import { SettingsButton } from "./settings-button";
import Animated, { useAnimatedStyle, withDelay, withTiming } from "react-native-reanimated";
import { useHomeAnimation } from "../../../lib/providers/home-animation";

// raycast-home-search-transition-animation 🔽

export const RealHeader: FC = () => {
  const { insetTop, netHeight } = useHeaderHeight();
  const { offsetY, screenView } = useHomeAnimation();

  // Why: Side buttons hide during pull-down and in commands view to reduce clutter
  // and prevent interaction conflicts with the search bar. Delay avoids flashing.
  const rSideButtonsContainerStyle = useAnimatedStyle(() => {
    if (offsetY.value < 0 || screenView.value === "commands") {
      return {
        opacity: 0,
        pointerEvents: "none",
      };
    }

    return {
      opacity: withDelay(300, withTiming(1, { duration: 0 })),
      pointerEvents: "auto",
    };
  });

  return (
    <View
      className="absolute top-0 w-full flex-row items-center justify-end z-[999]"
      // Why: Place above content; pointerEvents box-none lets children receive touches.
      style={{ paddingTop: insetTop, pointerEvents: "box-none" }}
    >
      <Animated.View
        className="absolute w-full flex-row items-center justify-center"
        // Why: Size/position matches header height so side buttons align with search.
        style={[rSideButtonsContainerStyle, { height: netHeight, top: insetTop }]}
      >
        <EditHomeButton />
        <View className="flex-1" />
        <SettingsButton />
      </Animated.View>
      <Searchbar />
      <CancelButton />
    </View>
  );
};

// raycast-home-search-transition-animation 🔼
