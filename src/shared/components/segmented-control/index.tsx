import React, { createContext, useState, useCallback, use } from "react";
import { View, Pressable, type LayoutChangeEvent, GestureResponderEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type {
  SegmentedControlContextValue,
  SegmentedControlProps,
  SegmentedControlItemProps,
  SegmentedControlIndicatorProps,
  ItemMeasurements,
} from "./types";
import { cn } from "../../lib/utils/cn";

// Animated.createAnimatedComponent is required to allow Pressable's style/props
// to participate in Reanimated-driven updates. This enables 60fps interactions
// without re-rendering on JS thread. See docs:
// https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SegmentedControlContext = createContext<SegmentedControlContextValue>({
  value: "",
  onValueChange: () => {},
  measurements: {},
  setMeasurements: () => {},
});

// ------------------------------------------

const SegmentedControlRoot = ({
  value,
  onValueChange,
  className,
  children,
  ...props
}: SegmentedControlProps) => {
  // Architecture: Root owns item measurements and selected value, exposes both
  // via context so indicator can animate to measured width/x. This avoids
  // prop-drilling and keeps animation inputs close to where they are needed.
  const [measurements, setMeasurementsState] = useState<Record<string, ItemMeasurements>>({});

  const setMeasurements = useCallback((key: string, newMeasurements: ItemMeasurements) => {
    setMeasurementsState((prev) => ({
      ...prev,
      [key]: newMeasurements,
    }));
  }, []);

  const contextValue: SegmentedControlContextValue = {
    value,
    onValueChange,
    measurements,
    setMeasurements,
  };

  return (
    <SegmentedControlContext value={contextValue}>
      <View className={cn("flex-row", className)} {...props}>
        {children}
      </View>
    </SegmentedControlContext>
  );
};

// ------------------------------------------

const SegmentedControlItem = ({
  value,
  className,
  onPress,
  ...props
}: SegmentedControlItemProps) => {
  const { onValueChange, setMeasurements, value: activeValue } = use(SegmentedControlContext);

  const isActive = activeValue === value;

  // Measure each item once it lays out so the indicator can animate to
  // exact width and x. Using RN layout avoids guessing text widths.
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height, x } = event.nativeEvent.layout;
      setMeasurements(value, { width, height, x });
    },
    [value, setMeasurements]
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      // Press updates selected value which drives indicator animation.
      onValueChange(value);
      // @ts-ignore
      onPress?.(event);
    },
    [value, onValueChange, onPress]
  );

  return (
    <AnimatedPressable
      className={className}
      onLayout={handleLayout}
      onPress={handlePress}
      accessibilityState={{ selected: isActive }}
      {...props}
    />
  );
};

// ------------------------------------------

const SegmentedControlIndicator = ({
  className,
  style,
  animationConfig = { type: "spring" },
  ...props
}: SegmentedControlIndicatorProps) => {
  const { value, measurements } = use(SegmentedControlContext);

  const activeMeasurements = measurements[value];
  // Shared flag to skip the first animation: prevents the indicator from
  // animating in from 0 on initial mount which can look janky.
  const hasMeasured = useSharedValue(false);

  // animationConfig lets consumers switch feel: spring for bouncy switching,
  // timing for linear/snappier transitions. Reanimated config is passed
  // through untouched to keep this component flexible.
  const reanimatedConfig = animationConfig?.config;

  // Animated style is the single source of truth for indicator geometry.
  // It animates width/height/left to follow currently active item's
  // measurements at 60fps on the UI thread.
  const animatedStyle = useAnimatedStyle(() => {
    if (!activeMeasurements) {
      // No target yet → hide indicator entirely to avoid flicker.
      return {
        width: 0,
        height: 0,
        left: 0,
        opacity: 0,
      };
    }

    if (!hasMeasured.value) {
      // Avoid initial animate-in: snap to measured geometry once.
      hasMeasured.set(true);
      return {
        width: activeMeasurements.width,
        height: activeMeasurements.height,
        left: activeMeasurements.x,
        opacity: 1,
      };
    }

    return {
      // Width/height animate to match the active tab's measured size.
      // Spring yields playful pill growth; timing yields crisp snaps.
      width:
        animationConfig?.type === "timing"
          ? withTiming(activeMeasurements.width, reanimatedConfig) // size tween
          : withSpring(activeMeasurements.width, reanimatedConfig), // size spring
      height:
        animationConfig?.type === "timing"
          ? withTiming(activeMeasurements.height, reanimatedConfig)
          : withSpring(activeMeasurements.height, reanimatedConfig),
      // Horizontal travel maps directly to measured x, producing a sliding
      // selection pill that tracks item positions precisely.
      left:
        animationConfig?.type === "timing"
          ? withTiming(activeMeasurements.x, reanimatedConfig) // slide tween
          : withSpring(activeMeasurements.x, reanimatedConfig), // slide spring
      opacity: 1,
    };
  }, [activeMeasurements]);

  return (
    <Animated.View
      className={cn("absolute", className)}
      // Absolute positioning keeps layout static while the indicator animates
      // on top, avoiding reflow of siblings during transitions.
      style={[animatedStyle, style]}
      {...props}
    />
  );
};

// ------------------------------------------

SegmentedControlRoot.displayName = "SegmentedControl";
SegmentedControlItem.displayName = "SegmentedControl.Item";
SegmentedControlIndicator.displayName = "SegmentedControl.Indicator";

const SegmentedControl = Object.assign(SegmentedControlRoot, {
  Item: SegmentedControlItem,
  Indicator: SegmentedControlIndicator,
});

export default SegmentedControl;
