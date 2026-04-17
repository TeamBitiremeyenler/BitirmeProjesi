import React, { useState } from 'react';
import { Image as RNImage, View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { TextField, Button } from 'heroui-native';
import { supabase } from '@/lib/supabase';
import { useRouter, Link } from 'expo-router';
import PageProvider from '@/src/components/page-provider';
import { ChevronLeft } from 'lucide-react-native';
import { goBackOrReplace } from '@/src/lib/navigation';
import { checkEmailExists, normalizeAuthEmail, sendPasswordResetEmail } from '@/src/lib/api/auth';

function isInvalidCredentialsError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('message' in error)) return false;
    const message = String(error.message).toLowerCase();
    return message.includes('invalid login credentials');
}

function isEmailNotConfirmedError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('message' in error)) return false;
    const message = String(error.message).toLowerCase();
    return message.includes('email not confirmed') || message.includes('not confirmed');
}

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [canResetPassword, setCanResetPassword] = useState(false);
    const router = useRouter();

    async function handleLogin() {
        const normalizedEmail = normalizeAuthEmail(email);

        if (!normalizedEmail) {
            setError('E-posta adresi zorunlu.');
            setSuccessMessage(null);
            setCanResetPassword(false);
            return;
        }

        if (!password) {
            setError('Şifre zorunlu.');
            setSuccessMessage(null);
            setCanResetPassword(false);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setCanResetPassword(false);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (!signInError) {
                router.replace('/home');
                return;
            }

            if (isEmailNotConfirmedError(signInError)) {
                setError('E-posta adresin henüz doğrulanmamış. Lütfen gelen kutunu kontrol et.');
                return;
            }

            if (isInvalidCredentialsError(signInError)) {
                const existingEmail = await checkEmailExists(normalizedEmail);
                if (existingEmail === false) {
                    setError('Böyle bir üyelik yok.');
                    return;
                }

                if (existingEmail === true) {
                    setError('Şifre hatalı. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.');
                    setCanResetPassword(true);
                    return;
                }

                setError('E-posta veya şifre hatalı.');
                return;
            }

            setError(signInError.message);
        } catch {
            setError('Giriş şu an yapılamıyor. Lütfen biraz sonra tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    }

    async function handleSendResetEmail() {
        const normalizedEmail = normalizeAuthEmail(email);
        if (!normalizedEmail) {
            setError('Şifre sıfırlama için e-posta adresini yaz.');
            setSuccessMessage(null);
            return;
        }

        setIsSendingReset(true);
        setError(null);
        setSuccessMessage(null);

        try {
            await sendPasswordResetEmail(normalizedEmail);
            setSuccessMessage('Şifre sıfırlama bağlantısı e-postana gönderildi.');
            setCanResetPassword(false);
        } catch (resetError) {
            setError(resetError instanceof Error ? resetError.message : 'Şifre sıfırlama e-postası gönderilemedi.');
        } finally {
            setIsSendingReset(false);
        }
    }

    return (
        <PageProvider>
            <ScrollView
                contentContainerClassName='flex flex-1 justify-center'
                className="flex-1">
                <View className="gap-6">
                    <View className='mb-4'>
                        <TouchableOpacity onPress={() => goBackOrReplace(router, "/")}>
                            <ChevronLeft size={24} />
                        </TouchableOpacity>
                    </View>
                    <RNImage
                        style={{
                            width: 48,
                            height: 48,
                        }}
                        source={require("@/assets/real assets/mainLogo.png")}
                    />
                    <View>
                        <Text className="text-2xl font-bold mb-2">
                            Welcome Back
                        </Text>
                        <Text>
                            Sign in to access your Smart Gallery collections
                        </Text>
                    </View>

                    <TextField isInvalid={!!error}>
                        <TextField.Label>Email</TextField.Label>
                        <TextField.Input
                            placeholder="example@mail.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </TextField>

                    <TextField isInvalid={!!error}>
                        <TextField.Label>Password</TextField.Label>
                        <TextField.Input
                            placeholder="••••••••"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                        {/* Error message only shows if isInvalid is true */}
                        {error && <TextField.ErrorMessage>{error}</TextField.ErrorMessage>}
                    </TextField>

                    <Button
                        variant="primary"
                        onPress={handleLogin}
                        isDisabled={loading}
                        className="mt-4"
                    >
                        <Button.Label>
                            {loading ? 'Signing in...' : 'Login'}
                        </Button.Label>
                    </Button>

                    <View className="flex-row justify-center items-center gap-2 mt-4">

                        <View className="flex-row gap-1">
                            <Text>Don&apos;t have an account?</Text>
                            <Link href="/register">
                                <Text className="text-primary font-bold">
                                    Register
                                </Text>
                            </Link>
                        </View>

                    </View>

                    {canResetPassword ? (
                        <TouchableOpacity
                            onPress={handleSendResetEmail}
                            disabled={isSendingReset}
                            className="items-center"
                        >
                            <Text className="text-primary font-bold">
                                {isSendingReset ? 'Gönderiliyor...' : 'Şifre sıfırlama bağlantısı gönder'}
                            </Text>
                        </TouchableOpacity>
                    ) : null}

                    {successMessage ? (
                        <Text className="text-success text-center mt-2">{successMessage}</Text>
                    ) : null}
                </View>
            </ScrollView>
        </PageProvider>
    );
}
