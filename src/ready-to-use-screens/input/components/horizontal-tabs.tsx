import { View, Text, Pressable } from "react-native";
import { Image as ImageIcon, Camera, Sparkle } from "lucide-react-native";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";
import { useTranslation } from "react-i18next";

export type SourceTabKey = "image" | "camera" | "ai";

const TABS: { key: SourceTabKey; label: string; Icon: any }[] = [
  { key: "image", label: "image", Icon: ImageIcon },
  { key: "camera", label: "camera", Icon: Camera },
  { key: "ai", label: "ai", Icon: Sparkle },
];

export const HorizontalTabs: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-3 mt-4">
      {TABS.map(({ key, label, Icon }) => {
        return (
          <Pressable
            key={key}
            onPress={() => {
              simulatePress();
            }}
            style={{ borderCurve: "continuous" }}
            className="flex-1 rounded-2xl px-4 py-6 items-center justify-center bg-neutral-700"
          >
            <Icon size={20} color="white" />
            <Text className="mt-3 text-white font-medium">{t(`home.${label}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

// perplexity-bottom-sheet-backdrop-animation 🔼
