import { View, Pressable } from "react-native";
import { Settings, ArrowRight, Menu, Group } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import TabContent from "../components/profile/tab-content";
import TabControl from "../components/profile/tab-control";
import threadsImage from "@/assets/profile/threads.png";
import spacesImage from "@/assets/profile/spaces.png";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";

// perplexity-profile-segmented-control-animation 🔽

export default function Profile() {
  const insets = useSafeAreaInsets();

  // tab state drives both SegmentedControl selection and TabContent rendering.
  // When tab changes: (1) SegmentedControl.Indicator animates to new position
  // via Reanimated spring, (2) TabContent conditionally renders/unmounts,
  // (3) Image cross-fades via transition={200} prop.
  const [tab, setTab] = useState<"threads" | "spaces">("threads");

  return (
    <View
      className="flex-1 px-4 bg-neutral-900"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}
    >
      <View className="flex-row items-center justify-between mb-5">
        <Pressable
          onPress={simulatePress}
          className="p-2 rounded-full bg-neutral-800 items-center justify-center"
        >
          <Settings size={18} color="white" />
        </Pressable>
        <Pressable
          onPress={simulatePress}
          className="p-2 rounded-full bg-neutral-800 items-center justify-center"
        >
          <ArrowRight size={18} color="white" />
        </Pressable>
      </View>

      <View className="flex-1 mb-10">
        {/* Conditional rendering: Only active tab's TabContent mounts, reducing
            memory footprint. Image transition={200} handles cross-fade when
            switching tabs, synchronized with SegmentedControl indicator animation. */}
        {tab === "threads" && (
          <TabContent
            imageSrc={threadsImage}
            title="Get started"
            description="Create a thread to dive into a new world of curiosity and knowledge"
            buttonText="Create a thread"
            buttonIcon={<Menu size={16} strokeWidth={3} color="black" />}
          />
        )}
        {tab === "spaces" && (
          <TabContent
            imageSrc={spacesImage}
            title="Get started"
            description="Organize your threads and collaborate with others on a journey of discovery"
            buttonText="Create a space"
            buttonIcon={<Group size={16} strokeWidth={3} color="black" />}
          />
        )}
      </View>

      {/* TabControl manages SegmentedControl animation internally. value prop
          syncs indicator position; setValue callback triggers tab state update
          which drives TabContent conditional rendering above. */}
      <TabControl value={tab} setValue={setTab} />
    </View>
  );
}

// perplexity-profile-segmented-control-animation 🔼
