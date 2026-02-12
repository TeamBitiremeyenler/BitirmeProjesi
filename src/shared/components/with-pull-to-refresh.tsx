/**
 * Pull-to-Refresh Higher-Order Component
 *
 * A production-ready, performant pull-to-refresh implementation for React Native using Reanimated.
 * Provides smooth animations, gesture handling, and flexible customization options.
 *
 * @example
 * ```tsx
 * import { Animated } from "react-native-reanimated";
 *
 * // For FlatList and ScrollView, use built-in animated components
 * <WithPullToRefresh
 *   refreshing={isRefreshing}
 *   onRefresh={handleRefresh}
 *   refreshComponent={<CustomLoadingIndicator />}
 * >
 *   <Animated.FlatList data={items} renderItem={...} />
 * </WithPullToRefresh>
 *
 * // For other scrollable components, use createAnimatedComponent
 * const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);
 * <WithPullToRefresh>
 *   <AnimatedSectionList ... />
 * </WithPullToRefresh>
 * ```
 *
 * @remarks
 * **IMPORTANT**: The children component must be an animated component from react-native-reanimated.
 * - For FlatList and ScrollView: Use `Animated.FlatList` and `Animated.ScrollView` directly (built-in)
 * - For other scrollable components: Use `Animated.createAnimatedComponent()` to wrap them
 * This is required for proper gesture handling and scroll event tracking.
 *
 * Special thanks to Matthew (https://x.com/matthew_3701) for sharing a universal pull-to-refresh approach:
 * https://github.com/MatthewSRC/native-springs/blob/main/PullRefresh/PullRefresh.tsx
 * This implementation adapts his idea to our needs.
 */
import React, { cloneElement, createContext, ReactElement, useContext, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  DerivedValue,
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { cn } from "../lib/utils/cn";
import { useScrollDirection } from "../lib/hooks/use-scroll-direction";
import { useHapticOnScroll } from "../lib/hooks/use-haptic-on-scroll";

/**
 * Props for WithPullToRefresh component
 */
interface WithPullToRefreshProps {
  /**
   * The scrollable child component (e.g., Animated.FlatList, Animated.ScrollView).
   * Must be an animated component from react-native-reanimated.
   * @example
   * ```tsx
   * // Built-in animated components
   * <WithPullToRefresh><Animated.FlatList ... /></WithPullToRefresh>
   * <WithPullToRefresh><Animated.ScrollView ... /></WithPullToRefresh>
   *
   * // For other components, use createAnimatedComponent
   * const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);
   * <WithPullToRefresh><AnimatedSectionList ... /></WithPullToRefresh>
   * ```
   */
  children: ReactElement;
  /** Component to display during refresh (e.g., loading indicator) */
  refreshComponent: ReactElement;
  /**
   * Pull distance in pixels needed to trigger refresh.
   * @default 200
   * @remarks Matches header base height by default to keep visual/behavioral thresholds aligned.
   * Tune per screen density for optimal UX.
   */
  refreshThreshold?: number;
  /** Whether refresh is currently in progress */
  refreshing: boolean;
  /** Callback invoked when refresh is triggered */
  onRefresh: () => void;
  /**
   * Resting height for the refresh view while loading.
   * @default 200
   * @remarks Keeps indicator visible after release; large enough for spinners/labels but not obstructive.
   */
  refreshViewBaseHeight?: number;
  /**
   * When true, keeps header locked at the exact release height.
   * @default false
   * @remarks Useful when indicator layout needs extra space for a snappier feel.
   */
  lockRefreshViewOnRelease?: boolean;
  /**
   * Duration in milliseconds for the snap-back animation.
   * @default 400
   * @remarks Applied when not refreshing and when refresh ends. 400ms provides natural deceleration.
   */
  backAnimationDuration?: number;
  /** Additional className for the refresh component container */
  refreshComponentContainerClassName?: string;
  /**
   * Direction for haptic feedback triggers.
   * @default "both"
   * @remarks "to-bottom" triggers only on downward pulls, "both" triggers on both directions.
   */
  hapticFeedbackDirection?: "to-bottom" | "both";
  /**
   * Factor to divide rawRefreshContainerHeight by to create elastic damping effect.
   * @default 1
   * @remarks Higher values create more damping (e.g., 3 = 1/3 movement). Default 1 means no damping.
   */
  dampingFactor?: number;
  /**
   * Offset added to refreshThreshold when calculating refreshProgress.
   * @default 0
   * @remarks Allows fine-tuning progress calculation without changing the actual refresh trigger threshold.
   */
  refreshThresholdOffset?: number;
}

// ============================================================================
// Context & Hook
// ============================================================================

/**
 * Context value provided by WithPullToRefresh component.
 * Accessible via usePullToRefresh() hook.
 */
interface PullToRefreshContextValue {
  /** Whether refresh is currently in progress */
  refreshing: boolean;
  /**
   * Normalized progress value (0-1) for refresh indicator animations.
   * Derived from rawRefreshContainerHeight, independent of actual pixel distance.
   */
  refreshProgress: DerivedValue<number>;
  /**
   * Raw container height that equals user pull offsetY in 1:1 coefficient.
   * Use this for advanced consumers needing exact pull distance.
   */
  rawRefreshContainerHeight: SharedValue<number>;
  /**
   * Displayed height of the refresh container (after damping).
   * Used by the HOC to size the refresh container.
   */
  displayedRefreshContainerHeight: DerivedValue<number>;
  /**
   * Snapshot of release position for lock-on-release behavior.
   * Only relevant when lockRefreshViewOnRelease is true.
   */
  lockedRefreshContainerHeight: SharedValue<number>;
  /** Base height for the refresh view */
  refreshViewBaseHeight: number;
  /**
   * SharedValue flag indicating if refresh has completed.
   * True when refreshing transitions from true to false, false otherwise.
   * Accessible from UI thread/worklets.
   */
  hasRefreshed: SharedValue<boolean>;
}

const WithPullToRefreshContext = createContext<PullToRefreshContextValue | null>(null);

/**
 * Hook to access pull-to-refresh context values.
 *
 * @returns PullToRefreshContextValue with refresh state and animation values
 * @throws Error if used outside of WithPullToRefresh component
 *
 * @example
 * ```tsx
 * const { refreshProgress, hasRefreshed } = usePullToRefresh();
 *
 * const animatedStyle = useAnimatedStyle(() => ({
 *   opacity: refreshProgress.get(),
 * }));
 * ```
 */
export const usePullToRefresh = () => {
  const context = useContext(WithPullToRefreshContext);
  if (!context) {
    throw new Error("usePullToRefresh must be used within WithPullToRefresh component");
  }
  return context;
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Higher-Order Component that adds pull-to-refresh functionality to scrollable components.
 *
 * Wraps an animated scrollable child (Animated.FlatList, Animated.ScrollView, etc.) and adds:
 * - Smooth pull-to-refresh gesture handling
 * - Animated refresh indicator container
 * - Progress tracking for custom loading indicators
 * - Haptic feedback support
 * - Configurable thresholds and animations
 *
 * @param props - Configuration props for pull-to-refresh behavior
 * @returns Wrapped component with pull-to-refresh functionality
 *
 * @remarks
 * **Requirement**: The children prop must be an animated component from react-native-reanimated.
 * - Use `Animated.FlatList` or `Animated.ScrollView` directly (built-in components)
 * - For other scrollable components (e.g., SectionList), use `Animated.createAnimatedComponent()` to wrap them
 * Regular FlatList or ScrollView components will not work properly.
 */
export function WithPullToRefresh({
  children,
  refreshing,
  refreshComponent,
  refreshThreshold = 200,
  refreshViewBaseHeight = 200,
  lockRefreshViewOnRelease = false,
  backAnimationDuration = 400,
  refreshComponentContainerClassName,
  hapticFeedbackDirection = "both",
  dampingFactor = 1,
  onRefresh,
}: WithPullToRefreshProps) {
  const { height: screenHeight } = useWindowDimensions();

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * Tracks if refresh has completed.
   * Set to true when refreshing transitions from true to false,
   * reset to false when refreshing becomes true again.
   */
  const hasRefreshed = useSharedValue(false);
  /**
   * Tracks previous refreshing state to detect transitions.
   * Used to determine when refresh cycle completes.
   */
  const prevRefreshing = useSharedValue(refreshing);

  /**
   * Live scroll offset from child list.
   * Drives gesture gating - only allows pull when list is at top (<= 0)
   * to avoid fighting with internal list physics.
   */
  const listOffsetY = useSharedValue(0);
  /**
   * Blocks new gestures while animating header to target positions.
   * Prevents re-entrancy and subtle translationY drift during animations.
   */
  const isAnimating = useSharedValue(false);

  /**
   * Raw container height that equals user pull offsetY in 1:1 coefficient.
   * Kept separate from displayed height to allow damping header movement
   * relative to finger travel for elastic feel.
   */
  const rawRefreshContainerHeight = useSharedValue(0);
  /**
   * Snapshot of release position for lock-on-release behavior.
   * Only used when lockRefreshViewOnRelease is true.
   */
  const lockedRefreshContainerHeight = useSharedValue(0);

  // ========================================================================
  // Derived Values
  // ========================================================================

  /**
   * Displayed container height after applying damping factor.
   * Divides raw height by dampingFactor to create elastic feel and prevent
   * oversized header inflation on long pulls.
   */
  const displayedRefreshContainerHeight = useDerivedValue(() => {
    return rawRefreshContainerHeight.get() / dampingFactor;
  });

  /**
   * Normalized progress value (0-1) for refresh indicator animations.
   *
   * Behavior:
   * - Returns 1 when refreshing is true
   * - When hasRefreshed is true: uses effectiveThreshold (refreshThreshold or refreshViewBaseHeight
   *   based on lockRefreshViewOnRelease)
   * - Otherwise: uses refreshThreshold
   *
   * Interpolation maps input [0, threshold] -> output [0, 1] with CLAMP
   * to prevent overshooting beyond 1 when users over-pull.
   */
  const refreshProgress = useDerivedValue(() => {
    if (refreshing) return 1;

    if (hasRefreshed.get()) {
      const effectiveThreshold = lockRefreshViewOnRelease
        ? refreshThreshold
        : refreshViewBaseHeight;

      return interpolate(
        rawRefreshContainerHeight.get(),
        [0, effectiveThreshold],
        [0, 1],
        Extrapolation.CLAMP
      );
    }

    return interpolate(
      rawRefreshContainerHeight.get(),
      [0, refreshThreshold],
      [0, 1],
      Extrapolation.CLAMP
    );
  });

  // ========================================================================
  // Scroll Handling
  // ========================================================================

  /**
   * Tracks list scroll position to determine when we're at the top.
   * 16ms throttle keeps animations in sync at ~60fps without spam.
   */
  const localScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      listOffsetY.set(event.contentOffset.y);
    },
  });

  /**
   * Compose consumer's onScroll handler with ours.
   * Preserves parent logic while capturing scroll for pull-to-refresh gating.
   */
  const outerScrollHandler = (children as any).props?.onScroll;
  const handlers = outerScrollHandler
    ? [localScrollHandler, outerScrollHandler]
    : [localScrollHandler];
  const onScroll = useComposedEventHandler(handlers);

  // ========================================================================
  // Animated Styles
  // ========================================================================

  /**
   * Animated style for refresh container header.
   * Binds height to derived offset so heavy UI (blur/spinner) stays smooth
   * on the UI thread.
   */
  const rHeaderStyle = useAnimatedStyle(() => {
    return { height: displayedRefreshContainerHeight.get() };
  });

  // ========================================================================
  // Child Component Enhancement
  // ========================================================================

  /**
   * Inject animated header before user's header to host refresh UI.
   * - Passes down composed onScroll handler
   * - Sets 16ms throttle for 60fps smooth scrolling
   * - Disables iOS bounce to prevent system overscroll interference
   *
   * @remarks
   * Requires children to be an animated component (Animated.FlatList, Animated.ScrollView,
   * or components created with createAnimatedComponent) for proper scroll event handling
   * and gesture coordination.
   */
  const clonedChild = cloneElement(children as any, {
    onScroll,
    scrollEventThrottle: 16,
    ListHeaderComponent: (
      <>
        <Animated.View
          className={cn("items-center justify-center", refreshComponentContainerClassName)}
          style={rHeaderStyle}
        >
          {refreshComponent}
        </Animated.View>
        {(children.props as any).ListHeaderComponent?.()}
      </>
    ),
    bounces: false,
  });

  // ========================================================================
  // Gesture Handling
  // ========================================================================

  /**
   * Tracks if list is currently being dragged.
   * Used for haptic feedback coordination.
   */
  const isListDragging = useSharedValue(false);
  /**
   * Last drag Y position for delta calculation.
   * Working with deltas avoids frame-to-frame accumulation errors.
   */
  const lastDragY = useSharedValue(0);

  /**
   * Scroll direction tracking for haptic feedback.
   * Includes negative values to detect upward scrolling.
   */
  const {
    onScroll: scrollDirectionOnScroll,
    scrollDirection,
    offsetYAnchorOnChangeDirection,
  } = useScrollDirection("include-negative");

  /**
   * Haptic feedback handler.
   * Triggers haptic feedback at configured threshold and direction.
   */
  const { singleHapticOnScroll } = useHapticOnScroll({
    isListDragging,
    scrollDirection,
    offsetYAnchorOnChangeDirection,
    triggerOffset: refreshThreshold,
    hapticDirection: hapticFeedbackDirection,
  });

  /**
   * Pan gesture that orchestrates the pull-to-refresh interaction.
   * Enabled only when not already animating or refreshing to avoid input/animation conflicts.
   */
  const panGesture = Gesture.Pan()
    .enabled(!refreshing && !isAnimating.get())
    .activeOffsetY([-10, 10])
    .onBegin(() => {
      isListDragging.set(true);
      lastDragY.set(0);
      /**
       * Set to non-zero value to ensure onChange logic only kicks in on new touches.
       * Fixes subtle issue where translationY can continue updating after animation finishes,
       * avoiding interference from incomplete touches.
       */
      rawRefreshContainerHeight.set(0.1);
    })
    .onChange((e) => {
      /**
       * Calculate delta to avoid frame-to-frame accumulation errors.
       * Only allow pulling when list is scrolled to top (<= 0).
       * Once pulling starts, continue responding even if listOffsetY fluctuates around 0.
       * Clamp to screen height to prevent runaway values on long drags.
       */
      const deltaY = e.translationY - lastDragY.get();
      lastDragY.set(e.translationY);

      if (listOffsetY.get() <= 0 || rawRefreshContainerHeight.get() > 1) {
        const next = Math.max(0, Math.min(rawRefreshContainerHeight.get() + deltaY, screenHeight));
        rawRefreshContainerHeight.set(next);
        scrollDirectionOnScroll(next);
        singleHapticOnScroll(next);
      }
    })
    .onEnd(() => {
      /**
       * Snapshot release height for optional locking behavior.
       * Determine if threshold was crossed and animate accordingly.
       */
      lockedRefreshContainerHeight.set(rawRefreshContainerHeight.get());
      isAnimating.set(true);

      if (rawRefreshContainerHeight.get() >= refreshThreshold) {
        /**
         * Threshold crossed - settle to loading height with spring animation.
         * Spring provides elastic feel. If lockRefreshViewOnRelease is true,
         * use the locked release height instead of refreshViewBaseHeight.
         */
        rawRefreshContainerHeight.set(
          withSpring(
            lockRefreshViewOnRelease ? lockedRefreshContainerHeight.get() : refreshViewBaseHeight,
            {},
            (finished) => {
              if (finished) {
                isAnimating.set(false);
              }
            }
          )
        );
        /**
         * Schedule refresh callback on JS thread without blocking animations.
         * Keeps gesture thread free while starting refresh work.
         */
        scheduleOnRN(onRefresh);
      } else {
        /**
         * Not enough pull - animate header back to zero.
         * Uses timing animation for quick, predictable snap-back.
         */
        rawRefreshContainerHeight.set(
          withTiming(0, { duration: backAnimationDuration }, (finished) => {
            if (finished) {
              isAnimating.set(false);
            }
          })
        );
      }

      isListDragging.set(false);
      lastDragY.set(0);
    });

  /**
   * Allow native scroll to continue while pan gesture listens.
   * Simultaneous gesture resolves nested scroll + pull gestures cleanly,
   * avoiding gesture ownership conflicts.
   */
  const nativeGesture = Gesture.Native().shouldActivateOnStart(true);
  const composedGestures = Gesture.Simultaneous(panGesture, nativeGesture);

  // ========================================================================
  // Refresh State Management
  // ========================================================================

  /**
   * Tracks refreshing state transitions and handles header collapse.
   *
   * Behavior:
   * - When refreshing transitions from true to false: sets hasRefreshed to true
   * - Collapses header with timing animation
   * - When collapse animation finishes: resets hasRefreshed to false
   *
   * Timing mirrors the non-refresh path for consistent motion language.
   */
  useEffect(() => {
    const prevRefreshingValue = prevRefreshing.get();

    // Detect transition from refreshing=true to refreshing=false
    if (prevRefreshingValue && !refreshing) {
      hasRefreshed.set(true);
    }

    prevRefreshing.set(refreshing);

    // Collapse header when refreshing becomes false
    if (!refreshing) {
      isAnimating.set(true);
      rawRefreshContainerHeight.set(
        withTiming(0, { duration: backAnimationDuration }, (finished) => {
          if (finished) {
            hasRefreshed.set(false);
            isAnimating.set(false);
          }
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  // ========================================================================
  // Context Value
  // ========================================================================

  /**
   * Context value provided to child components via usePullToRefresh hook.
   * Contains all refresh state and animation values needed for custom indicators.
   */
  const contextValue: PullToRefreshContextValue = {
    refreshing,
    hasRefreshed,
    refreshProgress,
    rawRefreshContainerHeight,
    displayedRefreshContainerHeight,
    lockedRefreshContainerHeight,
    refreshViewBaseHeight,
  };

  return (
    <WithPullToRefreshContext.Provider value={contextValue}>
      <GestureDetector gesture={composedGestures}>{clonedChild}</GestureDetector>
    </WithPullToRefreshContext.Provider>
  );
}
