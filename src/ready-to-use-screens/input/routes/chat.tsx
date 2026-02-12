import { View, Pressable, Text, Keyboard } from "react-native";
import {
  Share2,
  Bookmark,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Snowflake,
  ArrowLeft,
  Upload,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";
import AnimatedInput from "../components/chat/animated-input";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useState } from "react";

export default function Chat() {
  const [isKeyboardStickyViewEnabled, setIsKeyboardStickyViewEnabled] = useState(false);

  const insets = useSafeAreaInsets();

  return (
    <Pressable
      className="flex-1 bg-neutral-900"
      style={{ paddingTop: insets.top + 12 }}
      // Tapping outside input collapses the composer (onBlur) by dismissing the keyboard,
      // which in turn drives focusProgress -> 0 in AnimatedInput for a symmetric spring back.
      onPress={Keyboard.dismiss}
    >
      <View className="flex-1">
        <View className="px-4 pb-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={simulatePress}
              className="p-2 rounded-full bg-neutral-800 items-center justify-center"
            >
              <ArrowLeft size={18} color="white" />
            </Pressable>

            <View className="flex-row items-center gap-3">
              <Pressable
                style={{ borderCurve: "continuous" }}
                onPress={simulatePress}
                className="px-4 py-2 rounded-2xl bg-cyan-950 border border-cyan-800/50"
              >
                <Text className="text-cyan-500 font-medium">Sign in</Text>
              </Pressable>
              <Pressable
                onPress={simulatePress}
                className="p-2 rounded-full bg-neutral-800 items-center justify-center"
              >
                <Upload size={18} color="white" />
              </Pressable>
              <Pressable
                onPress={simulatePress}
                className="p-2 rounded-full bg-neutral-800 items-center justify-center"
              >
                <Bookmark size={18} color="white" />
              </Pressable>
            </View>
          </View>
        </View>

        <View className="px-4">
          <Text className="text-white text-3xl font-semibold mt-3">Hello</Text>

          <View className="mt-3">
            <View
              style={{ borderCurve: "continuous" }}
              className="self-start flex-row items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/70 border border-neutral-700/60"
            >
              <Snowflake size={14} color="white" />
              <Text className="text-white text-sm">Perplexity</Text>
            </View>
          </View>

          <Text className="text-white text-lg font-medium mt-6">
            Hello! How can I assist you today?
          </Text>

          <View className="flex-row items-center mt-4">
            <View className="flex-row items-center gap-5">
              <Pressable onPress={simulatePress}>
                <Share2 size={18} color="grey" />
              </Pressable>
              <Pressable onPress={simulatePress}>
                <RefreshCw size={18} color="grey" />
              </Pressable>
              <Pressable onPress={simulatePress}>
                <Copy size={18} color="grey" />
              </Pressable>
            </View>
            <View className="flex-1" />
            <Pressable onPress={simulatePress} className="opacity-80">
              <MoreHorizontal size={20} color="grey" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* perplexity-chat-input-on-focus-animation 🔽 */}
      {/* KeyboardStickyView pins the composer above the keyboard and exposes safe-area changes, */}
      {/* letting AnimatedInput interpolate paddingBottom (insets.bottom+12 -> 12) for a smooth settle. */}
      <KeyboardStickyView
        enabled={isKeyboardStickyViewEnabled}
        onLayout={() =>
          // This hack may be only actual for this app and not applicable for other cases.
          setTimeout(() => {
            setIsKeyboardStickyViewEnabled(true);
          }, 100)
        }
      >
        {/* AnimatedInput owns focusProgress shared value coordinating width/height/mic/controls. */}
        <AnimatedInput />
      </KeyboardStickyView>
      {/* perplexity-chat-input-on-focus-animation 🔼 */}
    </Pressable>
  );
}
