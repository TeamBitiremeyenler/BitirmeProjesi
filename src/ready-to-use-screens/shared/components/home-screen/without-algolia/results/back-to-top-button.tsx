import { FC, RefObject } from "react";
import { Pressable } from "react-native";
import { ArrowUp } from "lucide-react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { fireHaptic } from "../../../../lib/utils/fire-haptic";
import { FlashListRef } from "@shopify/flash-list";
import { StaticAnimation } from "@/src/shared/lib/constants/apps";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  listRef: RefObject<FlashListRef<StaticAnimation> | null>;
  showBackToTop: boolean;
};

export const BackToTopButton: FC<Props> = ({ listRef, showBackToTop }) => {
  if (!showBackToTop) {
    return null;
  }

  const handlePress = () => {
    fireHaptic();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <AnimatedPressable
      key="back-to-top-button"
      entering={FadeInDown.springify()}
      exiting={FadeOutDown.springify()}
      onPress={handlePress}
      className="absolute size-12 right-6 bottom-6 bg-neutral-700 rounded-full items-center justify-center"
    >
      <ArrowUp size={20} color="#FFFFF5" strokeWidth={2.5} />
    </AnimatedPressable>
  );
};
