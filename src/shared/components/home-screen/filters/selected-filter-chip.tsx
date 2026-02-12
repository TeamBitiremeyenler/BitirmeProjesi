import { FC } from "react";
import { Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";

type SelectedFilterChipProps = {
  label: string;
  onRemove: () => void;
};

const SelectedFilterChip: FC<SelectedFilterChipProps> = ({ label, onRemove }) => {
  return (
    <View
      className="flex-row items-center bg-neutral-950 rounded-md px-2 py-1"
      style={{ maxWidth: "100%" }}
    >
      <Text className="text-white text-sm mr-2" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Pressable onPress={onRemove}>
        <X size={14} color="#ef4444" />
      </Pressable>
    </View>
  );
};

export default SelectedFilterChip;
