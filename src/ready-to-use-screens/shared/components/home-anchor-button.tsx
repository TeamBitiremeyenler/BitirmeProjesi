import { useNavigation, useRouter } from "expo-router";
import { Home } from "lucide-react-native";
import React, { FC, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { fireHaptic } from "../lib/utils/fire-haptic";
import { useAppStore } from "../lib/store/app";
import { scheduleOnRN } from "react-native-worklets";

const SIZE = 44;

// Spring animation configuration for slide effect on gesture release
const SPRING_CONFIG = { damping: 60, mass: 3 };

export const HomeAnchorButton: FC = () => {
  const router = useRouter();
  const navigation = useNavigation();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const setIsHomeAnchorButtonPressed = useAppStore.use.setIsHomeAnchorButtonPressed();

  // Extract safe area inset values for use in worklet context
  const safeAreaTop = insets.top;
  const safeAreaBottom = insets.bottom;
  const safeAreaLeft = insets.left;
  const safeAreaRight = insets.right;

  // Calculate initial position: single source of truth
  // Button positioned 20px from right edge, vertically centered at 75% of screen height
  const initialLeftX = useMemo(() => screenWidth - SIZE - 20, [screenWidth]);
  const initialTopY = useMemo(() => screenHeight * 0.65, [screenHeight]);

  // Shared values for position translation (offsets from initial position)
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  // Shared value for scale animation
  const scale = useSharedValue(1);

  // Pan gesture handler for drag functionality
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Scale up to 1.2 when pan gesture begins
      scale.set(withSpring(1.3, SPRING_CONFIG));
    })
    .onChange((event) => {
      // Calculate boundary constraints accounting for safe area insets
      // Min X: left edge should not go beyond safe area left (safeAreaLeft)
      // Initial left edge is at initialLeftX, so translateX >= -initialLeftX + safeAreaLeft
      const minX = -initialLeftX + safeAreaLeft;
      // Max X: right edge should not go beyond safe area right (screenWidth - safeAreaRight)
      // Initial right edge is at initialLeftX + SIZE, so translateX <= screenWidth - initialLeftX - SIZE - safeAreaRight
      const maxX = screenWidth - initialLeftX - SIZE - safeAreaRight;
      // Min Y: top edge should not go beyond safe area top (safeAreaTop)
      // Initial top edge is at initialTopY, so translateY >= -initialTopY + safeAreaTop
      const minY = -initialTopY + safeAreaTop;
      // Max Y: bottom edge should not go beyond safe area bottom (screenHeight - safeAreaBottom)
      // Initial bottom edge is at initialTopY + SIZE, so translateY <= screenHeight - initialTopY - SIZE - safeAreaBottom
      const maxY = screenHeight - initialTopY - SIZE - safeAreaBottom;

      // Apply translation with boundary constraints using Math.max/Math.min
      translateX.set(Math.max(minX, Math.min(maxX, translateX.get() + event.changeX)));
      translateY.set(Math.max(minY, Math.min(maxY, translateY.get() + event.changeY)));
    })
    .onFinalize((event) => {
      // Calculate boundary constraints
      const minX = -initialLeftX + safeAreaLeft;
      const maxX = screenWidth - initialLeftX - SIZE - safeAreaRight;
      const minY = -initialTopY + safeAreaTop;
      const maxY = screenHeight - initialTopY - SIZE - safeAreaBottom;

      // Maximum slide distance: 100px
      const MAX_SLIDE_DISTANCE = 150;

      // Get current position
      const currentX = translateX.get();
      const currentY = translateY.get();

      // Calculate velocity magnitude and direction
      const velocityMagnitude = Math.sqrt(
        event.velocityX * event.velocityX + event.velocityY * event.velocityY
      );

      // Calculate target position based on velocity direction, limited to 100px
      let targetX = currentX;
      let targetY = currentY;

      if (velocityMagnitude > 0) {
        // Normalize velocity to get direction
        const directionX = event.velocityX / velocityMagnitude;
        const directionY = event.velocityY / velocityMagnitude;

        // Calculate distance to slide (proportional to velocity, capped at 100px)
        // Scale velocity to get a reasonable distance (e.g., 1000 velocity = 100px)
        const slideDistance = Math.min(MAX_SLIDE_DISTANCE, velocityMagnitude / 10);

        // Calculate target position
        targetX = currentX + directionX * slideDistance;
        targetY = currentY + directionY * slideDistance;
      }

      // Clamp target position to boundaries
      const clampedX = Math.max(minX, Math.min(maxX, targetX));
      const clampedY = Math.max(minY, Math.min(maxY, targetY));

      // Animate to target position with spring animation
      translateX.set(withSpring(clampedX, SPRING_CONFIG));
      translateY.set(withSpring(clampedY, SPRING_CONFIG));
      // Scale back to 1 when pan gesture ends
      scale.set(withSpring(1, SPRING_CONFIG));
    });

  const handleTap = () => {
    fireHaptic();
    setIsHomeAnchorButtonPressed(true);
    if (router.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace("/");
    }
  };

  // Tap gesture handler for press action (navigation.goBack)
  const tapGesture = Gesture.Tap().onEnd(() => {
    scheduleOnRN(handleTap);
  });

  // Combine gestures: Race ensures pan takes precedence over tap when dragging
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Animated style for button position
  // Uses initialLeftX and initialTopY as base position, with translateX/Y as offsets
  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      left: initialLeftX,
      top: initialTopY,
      transform: [
        { translateX: translateX.get() },
        { translateY: translateY.get() },
        { scale: scale.get() },
      ],
    };
  });

  return (
    <View className="absolute inset-0 pointer-events-box-none z-[9999]">
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          entering={SlideInRight.springify().damping(80).mass(3).delay(100)}
          className="absolute items-center justify-center rounded-full bg-brand"
          style={[styles.container, animatedButtonStyle]}
        >
          <View className="mb-0.5">
            <Home size={20} color="white" fill="white" />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    borderCurve: "continuous",
  },
});
