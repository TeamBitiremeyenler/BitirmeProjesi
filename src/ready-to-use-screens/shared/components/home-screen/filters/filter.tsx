import { Platform, Pressable, Text, View } from "react-native";
import { FC } from "react";
import { Plus } from "lucide-react-native";
import SelectedFilterChip from "./selected-filter-chip";

type FilterProps = {
  label: string;
  onPress: () => void;
  selectedItems?: string[];
  onRemoveItem?: (item: string) => void;
  minHeight?: number;
  onLayout?: (height: number) => void;
};

const HEIGHT = 44;

const Filter: FC<FilterProps> = ({
  label,
  onPress,
  selectedItems = [],
  onRemoveItem,
  minHeight,
  onLayout,
}) => {
  const hasSelectedItems = selectedItems.length > 0;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: Platform.OS === "ios" ? "#515151" : "#1C1C1C",
        borderWidth: Platform.OS === "ios" ? 0 : 1,
        borderColor: Platform.OS === "ios" ? "transparent" : "#303030",
        minHeight: minHeight || HEIGHT,
      }}
      onLayout={(event) => {
        if (onLayout) {
          onLayout(event.nativeEvent.layout.height);
        }
      }}
    >
      {Platform.OS === "ios" ? (
        <>
          <View className="absolute h-full left-0.5 right-0.5 top-1 bg-[#1C1C1C] rounded-xl shadow-[-4_-3_3_#1C1C1C]" />
          <View className="absolute h-full left-0.5 right-0.5 top-1 bg-[#1C1C1C] rounded-xl shadow-[4_-3_3_#1C1C1C]" />
        </>
      ) : null}

      <View className="flex-row items-center justify-between px-3 my-4">
        <Text className="text-[#a8a29e] font-medium">{label}</Text>
        {!hasSelectedItems && <Plus size={16} strokeWidth={2} color="#a8a29e" />}
      </View>

      {hasSelectedItems && (
        <View className="px-2 py-1 flex-row flex-wrap gap-1">
          {selectedItems.map((item) => (
            <View key={item}>
              <SelectedFilterChip
                label={item}
                onRemove={() => onRemoveItem && onRemoveItem(item)}
              />
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
};

export default Filter;
