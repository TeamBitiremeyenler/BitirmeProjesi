import { FC } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { AppText } from "../../../app-text";
import { router } from "expo-router";
import { fireHaptic } from "@/src/shared/lib/utils/fire-haptic";
import { cn } from "@/src/shared/lib/utils/cn";
import { StaticAnimation } from "@/src/shared/lib/constants/apps";

type Props = {
  animation: StaticAnimation;
  index: number;
};

export const ListItem: FC<Props> = ({ animation, index }) => {
  const handleRedirect = () => {
    fireHaptic();
    router.push(animation.href);
  };
  return (
    <Pressable onPress={handleRedirect} className="flex-row gap-3 items-center px-5 py-3">
      <View
        className={cn(
          "size-[44px] rounded-2xl border bg-muted border-foreground/5 items-center justify-center",
          index > 98 && "w-[64px] h-[44px]"
        )}
        style={[styles.borderCurve]}
      >
        <AppText className="w-full text-center text-4xl font-display text-foreground">
          {index + 1}
        </AppText>
      </View>

      <View className="flex-1">
        <AppText numberOfLines={1} className="text-base/5 text-muted-foreground font-sans-medium">
          {animation.appName}
        </AppText>
        <AppText numberOfLines={1} className="text-xl font-sans-medium">
          {animation.animationName}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  borderCurve: {
    borderCurve: "continuous",
  },
});
