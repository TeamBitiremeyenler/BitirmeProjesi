import { SafeAreaView } from "react-native-safe-area-context";

interface IPageProvider {
    children: React.ReactNode;
    spaceHorizontal?: "s" | "m" | "l";
    spaceVertical?: "s" | "m" | "l";
    containerClassName?: string;
}

export default function PageProvider({
    children,
    spaceHorizontal,
    spaceVertical,
    containerClassName,
}: IPageProvider) {
    const DEFAULT_SPACE_HORIZONTAL = 24;
    const DEFAULT_SPACE_VERTICAL = 24;

    const spaceHorizontalController = (value?: "s" | "m" | "l") => {
        switch (value) {
            case "s":
                return 8;
            case "m":
                return 16;
            case "l":
                return 24;
            default:
                return DEFAULT_SPACE_HORIZONTAL;
        }
    };

    const spaceVerticalController = (value?: "s" | "m" | "l") => {
        switch (value) {
            case "s":
                return 8;
            case "m":
                return 16;
            case "l":
                return 24;
            default:
                return DEFAULT_SPACE_VERTICAL;
        }
    };

    return (
        <SafeAreaView
            className={containerClassName}
            style={{
                flex: 1,
                backgroundColor: "#fffaf5",
                paddingHorizontal: spaceHorizontalController(spaceHorizontal),
                paddingVertical: spaceVerticalController(spaceVertical),
            }}
        >
            {children}
        </SafeAreaView>
    );
}
