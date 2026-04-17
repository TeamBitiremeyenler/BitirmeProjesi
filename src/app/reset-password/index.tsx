import { supabase } from '@/lib/supabase';
import PageProvider from '@/src/components/page-provider';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Button, TextField } from 'heroui-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Image as RNImage, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { goBackOrReplace } from '@/src/lib/navigation';

type AuthUrlParams = {
    accessToken?: string;
    refreshToken?: string;
    code?: string;
    errorDescription?: string;
};

function parseAuthUrlParams(url: string): AuthUrlParams {
    const params: Record<string, string> = {};
    const [, queryAndHash = ''] = url.split('?');
    const [query = '', hashFromQuery = ''] = queryAndHash.split('#');
    const hash = url.includes('#') ? url.split('#').slice(1).join('#') : hashFromQuery;

    for (const part of [query, hash]) {
        for (const pair of part.split('&')) {
            if (!pair) continue;
            const [rawKey, rawValue = ''] = pair.split('=');
            const key = decodeURIComponent(rawKey);
            const value = decodeURIComponent(rawValue.replace(/\+/g, ' '));
            params[key] = value;
        }
    }

    return {
        accessToken: params.access_token,
        refreshToken: params.refresh_token,
        code: params.code,
        errorDescription: params.error_description,
    };
}

export default function ResetPasswordScreen() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPreparingSession, setIsPreparingSession] = useState(true);
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const prepareRecoverySession = useCallback(async (url: string | null) => {
        if (!url) {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            setIsSessionReady(Boolean(session));
            setIsPreparingSession(false);
            return;
        }

        const params = parseAuthUrlParams(url);
        if (params.errorDescription) {
            setError(params.errorDescription);
            setIsSessionReady(false);
            setIsPreparingSession(false);
            return;
        }

        try {
            if (params.code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
                if (exchangeError) throw exchangeError;
                setIsSessionReady(true);
                return;
            }

            if (params.accessToken && params.refreshToken) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: params.accessToken,
                    refresh_token: params.refreshToken,
                });
                if (sessionError) throw sessionError;
                setIsSessionReady(true);
                return;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();
            setIsSessionReady(Boolean(session));
        } catch (sessionError) {
            setError(sessionError instanceof Error ? sessionError.message : 'Şifre sıfırlama bağlantısı geçersiz.');
            setIsSessionReady(false);
        } finally {
            setIsPreparingSession(false);
        }
    }, []);

    useEffect(() => {
        Linking.getInitialURL()
            .then(prepareRecoverySession)
            .catch(() => {
                setError('Şifre sıfırlama bağlantısı okunamadı.');
                setIsPreparingSession(false);
            });

        const subscription = Linking.addEventListener('url', ({ url }) => {
            setIsPreparingSession(true);
            prepareRecoverySession(url).catch(() => {
                setError('Şifre sıfırlama bağlantısı okunamadı.');
                setIsPreparingSession(false);
            });
        });

        return () => subscription.remove();
    }, [prepareRecoverySession]);

    async function handleUpdatePassword() {
        if (password.length < 6) {
            setError('Yeni şifre en az 6 karakter olmalı.');
            setSuccessMessage(null);
            return;
        }

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            setSuccessMessage(null);
            return;
        }

        setIsUpdating(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            await supabase.auth.signOut();
            setSuccessMessage('Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.');
            setPassword('');
            setConfirmPassword('');
            setIsSessionReady(false);
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Şifre güncellenemedi.');
        } finally {
            setIsUpdating(false);
        }
    }

    return (
        <PageProvider>
            <ScrollView
                contentContainerClassName="flex flex-1 justify-center"
                className="flex-1"
            >
                <View className="gap-6">
                    <View className="mb-4">
                        <TouchableOpacity onPress={() => goBackOrReplace(router, '/login')}>
                            <ChevronLeft size={24} />
                        </TouchableOpacity>
                    </View>

                    <RNImage
                        style={{ width: 48, height: 48 }}
                        source={require('@/assets/real assets/mainLogo.png')}
                    />

                    <View>
                        <Text className="text-2xl font-bold mb-2">
                            Yeni Şifre Belirle
                        </Text>
                        <Text>
                            Şifre sıfırlama bağlantısından geldiysen yeni şifreni buradan kaydedebilirsin.
                        </Text>
                    </View>

                    {isPreparingSession ? (
                        <Text>Bağlantı kontrol ediliyor...</Text>
                    ) : null}

                    {!isPreparingSession && !isSessionReady && !successMessage ? (
                        <Text className="text-danger">
                            {error ?? 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.'}
                        </Text>
                    ) : null}

                    {isSessionReady ? (
                        <>
                            <TextField isRequired isInvalid={!!error}>
                                <TextField.Label>Yeni Şifre</TextField.Label>
                                <TextField.Input
                                    placeholder="En az 6 karakter"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </TextField>

                            <TextField isRequired isInvalid={!!error}>
                                <TextField.Label>Yeni Şifre Tekrar</TextField.Label>
                                <TextField.Input
                                    placeholder="Şifreni tekrar yaz"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                />
                                {error ? <TextField.ErrorMessage>{error}</TextField.ErrorMessage> : null}
                            </TextField>

                            <Button
                                variant="primary"
                                onPress={handleUpdatePassword}
                                isDisabled={isUpdating}
                            >
                                <Button.Label>
                                    {isUpdating ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                                </Button.Label>
                            </Button>
                        </>
                    ) : null}

                    {successMessage ? (
                        <>
                            <Text className="text-success text-center">{successMessage}</Text>
                            <Button variant="primary" onPress={() => router.replace('/login')}>
                                <Button.Label>Girişe Dön</Button.Label>
                            </Button>
                        </>
                    ) : null}
                </View>
            </ScrollView>
        </PageProvider>
    );
}
