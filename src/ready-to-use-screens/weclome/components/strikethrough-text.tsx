import { Text, TextProps } from "react-native";
import { FC, useState, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from "react-native-reanimated";
import { cn } from "../../shared/lib/utils/cn";

// superlist-text-strikethrough-animation 🔽

/**
 * Metrics for a single line of text, used to position and size strikethrough lines
 * - width: Line width in pixels, determines strikethrough line max width
 * - height: Line height for vertical positioning
 * - y: Vertical offset from text container top
 */
type TextLineMetrics = {
  width: number;
  height: number;
  y: number;
};

type StrikethroughLineProps = {
  lineMetrics: TextLineMetrics;
  /**
   * Progress range [start, end] for this line's animation (0-1 normalized)
   * Each line gets a proportional slice of the total animation progress
   */
  progressRange: number[];
  /**
   * Shared value coordinating strikethrough progress across all lines
   * 0 = no strikethrough, 1 = fully strikethrough
   */
  strikethroughProgress: SharedValue<number>;
  strikethroughColor: string;
};

/**
 * Individual strikethrough line component that animates its width
 * Each line animates sequentially based on its progressRange slice
 */
const StrikethroughLine: FC<StrikethroughLineProps> = ({
  lineMetrics,
  progressRange,
  strikethroughProgress,
  strikethroughColor,
}) => {
  /**
   * Animates line width from 0 to full line width based on progressRange
   * Interpolation: progressRange [start, end] -> width [0, lineMetrics.width]
   * CLAMP prevents overshoot beyond the line's boundaries
   */
  const strikethroughLineStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(
        strikethroughProgress.get(),
        progressRange,
        [0, lineMetrics.width],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    // Animated.View enables Reanimated animations on native thread
    // Positioned absolutely at line center (y + height/2) for proper strikethrough alignment
    <Animated.View
      style={[
        {
          top: lineMetrics.y + lineMetrics.height / 2,
        },
        strikethroughLineStyle,
      ]}
      className={cn("absolute left-0 h-[2px]", strikethroughColor)}
    />
  );
};

type StrikethroughTextProps = TextProps & {
  /**
   * Whether the strikethrough animation should be visible
   * Triggers animation from 0->1 (show) or 1->0 (hide)
   */
  isSelected: boolean;
  /**
   * Duration of the strikethrough animation in milliseconds
   * Controls timing for both forward and reverse animations
   * @default 200
   */
  animationDuration?: number;
  /**
   * Color of the strikethrough line
   * @default "bg-red-500"
   */
  strikethroughColor?: string;
  /**
   * Additional className to apply when text is selected
   */
  selectedTextClassName?: string;
};

const StrikethroughText: FC<StrikethroughTextProps> = ({
  isSelected,
  animationDuration = 200,
  strikethroughColor = "bg-red-500",
  selectedTextClassName,
  className,
  onTextLayout,
  children,
  ...textProps
}) => {
  const [textLineMetrics, setTextLineMetrics] = useState<TextLineMetrics[]>([]);
  /**
   * Shared value coordinating strikethrough progress (0-1)
   * Used by all StrikethroughLine components to animate in sync
   * Runs on UI thread for 60fps performance
   */
  const strikethroughProgress = useSharedValue(0);

  // Calculate total width of all text lines for proportional animation distribution
  const totalTextWidth = textLineMetrics.reduce((acc, line) => acc + line.width, 0);

  /**
   * Calculates progress ranges for each line based on proportional width
   * Ensures longer lines take more animation time, creating natural sequential effect
   * Returns array of [start, end] ranges in 0-1 space
   * Example: 3 lines with widths [100, 200, 100] -> [[0, 0.25], [0.25, 0.75], [0.75, 1]]
   */
  const calculateLineProgressRanges = (
    lines: TextLineMetrics[],
    totalWidth: number
  ): number[][] => {
    const ranges: number[][] = [];
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      const end = start + lines[i].width / totalWidth;
      // Last line always ends at 1 to ensure complete coverage
      if (i === lines.length - 1) {
        ranges.push([start, 1]);
      } else {
        ranges.push([start, end]);
      }
      start = end;
    }
    return ranges;
  };

  const lineProgressRanges = calculateLineProgressRanges(textLineMetrics, totalTextWidth);

  /**
   * Animates strikethrough progress based on selection state
   * withTiming runs on UI thread for smooth 60fps animation
   * 0 = no strikethrough (hidden), 1 = fully strikethrough (visible)
   */
  useEffect(() => {
    if (isSelected) {
      strikethroughProgress.set(withTiming(1, { duration: animationDuration }));
    } else {
      strikethroughProgress.set(withTiming(0, { duration: animationDuration }));
    }
  }, [isSelected, animationDuration, strikethroughProgress]);

  /**
   * Captures text layout metrics after text renders
   * Required to position strikethrough lines accurately over each text line
   * Called automatically by React Native when text layout completes
   */
  const handleTextLayout = (event: Parameters<NonNullable<TextProps["onTextLayout"]>>[0]) => {
    setTextLineMetrics(
      event.nativeEvent.lines.map((line) => ({
        width: line.width,
        height: line.height,
        y: line.y,
      }))
    );

    // Call original onTextLayout if provided
    if (onTextLayout) {
      onTextLayout(event);
    }
  };

  return (
    <View className="relative">
      <Text
        {...textProps}
        className={cn(className, isSelected && selectedTextClassName)}
        onTextLayout={handleTextLayout}
      >
        {children}
      </Text>
      {/* Render one strikethrough line per text line, each with its own progress range */}
      {textLineMetrics.map((lineMetrics, index) => {
        if (index >= lineProgressRanges.length) {
          return null;
        }

        return (
          <StrikethroughLine
            key={index}
            lineMetrics={lineMetrics}
            progressRange={lineProgressRanges[index]}
            strikethroughProgress={strikethroughProgress}
            strikethroughColor={strikethroughColor}
          />
        );
      })}
    </View>
  );
};

export default StrikethroughText;

// superlist-text-strikethrough-animation 🔼
