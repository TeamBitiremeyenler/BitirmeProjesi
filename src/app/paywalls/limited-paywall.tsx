import PageProvider from "@/src/components/page-provider";
import { Image } from "expo-image";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Button, Surface } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { LibraryBig, Sparkle, Tag, X } from "lucide-react-native"
import { useEffect, useState, useMemo } from "react";
import { router } from "expo-router";
import { trackEvent } from "@/src/mixpanel";

interface Feature {
    title: string;
    description: string;
    icon: React.ReactNode
}

interface User {
    id: string
    image: React.ReactNode;
}

export default function LimitedPaywall() {
    const { t } = useTranslation();
    const MASK_COLOR = "#fffaf5";

    const FEATURE_LIST: Feature[] = useMemo(() => [
        {
            title: t("paywall.features.collections_title"),
            description: t("paywall.features.collections_desc"),
            icon: <LibraryBig size={18} color="black" />
        },
        {
            title: t("paywall.features.tagging_title"),
            description: t("paywall.features.tagging_desc"),
            icon: <Sparkle size={18} color="black" />
        },
        {
            title: t("paywall.features.items_title"),
            description: t("paywall.features.items_desc"),
            icon: <Tag size={18} color="black" />
        }
    ], [t]);

    const USERS: User[] = [
        { id: "1", image: <Image style={{ width: 40, height: 40 }} source={require("@/assets/avatars/avatar1.png")} /> },
        { id: "2", image: <Image style={{ width: 40, height: 40 }} source={require("@/assets/avatars/avatar2.png")} /> },
        { id: "3", image: <Image style={{ width: 40, height: 40 }} source={require("@/assets/avatars/avatar3.png")} /> },
        { id: "4", image: <Image style={{ width: 40, height: 40 }} source={require("@/assets/avatars/avatar4.png")} /> },
    ];

    const memberCount = useMemo(() => Math.floor(Math.random() * (240 - 100 + 1)) + 100, []);

    const [secondsLeft, setSecondsLeft] = useState(63252);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = () => {
        const h = Math.floor(secondsLeft / 3600);
        const m = Math.floor((secondsLeft % 3600) / 60);
        const s = secondsLeft % 60;
        return {
            h: h.toString().padStart(2, '0'),
            m: m.toString().padStart(2, '0'),
            s: s.toString().padStart(2, '0')
        };
    };

    const { h, m, s } = formatTime();

    useEffect(() => {
        trackEvent("limited_paywall_opened");
    }, []);

    const closePaywall = () => {
        trackEvent("limited_paywall_closed");
        router.replace("/home");
    };

    const purchasePaywall = () => {
        trackEvent("limited_paywall_purchased");
        router.replace("/home");
    };

    return (
        <PageProvider>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="pb-12">
                <View className="relative w-full h-full">
                    {/* Header Image and Laurel Section */}
                    <View className="relative w-full h-[200px]">
                        <Image
                            style={{ width: "100%", height: "100%", borderRadius: 16 }}
                            source={require("@/assets/limited.jpg")}
                            contentFit="cover"
                        />
                        <TouchableOpacity
                            style={{ position: 'absolute', top: 16, left: 16, zIndex: 50 }}
                            onPress={closePaywall}
                        >
                            <X size={24} color="white" />
                        </TouchableOpacity>

                        <LinearGradient
                            colors={["transparent", MASK_COLOR]}
                            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
                        />

                        <View className="absolute bottom-2 left-0 right-0 flex-row items-center justify-center px-6">
                            <Image
                                style={{ height: 70, width: 70 }}
                                source={require("@/assets/laurel.png")}
                                contentFit="contain"
                            />

                            <View className="items-center">
                                <Text className="text-sm font-bold uppercase tracking-[3px]">
                                    {t("paywall.award_title")}
                                </Text>
                                <Text className="text-[11px] font-medium opacity-50 mt-1">
                                    {t("paywall.award_subtitle")}
                                </Text>
                            </View>

                            <Image
                                style={{ height: 70, width: 70, transform: [{ scaleX: -1 }] }}
                                source={require("@/assets/laurel.png")}
                                contentFit="contain"
                            />
                        </View>
                    </View>

                    {/* Offer and Timer Section */}
                    <View>
                        <View>
                            <Text className="text-3xl font-medium text-center">{t("paywall.one_time_offer")}</Text>
                            <Text className="text-sm font-medium opacity-50 mt-1 text-center">{t("paywall.unlock_potential")}</Text>
                        </View>
                        <View className="mt-8">
                            <Text className="text-3xl font-bold text-accent text-center">{t("paywall.discount_value")}</Text>
                            <Text className="text-xl font-medium text-muted text-center">{t("paywall.discount_subtitle")}</Text>
                        </View>

                        {/* Timer Blocks */}
                        <View className="flex flex-row gap-2 items-center justify-center my-4">
                            <View className="h-12 w-16 rounded-lg bg-muted/20 items-center flex justify-center">
                                <Text className="text-xl font-medium text-center">{h}</Text>
                            </View>
                            <View className="h-12 w-16 rounded-lg bg-muted/20 items-center flex justify-center">
                                <Text className="text-xl font-medium text-center">{m}</Text>
                            </View>
                            <View className="h-12 w-16 rounded-lg bg-muted/20 items-center flex justify-center">
                                <Text className="text-xl font-medium text-center">{s}</Text>
                            </View>
                        </View>

                        {/* Pricing Line */}
                        <View className="flex-row items-center justify-center">
                            <Text className="text-lg font-medium mr-1">{t("paywall.only_for")}</Text>
                            <Text
                                className="text-lg text-muted font-medium"
                                style={{ textDecorationLine: "line-through" }}
                            >
                                {t("paywall.price_original")}
                            </Text>
                            <Text className="text-lg font-medium ml-1">
                                {t("paywall.price_discounted")}
                            </Text>
                        </View>

                        {/* Features List */}
                        <View className="mt-4">
                            {FEATURE_LIST.map((feature, index) => (
                                <Surface variant="transparent" key={index} className="flex flex-row gap-4 items-center px-4">
                                    <View className="h-12 w-12 rounded-xl bg-muted/20 items-center flex justify-center">
                                        {feature.icon}
                                    </View>
                                    <View>
                                        <Text className="font-medium text-lg">{feature.title}</Text>
                                        <Text className="text-xs opacity-60">{feature.description}</Text>
                                    </View>
                                </Surface>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Footer / CTA */}
            <View className="border-t border-gray-200 pt-2 px-4">
                <View className="my-4">
                    <View className="flex-row items-center justify-center mb-2">
                        {USERS.map((user, index) => (
                            <View
                                key={user.id}
                                style={{
                                    marginLeft: index === 0 ? 0 : -16,
                                    zIndex: USERS.length - index,
                                    borderWidth: 3,
                                    borderColor: "#fffaf5"
                                }}
                                className="w-12 h-12 rounded-full overflow-hidden bg-gray-200"
                            >
                                {user.image}
                            </View>
                        ))}
                    </View>

                    <Text className="text-lg text-center font-medium">
                        {t("paywall.social_proof", { count: memberCount })}
                    </Text>

                    <Button
                        onPress={purchasePaywall}
                        className="mt-4" size="lg">
                        <Button.Label className="font-bold">
                            {t("paywall.cta_button")}
                        </Button.Label>
                    </Button>
                </View>
            </View>
        </PageProvider>
    );
}