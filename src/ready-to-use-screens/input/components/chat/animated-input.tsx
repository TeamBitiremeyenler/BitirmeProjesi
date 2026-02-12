import { Platform, Pressable, TextInput, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";
import { Plus, Search } from "lucide-react-native";
import { MicButton } from "./mic-button";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRef, useState } from "react";
import { cn } from "@/src/shared/lib/utils/cn";

// perplexity-chat-input-on-focus-animation 🔽

// Using createAnimatedComponent so Pressable can receive Reanimated styles on the UI thread
// (prevents JS-thread jank during focus transitions). Docs: reanimated -> createAnimatedComponent
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Base geometry unit for the composer. Collapsed height; also used for radii and icon sizing.
const MIN_INPUT_CONTAINER_HEIGHT = 56;
// Expanded height on focus (2x). Big enough to reveal secondary controls without overwhelming the screen.
const MAX_INPUT_CONTAINER_HEIGHT = 2 * MIN_INPUT_CONTAINER_HEIGHT;

// Square button size matches collapsed input for visual rhythm and hit target consistency.
const NEW_CHAT_BTN_SIZE = MIN_INPUT_CONTAINER_HEIGHT;

// Horizontal gap between input and the new-chat button; used in width interpolation math below.
const INPUT_NEW_CHAT_BTN_GAP = 10;

const classNames = {
  inputContainer: "bg-neutral-800 border border-neutral-700/50",
};

const AnimatedInput = () => {
  const [value, setValue] = useState("");

  const textInputRef = useRef<TextInput>(null);

  const insets = useSafeAreaInsets();

  // Single source of truth for focus progress (0 = idle, 1 = focused). Drives all interpolations in sync.
  const focusProgress = useSharedValue(0);
  // Measured max row width (captured once). Enables responsive width interpolation for the input.
  const maxInputWidth = useSharedValue(0);

  // Animate bottom padding to smoothly remove extra safe-area when focused
  // (avoids layout jump when keyboard sticks the composer).  insets.bottom+12 -> 12
  const rRootContainerStyle = useAnimatedStyle(() => {
    const paddingBottom = interpolate(focusProgress.get(), [0, 1], [insets.bottom + 12, 12]); // collapses extra safe-area padding as the input focuses

    return {
      paddingBottom,
    };
  });

  // Input container grows in both width and height to reveal secondary controls when focused.
  const rInputContainerStyle = useAnimatedStyle(() => {
    const width = interpolate(
      focusProgress.get(),
      [0, 1],
      [
        // collapsed: leave space for the new-chat button + gap
        maxInputWidth.get() - NEW_CHAT_BTN_SIZE - INPUT_NEW_CHAT_BTN_GAP,
        // focused: take the full available width
        maxInputWidth.get(),
      ]
    );
    const height = interpolate(
      focusProgress.get(),
      [0, 1],
      [MIN_INPUT_CONTAINER_HEIGHT, MAX_INPUT_CONTAINER_HEIGHT] // 56 -> 112 for larger composer
    );

    return {
      width,
      height,
      overflow: focusProgress.get() > 0.5 ? "visible" : "hidden",
    };
  });

  // Cross-fade and fully hide the inline mic when focused to reduce visual noise.
  // display:none at progress=1 removes layout cost while focused.
  const rMicButtonContainer = useAnimatedStyle(() => {
    return {
      top: interpolate(focusProgress.get(), [0, 1], [12, MIN_INPUT_CONTAINER_HEIGHT + 12]),
    };
  });

  // Inverse of the inline mic: reveal row of controls only when sufficiently focused.
  // pointerEvents gating prevents accidental taps mid-transition.
  const rControlsContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: focusProgress.get() > 0.5 ? 1 : 0,
      pointerEvents: focusProgress.get() > 0.5 ? "auto" : "none",
    };
  });

  // Slide the pencil button out of the way on focus so it doesn’t compete with the expanded composer.
  const rPenBtnStyle = useAnimatedStyle(() => {
    const translateX = interpolate(focusProgress.get(), [0, 1], [0, 100]);
    return {
      transform: [{ translateX }],
    };
  });

  const rDynamicInputStyle = useAnimatedStyle(() => {
    return {
      pointerEvents: focusProgress.get() > 0.5 ? "auto" : "none",
    };
  });

  return (
    <>
      <Animated.View style={rRootContainerStyle} className="mx-3 mt-auto">
        <View
          className="flex-row items-center"
          style={{ gap: INPUT_NEW_CHAT_BTN_GAP }}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            // Capture the available width once to keep interpolations stable and avoid reflows.
            if (maxInputWidth.get() === 0 && width > 0) {
              maxInputWidth.set(width);
            }
          }}
        >
          <Animated.View
            style={[
              { borderCurve: "continuous", borderRadius: MIN_INPUT_CONTAINER_HEIGHT / 2 },
              rInputContainerStyle,
            ]}
            className={cn(classNames.inputContainer)}
          >
            {/* 
              Architecture: Button trigger + absolutely positioned input
              - The Pressable button serves as a trigger to focus the input and animate the container
              - The TextInput is positioned absolutely to allow multiline behavior with auto height
              - This setup enables the input to expand vertically as text wraps, while maintaining
                the fixed-height container structure needed for the animation system
            */}
            <View
              className="flex-row items-center gap-2 pr-3"
              style={{ height: MIN_INPUT_CONTAINER_HEIGHT }}
            >
              <Pressable
                className="size-full pl-5 justify-center"
                onPress={() => {
                  focusProgress.set(withSpring(1));
                  textInputRef?.current?.focus();
                }}
              />
              <Animated.View
                className={cn(
                  "absolute -left-px -right-px bottom-px justify-center pt-2",
                  Platform.OS === "ios" && "pb-4",
                  classNames.inputContainer,
                  "border-b-0"
                )}
                style={[
                  rDynamicInputStyle,
                  {
                    minHeight: MIN_INPUT_CONTAINER_HEIGHT,
                    borderTopLeftRadius: MIN_INPUT_CONTAINER_HEIGHT / 2,
                    borderTopRightRadius: MIN_INPUT_CONTAINER_HEIGHT / 2,
                    borderCurve: "continuous",
                  },
                ]}
              >
                <TextInput
                  ref={textInputRef}
                  value={value}
                  onChangeText={setValue}
                  placeholder="Ask a follow up..."
                  placeholderTextColor="#737373"
                  selectionColor="#ffffff"
                  className="pl-5 pt-1 text-neutral-50 text-lg font-medium"
                  multiline
                  numberOfLines={5}
                  onBlur={() => {
                    focusProgress.set(withSpring(0));
                  }}
                />
              </Animated.View>
            </View>

            {/* Secondary controls row (Plus/Search + mic) only visible when focused; opacity + pointerEvents are animated above. */}
            <Animated.View
              className="flex-1 flex-row items-center justify-between px-3"
              style={[rControlsContainerStyle, { height: MIN_INPUT_CONTAINER_HEIGHT }]}
            >
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={simulatePress}
                  className="p-2 rounded-full bg-neutral-700 items-center justify-center"
                >
                  <Plus size={18} color="white" />
                </Pressable>
                <Pressable
                  onPress={simulatePress}
                  className="p-2 rounded-full bg-neutral-700 items-center justify-center"
                >
                  <Search size={18} color="white" />
                </Pressable>
              </View>
            </Animated.View>
            <Animated.View className="absolute right-3" style={rMicButtonContainer}>
              <MicButton />
            </Animated.View>
          </Animated.View>

          {/* New chat pencil keeps size equal to collapsed input; translates out on focus for visual hierarchy. */}
          <AnimatedPressable
            className="rounded-full items-center justify-center bg-neutral-800 border border-neutral-700/50"
            style={[{ width: NEW_CHAT_BTN_SIZE, height: NEW_CHAT_BTN_SIZE }, rPenBtnStyle]}
            onPress={simulatePress}
          >
            <MaterialCommunityIcons name="pencil-plus-outline" size={19} color="white" />
          </AnimatedPressable>
        </View>
      </Animated.View>
    </>
  );
};

export default AnimatedInput;

// perplexity-chat-input-on-focus-animation 🔼
