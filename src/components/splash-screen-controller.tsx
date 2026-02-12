import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthContext } from '@/src/hooks/auth-hooks';

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
    duration: 1000,
    fade: true,
});

export function SplashScreenController() {
    const { isLoading } = useAuthContext();

    useEffect(() => {
        if (!isLoading) {
            SplashScreen.hideAsync();
        }
    }, [isLoading]);

    return null;
}