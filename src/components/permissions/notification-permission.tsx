import React from 'react';
import { View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { BottomSheet, Button } from 'heroui-native';

interface NotificationPermissionSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const NotificationPermissionSheet = ({
    isOpen,
    onOpenChange
}: NotificationPermissionSheetProps) => {
    const { t } = useTranslation();

    const handleRequest = async () => {
        // Check current status
        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        if (existingStatus === 'denied') {
            // If denied, we usually have to send them to system settings
            Linking.openSettings();
            return;
        }

        const { status } = await Notifications.requestPermissionsAsync();

        if (status === 'granted') {
            onOpenChange(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
            <BottomSheet.Portal>
                <BottomSheet.Overlay />
                <BottomSheet.Content className="p-6">
                    <View className="flex flex-col items-center">
                        <Image
                            // Using your asset naming convention
                            source={require('@/assets/permissions/notification.png')}
                            className="w-32 h-32 mb-4"
                            resizeMode="contain"
                        />

                        <BottomSheet.Title className="text-xl font-bold text-center">
                            {t('permissions.notifications.title')}
                        </BottomSheet.Title>

                        <BottomSheet.Description className="text-center text-gray-500 mt-2 px-4">
                            {t('permissions.notifications.description')}
                        </BottomSheet.Description>
                    </View>

                    <View className="flex flex-row gap-3 my-8 justify-center">
                        <Button
                            variant="tertiary"
                            onPress={() => onOpenChange(false)}
                        >
                            <Button.Label>
                                {t('permissions.notifications.later')}
                            </Button.Label>
                        </Button>
                        <Button
                            onPress={handleRequest}
                        >
                            <Button.Label>
                                {t('permissions.notifications.allow')}
                            </Button.Label>
                        </Button>
                    </View>
                </BottomSheet.Content>
            </BottomSheet.Portal>
        </BottomSheet>
    );
};