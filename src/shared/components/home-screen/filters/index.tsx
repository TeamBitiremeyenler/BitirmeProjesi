import { Pressable, Text, View } from "react-native";
import { FC, RefObject, useState, useEffect } from "react";
import Filter from "./filter";
import BottomSheet from "@gorhom/bottom-sheet";

type FilterType = "apps" | "technologies" | "components" | "difficulty";
type SelectedFilters = Record<FilterType, string[]>;

type FiltersProps = {
  sheetRef: RefObject<BottomSheet | null>;
  onFilterSelect: (type: FilterType) => void;
  selectedFilters: SelectedFilters;
  onRemoveItem: (type: FilterType, item: string) => void;
  onClearAll: () => void;
};

const Filters: FC<FiltersProps> = ({
  sheetRef,
  onFilterSelect,
  selectedFilters,
  onRemoveItem,
  onClearAll,
}) => {
  const [row1Heights, setRow1Heights] = useState({ apps: 0, technologies: 0 });
  const [row2Heights, setRow2Heights] = useState({ components: 0, difficulty: 0 });

  const row1MaxHeight = Math.max(row1Heights.apps, row1Heights.technologies);
  const row2MaxHeight = Math.max(row2Heights.components, row2Heights.difficulty);

  const handleFilterPress = (type: FilterType) => {
    onFilterSelect(type);
    sheetRef.current?.snapToIndex(0);
  };

  const hasSelectedFilters = Object.values(selectedFilters).some((items) => items.length > 0);

  // Reset heights when all filters are cleared
  useEffect(() => {
    if (!hasSelectedFilters) {
      setRow1Heights({ apps: 0, technologies: 0 });
      setRow2Heights({ components: 0, difficulty: 0 });
    }
  }, [hasSelectedFilters]);

  return (
    <View>
      <View className="flex-row justify-between items-center">
        <Text className="text-white mb-2">Filter by</Text>
        {hasSelectedFilters && (
          <Pressable onPress={onClearAll}>
            <Text className="text-[#a8a29e] mb-2">Clear all</Text>
          </Pressable>
        )}
      </View>
      <View className="gap-2 mb-4">
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Filter
              label="Apps"
              onPress={() => handleFilterPress("apps")}
              selectedItems={selectedFilters.apps}
              onRemoveItem={(item) => onRemoveItem("apps", item)}
              minHeight={row1MaxHeight || undefined}
              onLayout={(height) => setRow1Heights((prev) => ({ ...prev, apps: height }))}
            />
          </View>
          <View className="flex-1">
            <Filter
              label="Technologies"
              onPress={() => handleFilterPress("technologies")}
              selectedItems={selectedFilters.technologies}
              onRemoveItem={(item) => onRemoveItem("technologies", item)}
              minHeight={row1MaxHeight || undefined}
              onLayout={(height) => setRow1Heights((prev) => ({ ...prev, technologies: height }))}
            />
          </View>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Filter
              label="Components"
              onPress={() => handleFilterPress("components")}
              selectedItems={selectedFilters.components}
              onRemoveItem={(item) => onRemoveItem("components", item)}
              minHeight={row2MaxHeight || undefined}
              onLayout={(height) => setRow2Heights((prev) => ({ ...prev, components: height }))}
            />
          </View>
          <View className="flex-1">
            <Filter
              label="Difficulty"
              onPress={() => handleFilterPress("difficulty")}
              selectedItems={selectedFilters.difficulty}
              onRemoveItem={(item) => onRemoveItem("difficulty", item)}
              minHeight={row2MaxHeight || undefined}
              onLayout={(height) => setRow2Heights((prev) => ({ ...prev, difficulty: height }))}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default Filters;
