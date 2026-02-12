import { FC, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { AppText } from "../../app-text";
import { Animation } from "../../../lib/types/app";

type HeaderProps = {
  animation: Animation;
  rotation: number;
  index: number;
};

const isNew = (timestamp: number): boolean => {
  const TEN_DAYS_IN_MS = 10 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return now - timestamp < TEN_DAYS_IN_MS;
};

export const Header: FC<HeaderProps> = ({ animation, rotation, index }) => {
  const {
    app: { title: appTitle, icon_url: logoUrl },
    title: animationTitle,
    _creationTime: createdAt,
  } = animation;

  const isAnimationNew = useMemo(() => isNew(createdAt), [createdAt]);
  return (
    <View className="flex-row gap-3 items-center mx-2">
      <View
        className="w-[44px] h-[44px] rounded-2xl bg-foreground p-[1.5px]"
        style={[
          styles.borderCurve,
          {
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      >
        <Image style={styles.image} contentFit="cover" source={{ uri: logoUrl }} />
      </View>
      <View className="flex-1">
        <AppText numberOfLines={1} className="text-base/5 text-muted-foreground font-sans-medium">
          {appTitle}{" "}
          {isAnimationNew && index === 0 && (
            <AppText className="text-brand font-sans-semibold">new drop ✨</AppText>
          )}
        </AppText>
        <AppText numberOfLines={1} className="text-xl font-sans-medium">
          {animationTitle}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 13.5,
    borderCurve: "continuous",
  },
  borderCurve: {
    borderCurve: "continuous",
  },
});
