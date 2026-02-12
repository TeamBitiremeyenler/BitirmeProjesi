import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import PageProvider from "@/src/components/page-provider";
import { ChevronLeft, MoreVertical, Pencil, Trash2 } from "lucide-react-native";
import { Chip, Select } from "heroui-native"; // Import Select
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";

export default function PhotoDetail() {
    const { "photo-id": photoId } = useLocalSearchParams<{ "photo-id": string }>();
    const { t } = useTranslation();

    const handleAction = (val: { value: string }) => {
        if (val.value === "update") {
            console.log("Open Update Modal for:", photoId);
            // logic to open your create/update sheet
        } else if (val.value === "delete") {
            console.log("Delete collection:", photoId);
            // logic for delete confirmation
        }
    };

    const TAGS = [
        "#lorem",
        "#ipsum",
        "#color",
        "#brand"
    ]

    return (
        <PageProvider>
            <View className="flex flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.replace('/home')}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>

                <View className="flex-1">
                    <Text className="text-lg font-bold text-center" numberOfLines={1}>
                        Photo page
                    </Text>
                </View>

                {/* --- SELECT COMPONENT START --- */}
                <Select onValueChange={(value) => {
                    if (value) {
                        handleAction(value);
                    }
                }}>
                    <Select.Trigger asChild>
                        <TouchableOpacity>
                            <MoreVertical size={24} color="#000" />
                        </TouchableOpacity>
                    </Select.Trigger>

                    <Select.Portal>
                        <Select.Overlay />
                        <Select.Content
                            presentation="popover"
                            placement="bottom"
                            align="end"
                            width={280}
                        >
                            <Select.Item value="update" label={t("collectionPage.update")}>
                                <View className="flex-row items-center gap-3 flex-1">
                                    <Pencil size={18} color="#737272" />
                                    <Select.ItemLabel className="text-foreground" />
                                </View>
                            </Select.Item>

                            <Select.Item value="delete" label={t("collectionPage.delete")}>
                                <View className="flex-row items-center gap-3 flex-1">
                                    <Trash2 size={18} color="#ef4444" />
                                    <Select.ItemLabel className="text-danger font-medium" />
                                </View>
                            </Select.Item>
                        </Select.Content>
                    </Select.Portal>
                </Select>
            </View>
            <ScrollView className="mt-6">
                <View className="mb-4">
                    <Text className="font-bold text-lg">12.06.2026</Text>
                </View>
                <Image
                    source={require("@/assets/note.jpg")}
                    style={{ width: '100%', height: 300, borderRadius: 16, marginVertical: 16 }}
                />
                <View className="flex-row gap-2">
                    {TAGS.map((tag, index) => (
                        <Chip key={index}>
                            <Chip.Label>{tag}</Chip.Label>
                        </Chip>
                    ))}
                </View>
            </ScrollView>
        </PageProvider>
    );
}