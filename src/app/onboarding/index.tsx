// src/app/onboarding.tsx
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { Button, TextField } from "heroui-native";
import PageProvider from "@/src/components/page-provider";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { identifyUser, trackEvent } from "@/src/mixpanel";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/src/hooks/auth-hooks";

const COLORS = {
    eclipse: "#3d342c",
    muted: "#8c7d70",
};

type OnboardingForm = {
    username: string;
};

export default function Onboarding() {
    const { session, refreshProfile } = useAuthContext();
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, formState: { errors } } = useForm<OnboardingForm>({
        defaultValues: {
            username: "",
        },
    });

    useEffect(() => {
        if (session?.user.id) {
            identifyUser(session.user.id);
        }
    }, [session?.user.id]);

    const handleFinish = async ({ username }: OnboardingForm) => {
        const userId = session?.user.id;
        const cleanedName = username.trim();

        if (!userId || !cleanedName) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    username: cleanedName,
                    primary_use_case: null,
                    initial_collection_name: null,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userId);

            if (error) throw error;

            trackEvent("onboarding_name_saved");
            await refreshProfile();
            router.replace("/paywalls/limited-paywall");
        } catch (error) {
            console.error("Error saving onboarding data:", error);
            Alert.alert(
                "Profil Kaydedilemedi",
                "İsmini kaydederken bir hata oluştu. Lütfen tekrar dene.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageProvider>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View className="flex-1 justify-center">
                    <Text className="text-3xl font-bold mb-3" style={{ color: COLORS.eclipse }}>
                        {t("onboarding.steps.name_title")}
                    </Text>
                    <Text className="text-base mb-8" style={{ color: COLORS.muted }}>
                        {t("onboarding.fields.name_description")}
                    </Text>

                    <Controller
                        control={control}
                        name="username"
                        rules={{
                            required: t("onboarding.errors.name_required"),
                            validate: (value) => Boolean(value.trim()) || t("onboarding.errors.name_required"),
                        }}
                        render={({ field: { onChange, value } }) => (
                            <TextField isRequired isInvalid={!!errors.username}>
                                <TextField.Label>{t("onboarding.fields.name_label")}</TextField.Label>
                                <TextField.Input
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder={t("onboarding.fields.name_placeholder")}
                                    autoCapitalize="words"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit(handleFinish)}
                                />
                                {errors.username?.message ? (
                                    <TextField.ErrorMessage>{errors.username.message}</TextField.ErrorMessage>
                                ) : null}
                            </TextField>
                        )}
                    />
                </View>

                <View className="pb-4">
                    <Button
                        size="lg"
                        onPress={handleSubmit(handleFinish)}
                        isDisabled={isSaving}
                    >
                        {isSaving ? "Kaydediliyor..." : t("onboarding.buttons.continue")}
                    </Button>
                </View>
            </KeyboardAvoidingView>
        </PageProvider>
    );
}
