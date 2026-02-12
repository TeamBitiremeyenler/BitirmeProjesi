import { BottomSheet, Button, RadioGroup } from "heroui-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { trackEvent } from "../mixpanel";
import { useTranslation } from "react-i18next"; // Added

interface IPaywallBottomSheet {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function PaywallBottomSheet({ isOpen, onOpenChange }: IPaywallBottomSheet) {
    const { t } = useTranslation(); // Added
    const [plan, setPlan] = useState('yearly');

    useEffect(() => {
        if (isOpen) {
            trackEvent("bottom_paywall_opened");
        }
    }, [isOpen]);

    const purchasePaywall = () => {
        trackEvent("bottom_paywall_purchased");
        onOpenChange(false);
    };

    return (
        <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
            <BottomSheet.Portal>
                <BottomSheet.Overlay />
                <BottomSheet.Content className="pb-10">
                    <BottomSheet.Title className="text-center text-2xl font-mono">
                        {t("bottomPaywall.title")}
                    </BottomSheet.Title>
                    <BottomSheet.Description className="text-center">
                        {t("bottomPaywall.description")}
                    </BottomSheet.Description>

                    <RadioGroup value={plan} onValueChange={setPlan} className="gap-4 my-8">
                        {/* Monthly Item */}
                        <RadioGroup.Item
                            value="monthly"
                            className={`p-4 rounded-2xl border ${plan === 'monthly' ? 'border-[#ff6344]' : 'border-black/5'}`}
                        >
                            <View className="flex-1">
                                <RadioGroup.Label className="font-bold text-base">
                                    {t("bottomPaywall.monthly.label")}
                                </RadioGroup.Label>
                                <RadioGroup.Description className="text-xs opacity-50">
                                    {t("bottomPaywall.monthly.description")}
                                </RadioGroup.Description>
                            </View>
                            <View className="items-end mr-4">
                                <Text className="font-bold text-lg">{t("bottomPaywall.monthly.price")}</Text>
                                <Text className="text-[10px] opacity-40">{t("bottomPaywall.monthly.period")}</Text>
                            </View>
                            <RadioGroup.Indicator />
                        </RadioGroup.Item>

                        {/* Yearly Item */}
                        <RadioGroup.Item
                            value="yearly"
                            className={`p-4 rounded-2xl border ${plan === 'yearly' ? 'border-[#ff6344]' : 'border-black/5'}`}
                        >
                            <View className="absolute -top-2 left-8 bg-accent px-2 py-0.5 rounded-full z-10">
                                <Text className="text-white font-bold text-[10px]">
                                    {t("bottomPaywall.yearly.badge")}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <RadioGroup.Label className="font-bold text-base">
                                    {t("bottomPaywall.yearly.label")}
                                </RadioGroup.Label>
                                <RadioGroup.Description className="text-xs opacity-50">
                                    {t("bottomPaywall.yearly.description")}
                                </RadioGroup.Description>
                            </View>
                            <View className="items-end mr-4">
                                <Text className="font-bold text-lg">{t("bottomPaywall.yearly.price")}</Text>
                                <Text className="text-[10px] opacity-40">{t("bottomPaywall.yearly.period")}</Text>
                            </View>
                            <RadioGroup.Indicator />
                        </RadioGroup.Item>
                    </RadioGroup>

                    {/* Action Button */}
                    <View className="gap-2">
                        <Button onPress={purchasePaywall}>
                            <Button.Label>
                                {t("bottomPaywall.cta")}
                            </Button.Label>
                        </Button>
                    </View>
                </BottomSheet.Content>
            </BottomSheet.Portal>
        </BottomSheet>
    );
}