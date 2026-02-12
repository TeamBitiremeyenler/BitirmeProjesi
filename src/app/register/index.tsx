import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { TextField, Button, FormField, Checkbox } from 'heroui-native';
import { supabase } from '@/lib/supabase';
import { useRouter, Link } from 'expo-router';
import PageProvider from '@/src/components/page-provider';
import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function handleRegister() {
        if (!agree) {
            setError("You must agree to the terms and conditions.");
            return;
        }

        setLoading(true);
        setError(null);

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
        } else {
            // Usually redirects to a 'verify email' state or home if auto-confirm is on
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
                        <TouchableOpacity onPress={() => router.back()}>
                            <ChevronLeft size={24} />
                        </TouchableOpacity>
                    </View>
                    <Image
                        style={{ width: 48, height: 48 }}
                        source={require("@/assets/logo-dark.png")}
                    />
                    <View>
                        <Text className="text-2xl font-bold mb-2">
                            Create Account
                        </Text>
                        <Text>
                            Join Calbox to start scanning calendars from your photos
                        </Text>
                    </View>

                    <TextField isRequired isInvalid={!!error && error.includes('email')}>
                        <TextField.Label>Email</TextField.Label>
                        <TextField.Input
                            placeholder="example@mail.com"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </TextField>

                    <TextField isRequired isInvalid={!!error && error.includes('password')}>
                        <TextField.Label>Password</TextField.Label>
                        <TextField.Input
                            placeholder="Min. 6 characters"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </TextField>

                    <FormField
                        className='p-4 bg-foreground/5 rounded-md'
                        isSelected={agree}
                        onSelectedChange={setAgree}
                        isInvalid={!!error && !agree}
                    >
                        <View className="flex-row items-center gap-2">
                            <View className="flex-1">
                                <FormField.Label>I agree to the terms</FormField.Label>
                                <FormField.Description>
                                    By checking this, you agree to the Calbox Terms of Service.
                                </FormField.Description>
                            </View>
                            <FormField.Indicator variant="checkbox">
                                <Checkbox />
                            </FormField.Indicator>
                        </View>
                        {error && !agree && <FormField.ErrorMessage>{error}</FormField.ErrorMessage>}
                    </FormField>

                    <Button
                        variant="primary"
                        onPress={handleRegister}
                        isDisabled={loading}
                        className="mt-2"
                    >
                        <Button.Label>
                            {loading ? 'Creating account...' : 'Register'}
                        </Button.Label>
                    </Button>

                    <View className="flex-row justify-center items-center gap-2 mt-4">
                        <View className="flex-row gap-1">
                            <Text>Already have an account?</Text>
                            <Link href="/">
                                <Text className="text-primary font-bold">
                                    Login
                                </Text>
                            </Link>
                        </View>
                    </View>

                    {/* Generic Error Message if it's not field-specific */}
                    {error && agree && (
                        <Text className="text-danger text-center mt-2">{error}</Text>
                    )}
                </View>
            </ScrollView>
        </PageProvider>
    );
}