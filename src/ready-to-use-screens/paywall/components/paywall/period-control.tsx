import { Text, View, StyleSheet, Platform } from "react-native";
import { cn } from "@/src/shared/lib/utils/cn";
import { BlurView } from "expo-blur";
import SegmentedControl from "@/src/shared/components/segmented-control";

// raycast-paywall-screen-animation 🔽

type SwitcherProps = {
  value: "monthly" | "yearly";
  setValue: (value: "monthly" | "yearly") => void;
};

const PeriodControl = ({ value, setValue }: SwitcherProps) => {
  return (
    <SegmentedControl
      value={value}
      onValueChange={(v) => setValue(v as "monthly" | "yearly")}
      className={cn(
        "overflow-hidden mb-5 px-1 py-1 justify-between rounded-full border border-neutral-700/30",
        Platform.OS === "android" ? "bg-neutral-800" : "bg-neutral-700/50"
      )}
      style={styles.borderCurve}
    >
      <BlurView key="control-bg" tint="systemThickMaterialDark" style={StyleSheet.absoluteFill} />
      <SegmentedControl.Indicator
        className="top-1 rounded-full overflow-hidden bg-neutral-700"
        style={styles.borderCurve}
      />

      <SegmentedControl.Item value="monthly" className="px-4 py-1.5 rounded-full">
        <Text
          className={cn(
            value === "monthly"
              ? "text-neutral-50 text-lg font-semibold"
              : "text-neutral-400 text-lg font-semibold"
          )}
        >
          Monthly
        </Text>
      </SegmentedControl.Item>
      <SegmentedControl.Item value="yearly" className="pl-4 pr-1 py-1.5 rounded-full">
        <View className="flex-row gap-3">
          <Text
            className={cn(
              value === "yearly"
                ? "text-neutral-50 text-lg font-semibold"
                : "text-neutral-400 text-lg font-semibold"
            )}
          >
            Yearly
          </Text>
          <View className="pt-0.5 px-2 bg-neutral-50 rounded-full" style={styles.borderCurve}>
            <Text className="text-neutral-900 text-base ">-20%</Text>
          </View>
        </View>
      </SegmentedControl.Item>
    </SegmentedControl>
  );
};

const styles = StyleSheet.create({
  borderCurve: {
    borderCurve: "continuous",
  },
});

export default PeriodControl;

// raycast-paywall-screen-animation 🔼
