import React from 'react';
import { View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { BottomSheet, Button } from 'heroui-native';

interface CameraPermissionSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onPermissionGranted: () => void;
}

export const CameraPermissionSheet = ({
    isOpen,
    onOpenChange,
    onPermissionGranted
}: CameraPermissionSheetProps) => {
    const { t } = useTranslation();
    const [permission, requestPermission] = useCameraPermissions();

    const handleRequest = async () => {
        if (permission?.status === 'denied' && !permission.canAskAgain) {
            Linking.openSettings();
            return;
        }

        const result = await requestPermission();
        if (result.granted) {
            onPermissionGranted();
            onOpenChange(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
            <BottomSheet.Portal>
                <BottomSheet.Overlay />
                <BottomSheet.Content>
                    <View className="flex flex-col items-center">
                        <Image
                            source={require('@/assets/permissions/camera.png')}
                            className="w-24 h-24 mb-4"
                            resizeMode="contain"
                        />

                        <BottomSheet.Title className="text-xl font-bold text-center">
                            {t('permissions.camera.title')}
                        </BottomSheet.Title>

                        <BottomSheet.Description className="text-center text-gray-500 mt-2">
                            {t('permissions.camera.description')}
                        </BottomSheet.Description>
                    </View>

                    <View className="flex flex-row gap-3 my-8 justify-center">
                        <Button
                            variant="tertiary"
                            onPress={() => onOpenChange(false)}
                        >
                            <Button.Label>
                                {t('permissions.camera.later')}
                            </Button.Label>
                        </Button>
                        <Button
                            onPress={handleRequest}
                        >
                            <Button.Label>
                                {permission?.status === 'denied' && !permission.canAskAgain
                                    ? t('permissions.camera.settings')
                                    : t('permissions.camera.allow')}
                            </Button.Label>
                        </Button>
                    </View>
                </BottomSheet.Content>
            </BottomSheet.Portal>
        </BottomSheet>
    );
};