import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  Bell,
  Library,
  X,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import PeriodControl from "../components/paywall/period-control";
import PlanControl from "../components/paywall/plan-control";
import { ProgressiveBlurView } from "@/src/shared/components/progressive-blur-view";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { FeaturesSection, FeatureItem, Divider } from "../components/paywall/features-section";
import { IconContainer } from "../components/paywall/features-section/icon-container";
import { GradientText } from "@/src/shared/components/gradient-text";
import { trackEvent } from "@/src/mixpanel";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

const PRICE = {
  monthly: [9.99, 19.99],
  yearly: [96.0, 191.99],
};

export const Paywall = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [plan, setPlan] = useState<"pro" | "advanced">("pro");
  const [bottomContentHeight, setBottomContentHeight] = useState(0);

  const insets = useSafeAreaInsets();

  const currentPrice = PRICE[period][plan === "pro" ? 0 : 1];
  const formattedPrice = `${currentPrice} USD`;

  const listRef = useRef<ScrollView>(null);

  const closePaywall = () => {
    trackEvent("third_paywall_closed");
    router.replace("/home");
  }

  const purchase = () => {
    trackEvent("third_paywall_purchased");
    router.replace("/home");
  }

  return (
    <View className="flex-1 bg-black">
      <Image
        style={StyleSheet.absoluteFill}
        placeholder={{
          blurhash: "L3S_Ra%_j^%I*Ni^jFcBUXl7gMgI",
        }}
      />

      <View
        className="absolute flex-row items-center justify-between w-full px-6 z-50"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={closePaywall}
          className="rounded-full p-2 overflow-hidden bg-neutral-700/30"
        >
          <BlurView tint="systemThickMaterialDark" style={StyleSheet.absoluteFill} />
          <X size={20} color="#d4d4d4" />
        </Pressable>
      </View>

      <ScrollView
        ref={listRef}
        contentContainerClassName="px-5 gap-6"
        contentContainerStyle={{
          paddingTop: insets.top + 70,
          paddingBottom: bottomContentHeight + 12,
        }}
      >
        <GradientText
          text={t("thirdPaywall.title")}
          className="text-neutral-50 w-3/4 text-4xl font-bold self-center text-center"
          gradientProps={{ colors: ["#fafafa", "#fafafa", "#fafafa"] }}
        />

        <FeaturesSection key="two" title="">
          <FeatureItem
            icon={
              <IconContainer className="bg-blue-600">
                <Camera size={14} color={"white"} strokeWidth={3} />
              </IconContainer>
            }
            title={t("thirdPaywall.features.calendarScan.title")}
            description={t("thirdPaywall.features.calendarScan.description")}
          />
          <Divider />
          <FeatureItem
            icon={
              <IconContainer className="bg-orange-500">
                <Bell size={14} color={"white"} strokeWidth={3} />
              </IconContainer>
            }
            title={t("thirdPaywall.features.smartNotes.title")}
            description={t("thirdPaywall.features.smartNotes.description")}
          />
          <Divider />
          <FeatureItem
            icon={
              <IconContainer className="bg-neutral-300">
                <Library size={14} color={"black"} strokeWidth={3} />
              </IconContainer>
            }
            title={t("thirdPaywall.features.collections.title")}
            description={t("thirdPaywall.features.collections.description")}
          />
        </FeaturesSection>
      </ScrollView>

      <ProgressiveBlurView height={insets.top + 60} blurViewProps={{ tint: "dark" }} />

      <ProgressiveBlurView
        key={bottomContentHeight}
        height={bottomContentHeight + 100}
        position="bottom"
        blurViewProps={{ intensity: 100, tint: "dark" }}
      />

      {Platform.OS === "ios" && (
        <LinearGradient
          colors={["#00000000", "#00000080"]}
          style={[styles.bottomGradient, { height: insets.bottom + 100 }]}
        />
      )}

      <View
        className="absolute bottom-0 px-5"
        style={{ paddingBottom: insets.bottom + 4 }}
        onLayout={(e) => setBottomContentHeight(e.nativeEvent.layout.height)}
      >
        <View className="items-center">
          <PeriodControl value={period} setValue={setPeriod} />
        </View>

        <PlanControl
          plan={plan}
          setPlan={setPlan}
          price={PRICE}
          period={period}
          listRef={listRef}
        />

        <Pressable
          onPress={purchase}
          className="mb-4 p-4 items-center rounded-[15px] bg-white"
        >
          <Text className="text-black text-xl font-semibold">
            {t("thirdPaywall.controls.cta")}
          </Text>
        </Pressable>

        <Animated.Text
          key={formattedPrice + period}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="text-neutral-50 text-sm font-medium mb-8 text-center"
        >
          {t("thirdPaywall.controls.subscriptionNote", {
            price: formattedPrice,
            period: period.slice(0, -2),
            fullPeriod: period
          })}
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});