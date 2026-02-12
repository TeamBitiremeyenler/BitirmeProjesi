import React from "react";
import { View } from "react-native";
import { useHeaderHeight } from "../../../lib/hooks/use-header-height";
import { EditHomeButton } from "./edit-home-button";
import { SettingsButton } from "./settings-button";

// raycast-home-search-transition-animation 🔽

export const DummyHeader = () => {
  const { insetTop, netHeight } = useHeaderHeight();

  return (
    // Why: Placeholder keeps layout stable while the animated RealHeader overlays on top.
    // Matches exact size using insetTop/netHeight to avoid visual jumps on mount.
    <View className="absolute top-0 left-0 right-0" style={{ paddingTop: insetTop }}>
      <View className="flex-row items-center justify-center" style={{ height: netHeight }}>
        <EditHomeButton />
        <View className="flex-1" />
        <SettingsButton />
      </View>
    </View>
  );
};

// raycast-home-search-transition-animation 🔼
