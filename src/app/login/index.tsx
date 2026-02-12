import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { TextField, Button } from 'heroui-native';
import { supabase } from '@/lib/supabase';
import { useRouter, Link } from 'expo-router';
import PageProvider from '@/src/components/page-provider';
import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleLogin() {
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.replace('/home');
        }
    }
    return (
        <PageProvider>
            <ScrollView
                contentContainerClassName='flex flex-1 justify-center'
                className="flex-1">
                <View className="gap-6">
                    <View className='mb-4'>
                        <TouchableOpacity onPress={() => router.replace("/")}>
                            <ChevronLeft size={24} />
                        </TouchableOpacity>
                    </View>
                    <Image
                        style={{
                            width: 48,
                            height: 48,
                        }}
                        source={require("@/assets/logo-dark.png")}
                    />
                    <View>
                        <Text className="text-2xl font-bold mb-2">
                            Welcome Back
                        </Text>
                        <Text>
                            Sign in to access your Calbox collections
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
                            <Text>Don't have an account?</Text>
                            <Link href="/register">
                                <Text className="text-primary font-bold">
                                    Register
                                </Text>
                            </Link>
                        </View>

                    </View>
                </View>
            </ScrollView>
        </PageProvider>
    );
}