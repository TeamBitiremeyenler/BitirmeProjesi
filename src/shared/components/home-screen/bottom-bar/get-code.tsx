import { FC } from "react";
import { View, Pressable } from "react-native";
import { AppText } from "../../app-text";
import { fireHaptic } from "../../../lib/utils/fire-haptic";
import { useWarmUpBrowser } from "../../../lib/hooks/use-warm-up-browser";
import { WEBSITE_URL } from "../../../lib/constants/links";
import { WebBrowserPresentationStyle } from "expo-web-browser";
import * as WebBrowser from "expo-web-browser";

export const GetCode: FC = () => {
  useWarmUpBrowser();

  return (
    <Pressable
      onPress={() => {
        fireHaptic();
        WebBrowser.openBrowserAsync(`${WEBSITE_URL}/pricing`, {
          presentationStyle: WebBrowserPresentationStyle.FORM_SHEET,
        });
      }}
    >
      <View className="flex-row gap-1 items-baseline">
        <AppText className="text-lg">Get code</AppText>
        <View className="size-2 rounded-full bg-brand translate-y-0.5" />
      </View>
    </Pressable>
  );
};
