import { StateCreator } from "zustand";

export type FilterType = "apps" | "technologies" | "components" | "difficulty";
export type SelectedFilters = Record<FilterType, string[]>;

export const filterData: Record<FilterType, string[]> = {
  apps: [
    "Adidas",
    "Alma",
    "Apple Books",
    "Apple Invites",
    "App Store",
    "Canva",
    "ChatGPT",
    "ColorsApp",
    "Discord",
    "Fuse",
    "GitHub",
    "Google Chrome",
    "Gmail",
    "Grok",
    "Instagram",
    "Linear",
    "LinkedIn",
    "Longevity",
    "Luma",
    "Opal",
    "Perplexity",
    "Pinterest",
    "Queue",
    "Raycast",
    "Shopify",
    "Slack",
    "Showcase",
    "Superlist",
    "Threads",
    "Viber",
    "Whatsapp",
    "X",
  ],
  technologies: [
    "@gorhom/bottom-sheet",
    "Expo",
    "Expo Blur",
    "Expo Image",
    "Expo Linear Gradient",
    "Expo Router",
    "React Native",
    "React Native Animated",
    "React Native Coolpsable Tab View",
    "React Native Gesture Handler",
    "React Native Keyboard Controller",
    "React Native Masked View",
    "React Native Reanimated",
    "React Native Redash",
    "React Native Skia",
    "React Native Svg",
    "React Native Theme Switch Animation",
    "Reanimated Color Picker",
  ],
  components: [
    "Activity Indicator",
    "Background",
    "Badge",
    "Blur",
    "Bottomm Navigation",
    "Bottom Sheet",
    "Bottom Tabs",
    "Button",
    "Button Group",
    "Card",
    "Calousel",
    "Chip",
    "Color Picker",
    "Flashlist",
    "Flatlist",
    "Floating Action Button",
    "Gradient",
    "Header",
    "Icon",
    "Image",
    "Keyboard",
    "Keyboard Avoiding View",
    "List",
    "List Item",
    "Loading Indicator",
    "Marquee",
    "Masonry List",
    "Menu",
    "Modal",
    "Overlay",
    "Pagination",
    "Pressable",
    "Radio Button",
    "Refresh Control",
    "Scroll View",
    "Search Bar",
    "Segmented Buttons",
    "Slider",
    "Stepper",
    "Switch",
    "Tab Bar",
    "Tab Indicator",
    "Tab View",
    "Text",
    "Text Input",
    "Title",
    "Toggle Button",
    "Top Tabs",
    "View",
  ],
  difficulty: ["Easy", "Medium", "Hard"],
};

export type FiltersSlice = {
  currentFilter: FilterType;
  selectedFilters: SelectedFilters;
  setCurrentFilter: (type: FilterType) => void;
  toggleItem: (item: string) => void;
  removeItem: (type: FilterType, item: string) => void;
  clearAll: () => void;
};

const initialSelectedFilters: SelectedFilters = {
  apps: [],
  technologies: [],
  components: [],
  difficulty: [],
};

export const createFiltersSlice: StateCreator<FiltersSlice> = (set, get) => ({
  currentFilter: "apps",
  selectedFilters: initialSelectedFilters,

  setCurrentFilter: (type) => set({ currentFilter: type }),

  toggleItem: (item) => {
    const { currentFilter, selectedFilters } = get();
    const currentItems = selectedFilters[currentFilter];
    const isSelected = currentItems.includes(item);

    set({
      selectedFilters: {
        ...selectedFilters,
        [currentFilter]: isSelected
          ? currentItems.filter((i) => i !== item)
          : [...currentItems, item],
      },
    });
  },

  removeItem: (type, item) => {
    const { selectedFilters } = get();
    set({
      selectedFilters: {
        ...selectedFilters,
        [type]: selectedFilters[type].filter((i) => i !== item),
      },
    });
  },

  clearAll: () => set({ selectedFilters: initialSelectedFilters }),
});
