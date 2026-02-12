import { FC, RefObject } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useClearRefinements, useInstantSearch, useSearchBox } from "react-instantsearch-core";
import { AppText } from "../app-text";
import { useRefinementStatus } from "../../lib/hooks/use-refinement-status";
import Animated, { LinearTransition } from "react-native-reanimated";
import { cn } from "../../lib/utils/cn";
import { fireHaptic } from "../../lib/utils/fire-haptic";
import { FlashListRef } from "@shopify/flash-list";
import { Animation } from "../../lib/types/app";
import { useAnimationsStore } from "../../lib/store/animations";
import WithShimmer from "../with-shimmer";

type NumberOfAnimationsProps = {
  listRef: RefObject<FlashListRef<Animation> | null>;
};

/**
 * NumberOfAnimations component - displays the total count of animations
 * Uses Algolia's useHits hook to get the total number of results
 */
export const NumberOfAnimations: FC<NumberOfAnimationsProps> = ({ listRef }) => {
  const { results } = useInstantSearch();
  const count = results?.nbHits ?? 0;

  const { hasRefinements } = useRefinementStatus();

  const { clear: clearSearch } = useSearchBox();
  const { refine: refineFilters } = useClearRefinements();

  const clearQuery = useAnimationsStore.use.clearQuery();

  const handleReset = () => {
    fireHaptic();
    clearSearch();
    clearQuery();
    refineFilters();
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 300);
  };

  return (
    <View
      className="px-6 py-3 border-neutral-700/75 flex-row items-center justify-between"
      style={{ borderBottomWidth: StyleSheet.hairlineWidth }}
    >
      <View className={cn("flex-1 items-center", hasRefinements && "items-start")}>
        <Animated.View layout={LinearTransition.springify()}>
          {count === 0 && hasRefinements ? (
            <AppText className="text-base text-muted-foreground font-sans-medium">
              No animations found
            </AppText>
          ) : (
            <WithShimmer
              delay={3}
              colors={{ start: "#B2ACA9", middle: "#FFFFF5", end: "#B2ACA9" }}
              containerStyle={{
                width: Platform.OS === "android" ? 160 : 155,
                alignItems: "center",
              }}
            >
              <AppText className="text-base font-sans-medium" maxFontSizeMultiplier={1}>
                {`${count} awesome animations`}
              </AppText>
            </WithShimmer>
          )}
        </Animated.View>
      </View>
      {hasRefinements && (
        <View className="flex-1 items-end">
          <Pressable onPress={handleReset} hitSlop={12}>
            <AppText className="text-base text-brand">Reset</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
};
