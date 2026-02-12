import { Text, StyleSheet } from "react-native";
import { cn } from "@/src/shared/lib/utils/cn";
import SegmentedControl from "@/src/shared/components/segmented-control";
import { Group, Menu } from "lucide-react-native";

// perplexity-profile-segmented-control-animation 🔽

type TabControlProps = {
  value: "threads" | "spaces";
  setValue: (value: "threads" | "spaces") => void;
};

const TabControl = ({ value, setValue }: TabControlProps) => {
  return (
    <SegmentedControl
      value={value}
      // onValueChange triggers SegmentedControl's internal animation: indicator
      // animates width/height/left to match the newly selected item's measured
      // geometry using spring physics (default) for smooth pill sliding.
      onValueChange={(v) => setValue(v as "threads" | "spaces")}
      className="p-1 justify-between rounded-full bg-neutral-800 border border-neutral-700/50"
      // borderCurve: "continuous" enables iOS 16+ smooth rounded geometry that
      // prevents sharp edges during indicator animation transitions.
      style={styles.borderCurve}
    >
      <SegmentedControl.Indicator
        // top-[3px]: Positions indicator inside container padding (p-1 = 4px - border width).
        // -ml-[1px]: Slight left offset to align with visual border spacing.
        // Indicator animates absolutely positioned, so these offsets ensure
        // precise visual alignment with tab items during transitions.
        className="top-[3px] -ml-[1px] rounded-full bg-cyan-950 border border-cyan-800/50"
        style={styles.borderCurve}
      />

      <SegmentedControl.Item
        value="threads"
        // flex-1: Equal width distribution ensures indicator width animation
        // is consistent between tabs. py-3: Vertical padding contributes to
        // indicator height measurement for smooth size transitions.
        className="flex-1 items-center justify-center gap-1 py-3"
      >
        {/* Color transitions (#0891B2 active, #A3A3A3 inactive) provide visual
            feedback synchronized with indicator animation. These happen on JS
            thread but are fast enough to feel coordinated with Reanimated motion. */}
        <Menu size={18} strokeWidth={3} color={value === "threads" ? "#0891B2" : "#A3A3A3"} />
        <Text
          className={cn(value === "threads" ? "text-xs text-cyan-600" : "text-xs text-neutral-400")}
        >
          Threads
        </Text>
      </SegmentedControl.Item>

      <SegmentedControl.Item
        value="spaces"
        className="flex-1 items-center justify-center gap-1 py-3"
      >
        <Group size={18} strokeWidth={3} color={value === "spaces" ? "#0891B2" : "#A3A3A3"} />
        <Text
          className={cn(value === "spaces" ? "text-xs text-cyan-600" : "text-xs text-neutral-400")}
        >
          Spaces
        </Text>
      </SegmentedControl.Item>
    </SegmentedControl>
  );
};

const styles = StyleSheet.create({
  // borderCurve: "continuous" is iOS-specific (16+) and creates smoother
  // rounded corners than standard borderRadius. Critical for indicator
  // animation to avoid visual artifacts during pill sliding transitions.
  borderCurve: {
    borderCurve: "continuous",
  },
});

export default TabControl;

// perplexity-profile-segmented-control-animation 🔼
