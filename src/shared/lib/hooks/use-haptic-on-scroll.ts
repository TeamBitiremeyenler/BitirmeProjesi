import { SharedValue, useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ReanimatedScrollEvent } from "react-native-reanimated/lib/typescript/hook/commonTypes";
import { ScrollDirectionValue } from "./use-scroll-direction";
import { scheduleOnRN } from "react-native-worklets";

type Params = {
  // True only during active drag; prevents programmatic scrolls from triggering haptics
  isListDragging: SharedValue<boolean>;
  // Direction is computed elsewhere; used here to gate which threshold condition to evaluate
  scrollDirection: ScrollDirectionValue;
  // Anchor set on direction change; lets us detect a single crossing when scrolling back past triggerOffset
  offsetYAnchorOnChangeDirection: SharedValue<number>;
  // Threshold distance from origin (sign matters) that triggers one haptic on crossing
  triggerOffset: number;
  // Restrict haptics to a single direction or allow both; matches UX intent (e.g., pull-to-refresh)
  hapticDirection?: "to-bottom" | "to-top" | "both";
};

/**
 * Hook for haptic on scroll: fires once when passing a trigger distance in both directions.
 * Use this when you want one haptic feedback per threshold crossing.
 */
export const useHapticOnScroll = ({
  isListDragging,
  scrollDirection,
  offsetYAnchorOnChangeDirection,
  triggerOffset,
  hapticDirection = "both",
}: Params) => {
  // Debounce flag: ensures one haptic per threshold crossing until direction changes
  const isHapticTriggered = useSharedValue(false);

  // Run haptic on the RN thread to avoid blocking UI worklet; mark as triggered to debounce
  const handleHaptics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isHapticTriggered.set(true);
  };

  // Reset the debounce when user reverses direction during an active drag
  useAnimatedReaction(
    () => scrollDirection.get(),
    () => {
      if (!isListDragging.get()) {
        return;
      }
      isHapticTriggered.set(false);
    }
  );

  const singleHapticOnScroll = (event: ReanimatedScrollEvent | number) => {
    "worklet";

    // Ignore momentum/imperative scrolls; only tactile feedback for deliberate drag
    if (!isListDragging.get()) {
      return;
    }

    const offsetY = typeof event === "number" ? event : event.contentOffset.y;

    // Fast reject: do not fire when signs differ (e.g., scrolling up with a positive trigger)
    if (Math.sign(offsetY) !== Math.sign(triggerOffset)) {
      return;
    }

    // Downward crossing: fire once when offset surpasses positive trigger
    if (scrollDirection.get() === "to-bottom" && hapticDirection === "to-bottom") {
      if (offsetY > triggerOffset && !isHapticTriggered.get()) {
        scheduleOnRN(handleHaptics); // schedule keeps heavy work off UI thread
      }
    }

    // Upward crossing: only fire when coming back past trigger from below the anchor (prevents double fire)
    if (scrollDirection.get() === "to-top" && hapticDirection === "to-top") {
      if (
        offsetY < triggerOffset &&
        offsetYAnchorOnChangeDirection.get() > triggerOffset &&
        !isHapticTriggered.get()
      ) {
        scheduleOnRN(handleHaptics);
      }
    }

    // Bidirectional mode: evaluate the relevant branch once per crossing with debounce
    if (hapticDirection === "both") {
      if (scrollDirection.get() === "to-bottom") {
        if (offsetY > triggerOffset && !isHapticTriggered.get()) {
          scheduleOnRN(handleHaptics);
        }
      } else if (scrollDirection.get() === "to-top") {
        if (
          offsetY < triggerOffset &&
          offsetYAnchorOnChangeDirection.get() > triggerOffset &&
          !isHapticTriggered.get()
        ) {
          scheduleOnRN(handleHaptics);
        }
      }
    }
  };

  return { singleHapticOnScroll };
};
