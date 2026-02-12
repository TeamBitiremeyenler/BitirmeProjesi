import React, { FC } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { SETTINGS_CONTAINER_WIDTH } from "../../../lib/providers/home-animation";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";

// raycast-home-search-transition-animation 🔽

export const SettingsButton: FC = () => {
  return (
    <Pressable
      onPress={simulatePress}
      className="items-center justify-center"
      style={styles.imageContainer}
    >
      <Image placeholder={{ blurhash: "LKO2:N%2Tw=w]~RBVZRi};RPxuwH" }} style={styles.image} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    // Why: Fixed container width feeds searchbar width math; keeps alignment symmetrical.
    width: SETTINGS_CONTAINER_WIDTH,
  },
  image: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "white",
  },
});

// raycast-home-search-transition-animation 🔼
