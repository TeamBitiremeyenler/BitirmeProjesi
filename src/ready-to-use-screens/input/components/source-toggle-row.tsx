import { View, Text, Switch } from "react-native";

// perplexity-bottom-sheet-backdrop-animation 🔽

export interface SourceToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export const SourceToggleRow: React.FC<SourceToggleRowProps> = ({
  icon,
  title,
  description,
  value,
  onValueChange,
}) => {
  return (
    <View className="flex-row items-center">
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className="text-white text-lg font-medium">{title}</Text>
        </View>
        <Text className="text-[#9ea2a6] text-sm ml-7 mt-2">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#6b6f72", true: "#35b5b0" }}
        ios_backgroundColor={"#6b6f72"}
        thumbColor={"white"}
      />
    </View>
  );
};

// perplexity-bottom-sheet-backdrop-animation 🔼
