import { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

/**
 * @description
 * A custom hook that provides scroll position tracking for React Native ScrollView/FlatList components.
 *
 * This hook simplifies scroll-driven animations by automatically tracking the vertical scroll offset
 * and providing a pre-configured animated scroll handler that runs on the UI thread for optimal performance.
 *
 * @returns An object containing:
 *   - scrollOffsetY: SharedValue<number> - The current vertical scroll position (Y offset)
 *   - scrollHandler: AnimatedScrollHandler - Pre-configured handler to attach to ScrollView's onScroll prop
 */
export const useScrollViewOffset = () => {
  const scrollOffsetY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffsetY.value = event.contentOffset.y;
    },
  });

  return { scrollOffsetY, scrollHandler };
};
