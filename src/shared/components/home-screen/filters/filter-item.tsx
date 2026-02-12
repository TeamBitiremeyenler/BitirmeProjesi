import { FC } from "react";
import { Pressable, Text } from "react-native";
import { Check } from "lucide-react-native";

type FilterItemProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

const FilterItem: FC<FilterItemProps> = ({ label, isSelected, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-3 py-4 border-b border-neutral-800"
    >
      <Text className="text-white text-base">{label}</Text>
      {isSelected && <Check size={20} color="#a8a29e" />}
    </Pressable>
  );
};

export default FilterItem;
