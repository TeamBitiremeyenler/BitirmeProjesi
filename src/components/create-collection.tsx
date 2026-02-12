import React, { useState } from "react";
import { View } from "react-native";
import { BottomSheet, TextField, Button } from "heroui-native";
import { useTranslation } from "react-i18next"; // Import hook

interface CreateCollectionSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate?: (name: string) => void;
}

export function CreateCollectionSheet({
    isOpen,
    onOpenChange,
    onCreate,
}: CreateCollectionSheetProps) {
    const { t } = useTranslation(); // Initialize translation
    const [collectionName, setCollectionName] = useState("");

    const handleCreate = () => {
        if (collectionName.trim()) {
            onCreate?.(collectionName);
            setCollectionName("");
            onOpenChange(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
            <BottomSheet.Portal>
                <BottomSheet.Overlay />
                <BottomSheet.Content>
                    <View className="mb-6 gap-2">
                        <BottomSheet.Title>
                            {t("collectionBottom.title")}
                        </BottomSheet.Title>
                        <BottomSheet.Description>
                            {t("collectionBottom.description")}
                        </BottomSheet.Description>
                    </View>

                    <View className="gap-6">
                        <TextField isRequired>
                            <TextField.Label>
                                {t("collectionBottom.label")}
                            </TextField.Label>
                            <TextField.Input
                                placeholder={t("collectionBottom.placeholder")}
                                value={collectionName}
                                onChangeText={setCollectionName}
                                autoFocus
                            />
                        </TextField>

                        <View className="flex-row gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onPress={() => onOpenChange(false)}
                            >
                                {t("collectionBottom.cancel")}
                            </Button>
                            <Button
                                className="flex-1"
                                onPress={handleCreate}
                                isDisabled={!collectionName.trim()}
                            >
                                {t("collectionBottom.submit")}
                            </Button>
                        </View>
                    </View>
                </BottomSheet.Content>
            </BottomSheet.Portal>
        </BottomSheet>
    );
}