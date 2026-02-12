// src/app/onboarding.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { TextField, Button, RadioGroup, Spinner } from "heroui-native";
import PageProvider from "@/src/components/page-provider";
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withTiming, FadeIn, ZoomIn, FadeInDown } from "react-native-reanimated";
import { Toolbox } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { identifyUser, trackEvent } from "@/src/mixpanel"
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useAuthContext } from "@/src/hooks/auth-hooks";

const COLORS = {
    orange: "#f58231",
    warmBg: "#faf3ed",
    eclipse: "#3d342c",
    muted: "#8c7d70",
    border: "#e8ded5",
    white: "#ffffff",
    success: "#67b370"
};

export default function Onboarding() {
    const { profile, refreshProfile } = useAuthContext();
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [customizingPhase, setCustomizingPhase] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchUser = async () => {
        const result = await supabase.auth.getUser();
        setUser(result.data.user);
    };

    useEffect(() => {
        fetchUser();
    }, []);

    useEffect(() => {
        if (user?.id) {
            identifyUser(user.id);
        }
    }, [user]);

    const STEPS = [
        { id: "name", weight: 10, title: t("onboarding.steps.name_title") },
        { id: "intent", weight: 30, title: t("onboarding.steps.intent_title") },
        { id: "collection", weight: 60, title: t("onboarding.steps.collection_title") },
    ];

    const USE_CASES = [
        { id: "work", label: t("onboarding.use_cases.work"), icon: "briefcase-outline" },
        { id: "social", label: t("onboarding.use_cases.social"), icon: "people-outline" },
        { id: "school", label: t("onboarding.use_cases.school"), icon: "book-outline" },
        { id: "reminder", label: t("onboarding.use_cases.reminder"), icon: "alarm-outline" },
    ];

    const { control, handleSubmit, formState: { errors }, watch } = useForm({
        defaultValues: {
            username: "",
            primaryUseCase: "work",
            collectionName: "",
        },
    });

    const username = watch("username");
    const selectedUseCaseId = watch("primaryUseCase");
    const collectionName = watch("collectionName");
    const selectedUseCaseLabel = USE_CASES.find(u => u.id === selectedUseCaseId)?.label.toLowerCase();

    const totalProgress = STEPS.slice(0, currentStep + 1).reduce((acc, step) => acc + step.weight, 0);
    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: withTiming(`${totalProgress}%`, { duration: 500 }),
    }));

    // Handle customization animation phases
    useEffect(() => {
        if (isCustomizing) {
            const timers = [
                setTimeout(() => setCustomizingPhase(1), 2000),
                setTimeout(() => setCustomizingPhase(2), 4000),
                setTimeout(() => {
                    setIsCustomizing(false);
                    setIsFinished(true);
                }, 5500)
            ];
            return () => timers.forEach(t => clearTimeout(t));
        }
    }, [isCustomizing]);

    const handleNext = async (data: any) => {
        onboardingStepTracking();
        if (currentStep === STEPS.length - 1) {
            // Start customization UI immediately
            setIsCustomizing(true);
            // Save data in background (WITHOUT refreshing profile yet)
            await handleFinish();
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handleFinish = async () => {
        if (!user?.id) return;

        setIsSaving(true);
        try {
            const values = control._formValues;
            const { error } = await supabase
                .from("profiles")
                .update({
                    username: values.username,
                    primary_use_case: values.primaryUseCase,
                    initial_collection_name: values.collectionName,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user.id);

            if (error) throw error;

            trackEvent("onboarding_finished");
        } catch (error) {
            console.error("Error saving onboarding data:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGetStarted = async () => {
        trackEvent("onboarding_get_started_clicked");
        await refreshProfile();
        router.replace("/paywalls/limited-paywall");
    };

    const handleBack = () => {
        backButtonTracking();
        if (currentStep > 0) setCurrentStep((prev) => prev - 1);
    };

    const backButtonTracking = () => {
        trackEvent("onboarding_back_button_clicked");
    };

    // Customization screen
    if (isCustomizing) {
        return (
            <PageProvider>
                <View className="flex-1 items-center justify-center px-6">
                    <View className="items-center justify-center h-40">
                        {customizingPhase < 2 ? (
                            <Animated.View entering={FadeIn} key="spinner">
                                <Spinner size="lg" color={COLORS.orange} />
                            </Animated.View>
                        ) : (
                            <Animated.View entering={ZoomIn} key="check">
                                <View
                                    className="p-4 rounded-full"
                                    style={{ backgroundColor: COLORS.success + '20' }}
                                >
                                    <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
                                </View>
                            </Animated.View>
                        )}
                    </View>
                    <Animated.View className="items-center mt-8">
                        {customizingPhase === 0 && (
                            <Animated.View entering={FadeInDown} key="phase0">
                                <Text className="text-2xl font-bold text-center" style={{ color: COLORS.eclipse }}>
                                    {t("onboarding.customizing.creating")}
                                </Text>
                                <Text className="text-base text-center mt-2" style={{ color: COLORS.muted }}>
                                    {t("onboarding.customizing.creating_subtitle")}
                                </Text>
                            </Animated.View>
                        )}
                        {customizingPhase === 1 && (
                            <Animated.View entering={FadeInDown} key="phase1">
                                <Text className="text-2xl font-bold text-center" style={{ color: COLORS.eclipse }}>
                                    {t("onboarding.customizing.personalizing", { useCase: selectedUseCaseLabel })}
                                </Text>
                                <Text className="text-base text-center mt-2" style={{ color: COLORS.muted }}>
                                    {t("onboarding.customizing.personalizing_subtitle", { useCase: selectedUseCaseLabel })}
                                </Text>
                            </Animated.View>
                        )}
                        {customizingPhase === 2 && (
                            <Animated.View entering={FadeInDown.delay(200)} key="phase2">
                                <Text className="text-2xl font-bold text-center" style={{ color: COLORS.success }}>
                                    {t("onboarding.customizing.ready")}
                                </Text>
                                <Text className="text-base text-center mt-2" style={{ color: COLORS.muted }}>
                                    {t("onboarding.customizing.ready_subtitle")}
                                </Text>
                            </Animated.View>
                        )}
                    </Animated.View>
                </View>
            </PageProvider>
        );
    }

    // Finished screen
    if (isFinished) {
        return (
            <PageProvider>
                <View className="flex-1 items-center justify-center px-6">
                    <Animated.Text
                        entering={FadeInDown.delay(300)}
                        className="text-3xl font-bold mt-8 text-center"
                        style={{ color: COLORS.eclipse }}
                    >
                        {t("onboarding.finished.congrats", { name: username })}
                    </Animated.Text>

                    <Animated.Text
                        entering={FadeInDown.delay(500)}
                        className="text-lg text-center mt-4"
                        style={{ color: COLORS.muted }}
                    >
                        {t("onboarding.finished.description", { collection: collectionName })}
                    </Animated.Text>

                    <View className="w-full mt-12">
                        <Animated.View entering={FadeInDown.delay(700)}>
                            <Button
                                onPress={handleGetStarted}
                                size="lg"
                            >
                                {t("onboarding.finished.button")}
                            </Button>
                        </Animated.View>
                    </View>
                </View>
            </PageProvider>
        );
    }

    const onboardingStepTracking = () => {
        if (currentStep === 0) {
            trackEvent("onboarding_step_1");
        } else if (currentStep === 1) {
            trackEvent("onboarding_step_2");
        } else if (currentStep === 2) {
            trackEvent("onboarding_step_3");
        }
    }

    // Main onboarding form
    return (
        <PageProvider>
            <View className="flex-1">
                <View className="flex-row items-center mb-4 min-h-[40px]">
                    {currentStep > 0 && (
                        <TouchableOpacity onPress={handleBack}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.eclipse} />
                        </TouchableOpacity>
                    )}
                </View>

                <View className="w-full h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
                    <Animated.View className="h-full bg-accent" style={[animatedProgressStyle]} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    {currentStep === 0 && (
                        <Animated.View entering={FadeIn}>
                            <Text className="text-2xl font-bold mb-2">{STEPS[0].title}</Text>
                            <Controller
                                control={control}
                                name="username"
                                rules={{ required: t("onboarding.errors.name_required") }}
                                render={({ field: { onChange, value } }) => (
                                    <TextField isRequired isInvalid={!!errors.username}>
                                        <TextField.Label>{t("onboarding.fields.name_label")}</TextField.Label>
                                        <TextField.Input onChangeText={onChange} value={value} placeholder={t("onboarding.fields.name_placeholder")} />
                                        <TextField.Description>{t("onboarding.fields.name_description")}</TextField.Description>
                                    </TextField>
                                )}
                            />
                        </Animated.View>
                    )}

                    {currentStep === 1 && (
                        <Animated.View entering={FadeIn}>
                            <Text className="text-2xl font-bold mb-2">
                                {t("onboarding.intent.welcome", { name: username })}
                            </Text>
                            <Text className="text-lg mb-6">
                                {t("onboarding.intent.question")}
                            </Text>
                            <Controller
                                control={control}
                                name="primaryUseCase"
                                render={({ field: { onChange, value } }) => (
                                    <RadioGroup value={value} onValueChange={onChange} className="gap-y-3">
                                        {USE_CASES.map((item) => (
                                            <RadioGroup.Item key={item.id} value={item.id}>
                                                {({ isSelected }) => (
                                                    <View
                                                        style={{
                                                            borderColor: isSelected ? COLORS.orange : COLORS.border,
                                                            backgroundColor: isSelected ? COLORS.warmBg : COLORS.white
                                                        }}
                                                        className="flex-row items-center p-4 rounded-2xl border-2 transition-all"
                                                    >
                                                        <View style={{ backgroundColor: isSelected ? COLORS.orange : "#f2e9e1" }} className="p-2 rounded-lg mr-4">
                                                            <Ionicons name={item.icon as any} size={20} color={isSelected ? "white" : COLORS.muted} />
                                                        </View>
                                                        <Text style={{ color: isSelected ? COLORS.eclipse : COLORS.muted }} className="flex-1 font-semibold">
                                                            {item.label}
                                                        </Text>
                                                    </View>
                                                )}
                                            </RadioGroup.Item>
                                        ))}
                                    </RadioGroup>
                                )}
                            />
                        </Animated.View>
                    )}

                    {currentStep === 2 && (
                        <Animated.View entering={FadeIn}>
                            <View className="mb-6 p-4 rounded-xl" style={{ backgroundColor: COLORS.warmBg }}>
                                <Text className="text-center font-bold" style={{ color: COLORS.orange }}>
                                    {t("onboarding.collection.social_proof", { useCase: selectedUseCaseLabel })}
                                </Text>
                            </View>
                            <Controller
                                control={control}
                                name="collectionName"
                                rules={{ required: t("onboarding.errors.collection_required") }}
                                render={({ field: { onChange, value } }) => (
                                    <TextField isRequired isInvalid={!!errors.collectionName}>
                                        <TextField.Label>{t("onboarding.fields.collection_label")}</TextField.Label>
                                        <TextField.Input placeholder={t("onboarding.fields.collection_placeholder")} onChangeText={onChange} value={value} />
                                        <TextField.Description>{t("onboarding.fields.collection_description")}</TextField.Description>
                                    </TextField>
                                )}
                            />
                            <View className="flex items-center justify-center mt-12 bg-white p-8 rounded-3xl border-2 border-dashed" style={{ borderColor: COLORS.border }}>
                                <Toolbox size={72} color={COLORS.orange} />
                                <Text className="text-2xl mt-4 font-bold" style={{ color: COLORS.eclipse }}>
                                    {collectionName || t("onboarding.collection.preview_default")}
                                </Text>
                            </View>
                        </Animated.View>
                    )}
                </ScrollView>

                <View className="pt-4">
                    <Button
                        size="lg"
                        onPress={handleSubmit(handleNext)}
                        isDisabled={isSaving}
                    >
                        {currentStep === STEPS.length - 1 ? t("onboarding.buttons.finish") : t("onboarding.buttons.continue")}
                    </Button>
                </View>
            </View>
        </PageProvider>
    );
}