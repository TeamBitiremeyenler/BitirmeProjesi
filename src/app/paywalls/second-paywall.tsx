import PageProvider from "@/src/components/page-provider";
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { X, Check, Bell, Star } from "lucide-react-native";
import { Button, RadioGroup, Surface } from "heroui-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/src/mixpanel";

export default function SecondPaywall() {
    const { t } = useTranslation();
    const [seeAllPlans, setSeeAllPlans] = useState<boolean>(false);
    const [selectedPlan, setSelectedPlan] = useState<string>("yearly");
    const router = useRouter();

    useEffect(() => {
        trackEvent("second_paywall_opened");
    }, []);

    const closePaywall = () => {
        trackEvent("second_paywall_closed");
        router.replace("/home");
    };

    const purchasePaywall = () => {
        trackEvent("second_paywall_purchased");
        router.replace("/home");
    };

    const toggleSeeAllPlans = () => {
        trackEvent("second_paywall_see_all_plans");
        setSeeAllPlans(!seeAllPlans);
    };

    return (
        <PageProvider>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity onPress={closePaywall}>
                        <X size={24} />
                    </TouchableOpacity>
                </View>

                <View className="mt-8 mb-10">
                    <Text className="text-4xl font-bold text-gray-900">{t('paywall_second.header.title')}</Text>
                    <Text className="text-xl text-gray-600 mt-2">{t('paywall_second.header.subtitle')}</Text>
                </View>

                <View>
                    {/* Stepper: Today - Calendar Feature  */}
                    <View className="flex-row">
                        <View className="items-center">
                            <View className="bg-accent rounded-full p-3 z-10">
                                <Check size={24} color="white" />
                            </View>
                            <View className="w-0.5 h-16 bg-muted" />
                        </View>
                        <View className="ml-4 pt-0.5">
                            <Text className="font-bold text-lg">{t('paywall_second.stepper.today.label')}</Text>
                            <Text className="text-gray-500">{t('paywall_second.stepper.today.description')}</Text>
                        </View>
                    </View>

                    {/* Stepper: Day 5 - Notifications [cite: 2] */}
                    <View className="flex-row">
                        <View className="items-center">
                            <View className="bg-muted/40 rounded-full p-3 z-10">
                                <Bell size={24} color="white" />
                            </View>
                            <View className="w-0.5 h-16 bg-gray-200" />
                        </View>
                        <View className="ml-4 pt-0.5">
                            <Text className="font-bold text-lg">{t('paywall_second.stepper.day5.label')}</Text>
                            <Text className="text-gray-500">{t('paywall_second.stepper.day5.description')}</Text>
                        </View>
                    </View>

                    {/* Stepper: Day 7 - Trial End [cite: 3] */}
                    <View className="flex-row">
                        <View className="items-center">
                            <View className="bg-muted/40 rounded-full p-3 z-10">
                                <Star size={24} color="white" />
                            </View>
                            <View className="w-0.5 h-8 bg-gray-200" />
                        </View>
                        <View className="ml-4 pt-0.5">
                            <Text className="font-bold text-lg">{t('paywall_second.stepper.day7.label')}</Text>
                            <Text className="text-gray-500">{t('paywall_second.stepper.day7.description')}</Text>
                        </View>
                    </View>

                    {seeAllPlans ? (
                        <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="gap-4">
                            <RadioGroup.Item className="bg-accent-soft px-4 py-4 rounded-lg relative" value="yearly">
                                <View className="absolute -top-4 right-12 bg-accent px-2 py-1 rounded-md z-20">
                                    <Text className="text-xs text-white font-bold">{t('paywall_second.plans.yearly.save_badge')}</Text>
                                </View>
                                <View>
                                    <RadioGroup.Label className="text-lg font-bold">{t('paywall_second.plans.yearly.name')}</RadioGroup.Label>
                                    <Text><Text className="text-lg">39.99$ / 12 {t('paywall_second.monthly')}</Text></Text>
                                    <RadioGroup.Description>
                                        {t('paywall_second.plans.yearly.billed_info')}
                                    </RadioGroup.Description>
                                </View>
                                <RadioGroup.Indicator />
                            </RadioGroup.Item>

                            <RadioGroup.Item className="px-4 py-4 rounded-lg bg-muted/10" value="monthly">
                                <View>
                                    <RadioGroup.Label className="text-lg font-bold">{t('paywall_second.plans.monthly.name')}</RadioGroup.Label>
                                    <Text><Text className="text-lg">9.99$ / 1 {t('paywall_second.monthly')}</Text></Text>
                                    <RadioGroup.Description>
                                        {t('paywall_second.plans.monthly.billed_info')}
                                    </RadioGroup.Description>
                                </View>
                                <RadioGroup.Indicator />
                            </RadioGroup.Item>
                        </RadioGroup>
                    ) : (
                        <Surface className="rounded-md p-4 bg-muted/5 border border-muted/10">
                            <View className="self-start">
                                <Text className="bg-accent px-3 py-1 text-white text-xs font-bold rounded-sm uppercase">
                                    {t('paywall_second.plans.trial_badge')}
                                </Text>
                            </View>
                            <View className="flex flex-row items-baseline mt-4">
                                <Text className="text-gray-600 font-medium">
                                    {t('paywall_second.plans.yearly.price_summary_prefix')}
                                    <Text className="text-3xl font-bold text-black">$29.99</Text>
                                    {t('paywall_second.plans.yearly.price_summary_suffix')}
                                </Text>
                            </View>
                            <View className="mt-4">
                                <Text className="text-sm text-gray-500">{t('paywall_second.plans.yearly.monthly_breakdown')}</Text>
                            </View>
                        </Surface>
                    )}
                </View>
            </ScrollView>

            <View className="mt-6">
                <Button
                    onPress={purchasePaywall}
                    size="lg" className="bg-accent h-14 rounded-xl">
                    <Button.Label className="font-bold text-white text-lg">{t('paywall_second.buttons.start_trial')}</Button.Label>
                </Button>
                <TouchableOpacity
                    onPress={toggleSeeAllPlans}
                    className="mt-4 py-2">
                    <Text className="text-center text-gray-500 font-medium">
                        {seeAllPlans ? t('paywall_second.buttons.back') : t('paywall_second.buttons.see_all')}
                    </Text>
                </TouchableOpacity>
            </View>
        </PageProvider>
    );
}