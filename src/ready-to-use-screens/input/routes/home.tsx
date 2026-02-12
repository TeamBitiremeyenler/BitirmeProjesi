import { View, Text, Pressable, Keyboard, TextInput, Platform } from "react-native";
import { AudioLines, Calendar, CircleUser, LayoutGrid, Mic, Plus, Search, Send } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";
import { useEffect, useRef, useState } from "react";
import { AddFileModal } from "../components/add-file-modal";
import BreathingIcon from "../components/breathing-icon";
import { useAndroidNote } from "@/src/shared/lib/hooks/use-android-note";
import WithShimmer from "@/src/shared/components/with-shimmer";
import { useMaxKeyboardHeight } from "@/src/shared/lib/hooks/use-max-keyboard-height";
import {
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { router } from "expo-router";

// perplexity-text-input-freeze-on-modal-open-animation 🔽

// Swipe threshold in pixels: upward swipe must exceed -50px to trigger focus
// Negative Y translation indicates upward gesture direction
const SWIPE_UP_THRESHOLD = -50;

export default function Home() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  // Tracks if text input was focused before modal opened - used to restore focus state
  const [isTextInputFocused, setIsTextInputFocused] = useState(false);
  // Dynamic offset for KeyboardStickyView: when modal opens, this freezes the text input
  // at its current keyboard-elevated position, preventing visual jump
  const [keyboardOffsetClosed, setKeyboardOffsetClosed] = useState(0);
  const [value, setValue] = useState("");

  const insets = useSafeAreaInsets();

  useAndroidNote(
    "Regarding Bottom Sheet Backdrop. Android doesn't reliably support blur overlays. For consistency and performance, the fallback bottom sheet interpolates background color rather than applying a blur effect."
  );

  const textInputRef = useRef<TextInput>(null);

  // Maximum keyboard height across all device configurations - used to calculate
  // the exact offset needed to freeze text input position when modal opens
  const maxKeyboardHeight = useMaxKeyboardHeight();

  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

  // Restores text input focus after modal closes
  // When modal was opened while text input was focused, this effect restores keyboard focus
  // to maintain user's interaction context. setFocusTo("current") ensures the previously
  // focused input regains focus, and isTextInputFocused flag is reset to prevent re-triggering
  useEffect(() => {
    if (!isModalVisible && isTextInputFocused) {
      KeyboardController.setFocusTo("current");
      setIsTextInputFocused(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalVisible]);

  // Resets keyboard offset when all conditions are cleared
  // After modal closes and keyboard dismisses, this clears the frozen position offset
  // that was applied to prevent visual jump. 200ms delay ensures keyboard animation
  // completes before resetting offset, preventing visual glitches during transition
  useEffect(() => {
    if (!isKeyboardVisible && !isModalVisible && !isTextInputFocused) {
      setTimeout(() => {
        setKeyboardOffsetClosed(0);
      }, 200);
    }
  }, [isKeyboardVisible, isModalVisible, isTextInputFocused]);

  // Pan gesture enables swipe-to-focus interaction: upward swipe focuses text input
  // runOnJS(true) ensures focus call executes on JS thread for reliability
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY <= SWIPE_UP_THRESHOLD) {
        setKeyboardOffsetClosed(0); // Reset sticky offset
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 100); // Small delay to ensure gesture finishes
      }
    })
    .runOnJS(true);

  return (
    <GestureDetector gesture={panGesture}>
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 12 }}
      >
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          {/* perplexity-home-header-animation 🔽 */}
          {/* Header row: BreathingIcon provides subtle pulsing animation to draw attention
          The breathing effect creates a gentle, non-intrusive visual cue */}
          <View className="flex-row px-6 items-center justify-between">
            <Pressable onPress={() => router.replace("/calendar")}>
              <Calendar size={24} color="black" />
            </Pressable>
            <Pressable onPress={() => router.replace("/profile")}>
              <CircleUser size={24} color="black" />
            </Pressable>
          </View>

          <View className="pt-40 items-center justify-center px-6">
            <WithShimmer
              delay={2}
              duration={4}
              angle={75}
              colors={{ start: "#fe6a00", middle: "#fe9644", end: "#ff8d51" }}
            >
              <Text className="text-4xl">calbox</Text>
            </WithShimmer>
          </View>
        </Pressable>
        <KeyboardStickyView
          offset={{ closed: keyboardOffsetClosed, opened: Platform.OS === "android" ? 36 : 24 }}
        >
          <View
            style={{ borderCurve: "continuous" }}
            className="mx-6 p-3 rounded-3xl border border-muted/25"
          >
            <TextInput
              ref={textInputRef}
              value={value}
              onChangeText={setValue}
              placeholder="Ask anything..."
              placeholderTextColor="#737373"
              selectionColor="#ffffff"
              multiline
              numberOfLines={5}
              className="text-lg text-neutral-50 pt-4"
            />

            <View className="flex-row justify-between mt-5">
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => {
                    if (textInputRef.current?.isFocused()) {
                      setIsTextInputFocused(true);
                      setKeyboardOffsetClosed(
                        -maxKeyboardHeight + insets.bottom - (Platform.OS === "android" ? 60 : 10)
                      );
                      setTimeout(() => KeyboardController.dismiss(), 200);
                    }
                    setIsModalVisible(true);
                  }}
                  className="p-2 rounded-full bg-accent items-center justify-center"
                >
                  <Plus size={18} color="white" />
                </Pressable>
                {/* perplexity-bottom-sheet-backdrop-animation 🔼 */}
                <Pressable
                  onPress={simulatePress}
                  className="p-2 rounded-full bg-accent items-center justify-center"
                >
                  <Search size={18} color="white" />
                </Pressable>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={simulatePress}
                  className="p-2 rounded-full bg-accent items-center justify-center"
                >
                  <Send size={18} color="white" />
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardStickyView>
        <AddFileModal isVisible={isModalVisible} setIsVisible={setIsModalVisible} />
      </View>
    </GestureDetector>
  );
}
