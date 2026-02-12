import React from 'react';
import { View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
    requestTrackingPermissionsAsync,
    getTrackingPermissionsAsync
} from 'expo-tracking-transparency';
import * as Linking from 'expo-linking';
import { BottomSheet, Button } from 'heroui-native';

interface TrackingPermissionSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const TrackingPermissionSheet = ({
    isOpen,
    onOpenChange
}: TrackingPermissionSheetProps) => {
    const { t } = useTranslation();

    const handleRequest = async () => {
        const { status: existingStatus } = await getTrackingPermissionsAsync();

        // If the user previously denied, we guide them to settings
        if (existingStatus === 'denied') {
            Linking.openSettings();
            return;
        }

        const { status } = await requestTrackingPermissionsAsync();

        // Close the sheet regardless of granted/denied after the system prompt
        onOpenChange(false);
    };

    return (
        <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
            <BottomSheet.Portal>
                <BottomSheet.Overlay />
                <BottomSheet.Content className="p-6">
                    <View className="flex flex-col items-center">
                        <Image
                            source={require('@/assets/permissions/track.png')}
                            className="w-24 h-24 mb-4"
                            resizeMode="contain"
                        />

                        <BottomSheet.Title className="text-xl font-bold text-center">
                            {t('permissions.tracking.title')}
                        </BottomSheet.Title>

                        <BottomSheet.Description className="text-center text-gray-500 mt-2 px-4">
                            {t('permissions.tracking.description')}
                        </BottomSheet.Description>
                    </View>

                    <View className="flex flex-row gap-3 my-8 justify-center">
                        <Button
                            variant="tertiary"
                            onPress={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            <Button.Label>
                                {t('permissions.tracking.later')}
                            </Button.Label>
                        </Button>
                        <Button
                            onPress={handleRequest}
                            className="flex-1"
                        >
                            <Button.Label>
                                {t('permissions.tracking.allow')}
                            </Button.Label>
                        </Button>
                    </View>
                </BottomSheet.Content>
            </BottomSheet.Portal>
        </BottomSheet>
    );
};