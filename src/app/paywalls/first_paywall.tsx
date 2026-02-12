import React, { useState, useEffect, useRef } from "react";
import PageProvider from "@/src/components/page-provider";
import { Text, View, ScrollView, Dimensions, Animated, Easing, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Star, X } from "lucide-react-native";
import { Button, Surface, Switch } from "heroui-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/src/mixpanel";

const { width } = Dimensions.get("window");

const AVATAR_MAP: Record<number, any> = {
    1: require("@/assets/avatars/avatar1.png"),
    2: require("@/assets/avatars/avatar7.png"),
    3: require("@/assets/avatars/avatar4.png"),
};

interface IReview {
    id: string;
    name: string;
    rating: number;
    comment: string;
    date: string;
}

export default function FirstPaywall() {
    const { t } = useTranslation();
    const primaryColor = "#ff6344";
    const [index, setIndex] = useState(0);
    const [isNotifEnabled, setIsNotifEnabled] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Translated Reviews Array 
    const REVIEWS: IReview[] = [
        {
            id: "1",
            name: t('paywall_first.reviews.review_1.name'),
            rating: 5,
            comment: t('paywall_first.reviews.review_1.comment'),
            date: t('paywall_first.reviews.review_1.date')
        },
        {
            id: "2",
            name: t('paywall_first.reviews.review_2.name'),
            rating: 5,
            comment: t('paywall_first.reviews.review_2.comment'),
            date: t('paywall_first.reviews.review_2.date')
        },
        {
            id: "3",
            name: t('paywall_first.reviews.review_3.name'),
            rating: 5,
            comment: t('paywall_first.reviews.review_3.comment'),
            date: t('paywall_first.reviews.review_3.date')
        },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.quad),
                }),
                Animated.timing(slideAnim, {
                    toValue: -8,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.quad),
                })
            ]).start(() => {
                setIndex((prev) => (prev + 1) % REVIEWS.length);
                slideAnim.setValue(8);

                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                        easing: Easing.in(Easing.quad),
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                        easing: Easing.in(Easing.quad),
                    })
                ]).start();
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [REVIEWS]);

    useEffect(() => {
        trackEvent("first_paywall_opened");
    }, []);

    const closePaywall = () => {
        trackEvent("first_paywall_closed");
        router.replace("/home");
    };

    const purchasePaywall = () => {
        trackEvent("first_paywall_purchased");
        router.replace("/home");
    };

    return (
        <PageProvider>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-12">
                <View className="relative pt-16 pb-12">
                    <LinearGradient
                        colors={['transparent', `${primaryColor}10`, `${primaryColor}25`, `${primaryColor}10`, 'transparent']}
                        locations={[0, 0.3, 0.5, 0.7, 1]}
                        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                    />

                    <TouchableOpacity
                        style={{ position: 'absolute', top: 16, left: 16, zIndex: 50 }}
                        onPress={closePaywall}
                    >
                        <X size={24} color="#333" />
                    </TouchableOpacity>

                    <View className="flex flex-row items-center justify-center gap-2">
                        {[1, 2, 3].map((num, i) => (
                            <View
                                key={num}
                                className={`border-2 border-white rounded-lg p-2 flex items-center justify-center bg-white/20 shadow-xl ${i === 0 ? "-rotate-12" : i === 2 ? "rotate-12" : ""}`}
                                style={{ width: 82, height: 82 }}
                            >
                                <Image style={{ width: 72, height: 72 }} source={AVATAR_MAP[num]} contentFit="cover" />
                            </View>
                        ))}
                    </View>

                    {/* Social Proof Stats */}
                    <View className="absolute -bottom-12 left-0 right-0 flex-row items-center justify-center px-6">
                        <Image style={{ height: 70, width: 70, tintColor: primaryColor }} source={require("@/assets/laurel.png")} contentFit="contain" />
                        <View className="items-center px-4">
                            <Text className="text-3xl font-extrabold" style={{ color: primaryColor }}>
                                {t('paywall_first.stats.count')}
                            </Text>
                            <Text className="text-[11px] font-bold opacity-60 mt-1 uppercase tracking-widest">
                                {t('paywall_first.stats.label')}
                            </Text>
                        </View>
                        <Image style={{ height: 70, width: 70, transform: [{ scaleX: -1 }], tintColor: primaryColor }} source={require("@/assets/laurel.png")} contentFit="contain" />
                    </View>
                </View>

                {/* Reviews Section */}
                <View className="mt-16 px-1">
                    <View className="items-center justify-center" style={{ height: 180 }}>
                        <Animated.View
                            style={{
                                width: '100%',
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }]
                            }}
                        >
                            <Surface variant="default" className="p-6">
                                <View className="flex-row justify-between items-center mb-4">
                                    <View>
                                        <Text className="font-bold text-lg leading-6">{REVIEWS[index].name}</Text>
                                        <Text className="text-xs opacity-40">{REVIEWS[index].date}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={16} fill={primaryColor} color={primaryColor} />
                                        ))}
                                    </View>
                                </View>
                                <Text className="text-sm leading-5 opacity-70 italic">
                                    "{REVIEWS[index].comment}"
                                </Text>
                            </Surface>
                        </Animated.View>
                        <View
                            className="absolute -z-10 p-6 rounded-3xl border border-black/5 bg-white/40"
                            style={{ width: '92%', height: 140, top: 25, opacity: 0.3 }}
                        />
                    </View>
                </View>

                {/* Plan Info */}
                <View className="flex flex-row items-center">
                    <Text className="text-xl font-bold">{t('paywall_first.plans.yearly')}</Text>
                    <View className="bg-accent px-2 py-1 rounded-sm ml-2">
                        <Text className="font-bold text-white">{t('paywall_first.plans.save_percent')}</Text>
                    </View>
                </View>

                <View>
                    <Text className="text-2xl font-bold mt-4">
                        <Text className="line-through text-muted text-xl">{t('paywall_first.plans.price_original')}</Text>
                        {" / "}
                        {t('paywall_first.plans.price_yearly')}
                    </Text>
                    <Text className="text-xs text-muted mt-2">{t('paywall_first.plans.price_detail')}</Text>
                </View>

                {/* Trial Switch */}
                <View className="flex flex-row items-center justify-between bg-muted/10 mt-6 px-6 py-4 rounded-md">
                    <View className="flex-1 pr-4">
                        <Text className="font-bold text-base">{t('paywall_first.trial.label')}</Text>
                    </View>

                    <Switch
                        isSelected={isNotifEnabled}
                        onSelectedChange={setIsNotifEnabled}
                        className="w-[56px] h-[32px]"
                        animation={{
                            backgroundColor: {
                                value: ['#e5e7eb', primaryColor],
                            }
                        }}
                    >
                        <Switch.Thumb
                            className="size-[24px]"
                            animation={{
                                left: {
                                    value: 4,
                                    springConfig: { damping: 20, stiffness: 200 }
                                }
                            }}
                        />
                    </Switch>
                </View>

                <Button className="mt-6" onPress={purchasePaywall}>
                    <Button.Label className="font-bold">{t('paywall_first.trial.button')}</Button.Label>
                </Button>
            </ScrollView>
        </PageProvider>
    );
}