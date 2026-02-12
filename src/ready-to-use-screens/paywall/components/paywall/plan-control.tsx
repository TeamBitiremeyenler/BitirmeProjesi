import { StyleSheet, Text, View, Platform, TouchableOpacity, ScrollView } from "react-native";
import React from "react";
import { BlurView } from "expo-blur";
import { Check } from "lucide-react-native";
import { cn } from "@/src/shared/lib/utils/cn";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// raycast-paywall-screen-animation 🔽

type PlanCardProps = {
  title: string;
  price: string;
  subtitle: string;
  isSelected: boolean;
  onPress: () => void;
};

const PlanCard = ({ title, price, subtitle, isSelected, onPress }: PlanCardProps) => {
  return (
    <View
      className={cn(
        "flex-1 rounded-[18px] border-[2px]",
        isSelected ? "border-white" : "border-transparent"
      )}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        className={cn(
          "p-3 rounded-[18px] overflow-hidden border-[0.5px] border-neutral-700/40",
          Platform.OS === "android" ? "bg-neutral-800" : "bg-neutral-700/30"
        )}
        style={styles.borderCurve}
        onPress={onPress}
      >
        <BlurView tint="dark" style={StyleSheet.absoluteFill} />
        {isSelected && (
          <View className="absolute rounded-full right-3 top-3 p-1 bg-white">
            <Check size={10} color="#404040" strokeWidth={5} />
          </View>
        )}
        <Text className="text-neutral-50 text-xl font-bold">{title}</Text>
        <Animated.Text
          key={title + price}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="text-neutral-50 text-xl font-bold mb-1"
        >
          {price}
        </Animated.Text>
        <Text className="text-neutral-400">{subtitle}</Text>
      </TouchableOpacity>
    </View>
  );
};

type PlanControlProps = {
  plan: "pro" | "advanced";
  setPlan: (value: "pro" | "advanced") => void;
  price: { monthly: number[]; yearly: number[] };
  period: "monthly" | "yearly";
  listRef: React.RefObject<ScrollView | null>;
};

const PlanControl = ({ plan, setPlan, price, period, listRef }: PlanControlProps) => {
  const currentPrices = price[period] ?? [];
  const proPrice = currentPrices[0] ?? 0;
  const advPrice = currentPrices[1] ?? 0;

  return (
    <View className="self-stretch flex-row mb-4 items-center justify-between gap-2">
      <PlanCard
        title="Pro"
        price={`${proPrice} USD`}
        subtitle="First 2 weeks free"
        isSelected={plan === "pro"}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          listRef.current?.scrollTo({ y: 0, animated: true });
          setPlan("pro");
        }}
      />
      {/* <PlanCard
        title="Advanced AI"
        price={`${advPrice} USD`}
        subtitle="First 2 weeks free"
        isSelected={plan === "advanced"}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          listRef.current?.scrollTo({ y: 0, animated: true });
          setPlan("advanced");
        }}
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  borderCurve: {
    borderCurve: "continuous",
  },
});

export default PlanControl;

// raycast-paywall-screen-animation 🔼
