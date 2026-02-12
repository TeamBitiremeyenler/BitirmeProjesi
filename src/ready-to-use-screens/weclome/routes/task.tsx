import { Pressable, StyleSheet, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  interpolate,
} from "react-native-reanimated";
import { simulatePress } from "../../shared/lib/utils/simulate-press";
import { Check, ChevronLeft, EllipsisVertical } from "lucide-react-native";
import { cn } from "../../shared/lib/utils/cn";
import StrikethroughText from "../components/strikethrough-text";

// superlist-text-strikethrough-animation 🔽

/**
 * Animation duration in milliseconds for strikethrough effect
 * Matches StrikethroughText component's animationDuration prop for synchronized timing
 */
const STRIKETHROUGH_ANIMATION_DURATION = 300;

const Task = () => {
  const [isTaskCompleted, setIsTaskCompleted] = useState(false);

  const insets = useSafeAreaInsets();

  /**
   * Shared value for checkmark animation coordination
   * Note: This is separate from StrikethroughText's internal progress value
   * Both animate together but are managed independently for component separation
   */
  const strikethroughProgress = useSharedValue(0);

  /**
   * Toggles task completion state and animates checkmark
   * Uses strikethroughProgress to coordinate checkmark animation timing
   * withTiming runs on UI thread for smooth 60fps performance
   */
  const toggleTaskCompletion = () => {
    if (strikethroughProgress.get() === 0) {
      setIsTaskCompleted(true);
      strikethroughProgress.set(withTiming(1, { duration: STRIKETHROUGH_ANIMATION_DURATION }));
    } else {
      setIsTaskCompleted(false);
      strikethroughProgress.set(withTiming(0, { duration: STRIKETHROUGH_ANIMATION_DURATION }));
    }
  };

  const handleCheckboxPress = () => {
    toggleTaskCompletion();
  };

  /**
   * Animated style for checkmark icon with scale and opacity effects
   * Opacity: interpolates from 0 (hidden) to 1 (visible) as progress goes 0->1
   * Scale: interpolates from 1.8 (oversized bounce) to 1 (normal) for spring-like effect
   * Only animates when isTaskCompleted is true, otherwise stays hidden (0 opacity/scale)
   */
  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    const opacity = isTaskCompleted ? interpolate(strikethroughProgress.get(), [0, 1], [0, 1]) : 0;
    const scale = isTaskCompleted ? interpolate(strikethroughProgress.get(), [0, 1], [1.8, 1]) : 0;
    return {
      opacity: opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View className="flex-1 bg-[#242335]">
      <View className="bg-[#2B293F] px-4" style={{ paddingTop: insets.top + 20 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={simulatePress}
            className="p-2 rounded-full bg-slate-100/10 items-center justify-center"
          >
            <ChevronLeft size={24} color="white" />
          </Pressable>

          <Pressable
            onPress={simulatePress}
            className="p-2 rounded-full bg-slate-100/10 items-center justify-center"
          >
            <EllipsisVertical size={24} color="white" />
          </Pressable>
        </View>
        <View className="flex-row gap-3 items-start mt-6">
          <Pressable
            onPress={handleCheckboxPress}
            style={styles.borderCurve}
            className={cn(
              "size-9 rounded-[12px] mt-1 border-[2px] border-white/20 items-center justify-center",
              isTaskCompleted && "border-red-500 bg-red-500"
            )}
          >
            {/* Animated.View enables Reanimated animations on native thread for checkmark */}
            <Animated.View style={checkmarkAnimatedStyle}>
              {/* scaleX: 0.8 compresses checkmark horizontally for visual balance */}
              <View style={{ transform: [{ scaleX: 0.8 }] }}>
                <Check size={24} color="white" strokeWidth={3} />
              </View>
            </Animated.View>
          </Pressable>

          <View className="flex-1 self-start">
            {/* StrikethroughText animates independently but duration matches checkmark for visual sync */}
            <StrikethroughText
              isSelected={isTaskCompleted}
              className="self-start text-4xl font-semibold text-white"
              selectedTextClassName="text-white/40"
              animationDuration={STRIKETHROUGH_ANIMATION_DURATION}
            >
              Add due dates by typing phrases like "Tomorrow" or "Monday at 10am"
            </StrikethroughText>
          </View>
        </View>
        <View className="h-9 w-1/3 rounded-full bg-slate-100/5 mt-8" />
        <View className="h-9 w-3/4 rounded-full bg-slate-100/5 mt-2 mb-6" />
      </View>
    </View>
  );
};

export default Task;

const styles = StyleSheet.create({
  borderCurve: {
    borderCurve: "continuous",
  },
});

// superlist-text-strikethrough-animation 🔼
