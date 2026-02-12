import React, { FC } from "react";
import { Pressable } from "react-native";
import { EDIT_HOME_CONTAINER_WIDTH } from "../../../lib/providers/home-animation";
import { Settings2 } from "lucide-react-native";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";

// raycast-home-search-transition-animation 🔽

export const EditHomeButton: FC = () => {
  return (
    <Pressable
      onPress={simulatePress}
      className="items-center justify-center"
      // Why: Fixed container width participates in searchbar width calculation
      // for symmetric spacing around the input.
      style={{ width: EDIT_HOME_CONTAINER_WIDTH }}
    >
      <Settings2 size={24} color="#e5e5e5" />
    </Pressable>
  );
};

// raycast-home-search-transition-animation 🔼
