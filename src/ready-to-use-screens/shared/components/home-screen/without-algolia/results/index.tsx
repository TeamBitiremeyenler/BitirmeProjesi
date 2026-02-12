import { FC, RefObject, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions, View } from "react-native";
import { STATIC_ANIMATIONS, StaticAnimation } from "../../../../lib/constants/apps";
import { useAnimationsStore } from "../../../../lib/store/animations";
import { ListItem } from "./list-item";
import { BackToTopButton } from "./back-to-top-button";
import CurvedDivider from "../../../curved-divider";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { AppText } from "../../../app-text";

type Props = {
  listRef: RefObject<FlashListRef<StaticAnimation> | null>;
};

export const Results: FC<Props> = ({ listRef }) => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const value = useAnimationsStore.use.query();

  const { height: screenHeight } = useWindowDimensions();

  const filteredStaticAnimations =
    value.trim().length === 0
      ? STATIC_ANIMATIONS
      : STATIC_ANIMATIONS.filter(
          (app) =>
            app.appName.toLowerCase().includes(value.toLowerCase()) ||
            app.animationName.toLowerCase().includes(value.toLowerCase())
        );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowBackToTop(offsetY > screenHeight);
  };

  return (
    <View className="flex-1">
      <FlashList
        ref={listRef}
        data={filteredStaticAnimations}
        keyExtractor={(item) => item.animationName + "-" + item.appName}
        renderItem={({ item, index }) => <ListItem animation={item} index={index} />}
        ItemSeparatorComponent={() => (
          <View className="my-2">
            <CurvedDivider />
          </View>
        )}
        contentContainerClassName="py-5"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={() => (
          <AppText className="text-white text-xl text-center mt-10">No results found 😔</AppText>
        )}
      />
      <BackToTopButton listRef={listRef} showBackToTop={showBackToTop} />
    </View>
  );
};
