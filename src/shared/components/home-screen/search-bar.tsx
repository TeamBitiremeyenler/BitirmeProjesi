import { Platform, Pressable, TextInput, View, StyleSheet } from "react-native";
import { Search, X } from "lucide-react-native";
import { KeyboardStickyView, KeyboardController } from "react-native-keyboard-controller";
import { FC, useState, RefObject, useEffect } from "react";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSearchBox } from "react-instantsearch-core";
import useDebouncedCallback from "../../lib/hooks/use-debounced-callback";
import { FlashListRef } from "@shopify/flash-list";
import { Animation } from "../../lib/types/app";
import { useAppStore } from "../../lib/store/app";
import { useAnimationsStore } from "../../lib/store/animations";
import { fireHaptic } from "../../lib/utils/fire-haptic";
import { cn } from "../../lib/utils/cn";

const HEIGHT = 48;

type SearchBarProps = {
  textInputRef: React.RefObject<TextInput | null>;
  listRef: RefObject<FlashListRef<Animation> | null>;
};

export const SearchBar: FC<SearchBarProps> = ({ textInputRef, listRef }) => {
  const [isFocused, setIsFocused] = useState(false);

  const { clear, refine } = useSearchBox();

  const value = useAnimationsStore.use.query();
  const setValue = useAnimationsStore.use.setQuery();

  const isHomeAnchorButtonPressed = useAppStore.use.isHomeAnchorButtonPressed();
  const setIsHomeAnchorButtonPressed = useAppStore.use.setIsHomeAnchorButtonPressed();

  const debouncedRefine = useDebouncedCallback((next: string) => {
    refine(next);
    if (isFocused) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, 250);

  const onChangeText = (next: string) => {
    setValue(next);
    debouncedRefine(next);
  };

  const onClear = () => {
    fireHaptic();
    debouncedRefine.cancel();
    setValue("");
    clear();
    setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 300);
  };

  const { progress } = useReanimatedKeyboardAnimation();

  const rContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(progress.get() > 0 ? 1 : 0, { duration: 200 }),
      pointerEvents: progress.get() > 0 ? "auto" : "none",
    };
  });

  // HACK: Hide search bar and dismiss keyboard when home anchor button is pressed
  // This is a workaround because for some reason the keyboard appears on navigation.goBack()
  useEffect(() => {
    if (isHomeAnchorButtonPressed) {
      KeyboardController.dismiss();
      setIsHomeAnchorButtonPressed(false);
    }
  }, [isHomeAnchorButtonPressed, setIsHomeAnchorButtonPressed]);

  // Return null if home anchor button was pressed (part of the keyboard workaround)
  if (isHomeAnchorButtonPressed) {
    return null;
  }

  return (
    <KeyboardStickyView>
      <Animated.View
        className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-background border-neutral-700"
        style={[rContainerStyle, { borderTopWidth: StyleSheet.hairlineWidth }]}
      >
        <View
          className="flex-row items-center gap-2 rounded-2xl px-3 mb-1 overflow-hidden"
          style={{
            height: HEIGHT,
            backgroundColor: Platform.OS === "ios" ? "#515151" : "#1C1C1C",
            borderWidth: Platform.OS === "ios" ? 0 : 1,
            borderColor: Platform.OS === "ios" ? "transparent" : "#303030",
            borderCurve: "continuous",
          }}
        >
          {Platform.OS === "ios" ? (
            <>
              <View className="absolute h-full left-0.5 right-0.5 top-1 bg-[#1C1C1C] rounded-2xl shadow-[-4_-3_3_#1C1C1C]" />
              <View className="absolute h-full left-0.5 right-0.5 top-1 bg-[#1C1C1C] rounded-2xl shadow-[4_-3_3_#1C1C1C]" />
            </>
          ) : null}
          <Search size={16} color="#B2ACA9" className="self-center mr-2" strokeWidth={2.5} />
          <TextInput
            ref={textInputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder="Animation..."
            placeholderClassName="text-lg/6 font-sans-medium"
            placeholderTextColor="#B2ACA9"
            selectionColor="#fffff4"
            className={cn(
              "flex-1 h-full text-foreground text-lg/6 font-sans-medium pb-0.5",
              Platform.OS === "android" && "pb-2.5"
            )}
            textAlignVertical="center"
            autoCorrect={false}
            autoComplete="off"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {value.length > 0 && (
            <Pressable onPress={onClear} hitSlop={16}>
              <X size={16} color="#B2ACA9" strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </KeyboardStickyView>
  );
};
