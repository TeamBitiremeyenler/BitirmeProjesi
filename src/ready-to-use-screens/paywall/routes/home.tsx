import React, { FC } from "react";
import { View } from "react-native";
import { DummyHeader } from "../components/home/custom-header/dummy-header";
import { Favorites } from "../components/home/favorites";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeAnimationProvider } from "../lib/providers/home-animation";
import { AnimatedBlur } from "../components/home/animated-blur";
import { CommandsList } from "../components/home/commands-list";
import { AnimatedChevron } from "../components/home/animated-chevron";
import { useAndroidNote } from "./use-android-note";
import { RealHeader } from "../components/home/custom-header/real-header";

// raycast-home-search-transition-animation 🔽

export const Home: FC = () => {
  useAndroidNote(
    "Android doesn't support scroll in negative direction, so the animation is limited. Blur is still experimental on Android; to avoid performance issues, use a solid background color instead of blur."
  );

  const insets = useSafeAreaInsets();

  return (
    // Centralizes shared animated values (offsetY, blurIntensity, screenView)
    // for all child components without prop drilling.
    <HomeAnimationProvider>
      <View className="flex-1 bg-neutral-900">
        {/* Favorites is the default view; list drives offsetY/blurIntensity. */}
        <Favorites />
        {/* DummyHeader sits behind RealHeader to avoid layout shift during transitions. */}
        <DummyHeader />
        <View
          className="absolute left-5 right-5 h-[100px] rounded-[24px] bg-neutral-200/10 mb-2"
          style={{ bottom: insets.bottom + 8 }}
        />
        {/* Fullscreen blur layer controlled by shared blurIntensity. Absolute to cover content. */}
        <AnimatedBlur />
        {/* Commands list overlays favorites during pull, pointerEvents toggled via state. */}
        <CommandsList />
        {/* Chevron occupies the gap revealed by negative pull; absolute for precise anchoring. */}
        <AnimatedChevron />
        {/* RealHeader is interactive (search/cancel/side buttons) with high z-index. */}
        <RealHeader />
      </View>
    </HomeAnimationProvider>
  );
};

// raycast-home-search-transition-animation 🔼
