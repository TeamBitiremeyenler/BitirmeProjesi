import PageProvider from "@/src/components/page-provider";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Divider, Surface } from "heroui-native";
import { Bolt, Info, ListCheck, LogOut, Star, Trash, UserRoundPen } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/src/mixpanel";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/src/hooks/auth-hooks";
import ProfilePage from "@/src/ready-to-use-screens/input/routes/profile"

export default function Profile() {
    const { profile } = useAuthContext();
    console.log("profile geldi -> ", profile)
    const { t } = useTranslation();
    const router = useRouter();

    const handleBack = () => {
        trackEvent("go_back_from_profile");
        router.replace("/home")
    };

    const navigateToUpgrade = () => {
        trackEvent("go_to_upgrade_from_profile");
        router.push("/paywalls/first_paywall");
    };

    const deleteAccount = () => {
        trackEvent("go_to_delete_account_from_profile");
        //router.push("/delete-account");
    };

    const logout = async () => {
        trackEvent("go_to_logout_from_profile");
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error logging out:", error);
            return;
        }
        router.replace("/");
    };


    return (
        <PageProvider>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View>
                    <TouchableOpacity onPress={handleBack} hitSlop={10}>
                        <Ionicons name="chevron-back" size={24} color="#737272" />
                    </TouchableOpacity>
                </View>

                <View className="mt-4">
                    <Text className="text-3xl font-medium mt-4">{t('profile.title')}</Text>
                    <View className="mt-8">
                        <Text className="text-2xl font-medium">{profile?.username}</Text>
                        <Text className="text-md text-muted-foreground">{t('profile.status_free')}</Text>
                    </View>
                </View>

                <Divider className="my-6" />

                <Surface className="p-4 gap-6">
                    <TouchableOpacity className="flex-row items-center gap-4" activeOpacity={0.7}>
                        <UserRoundPen size={24} color="#737272" />
                        <Text className="text-lg text-muted-foreground">{t('profile.menu.edit_profile')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center gap-4" activeOpacity={0.7}>
                        <ListCheck size={24} color="#737272" />
                        <Text className="text-lg text-muted-foreground">{t('profile.menu.permissions')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row items-center gap-4" activeOpacity={0.7}>
                        <Star size={24} color="#737272" />
                        <Text className="text-lg text-muted-foreground">{t('profile.menu.rate_app')}</Text>
                    </TouchableOpacity>
                </Surface>

                <Divider className="my-6" />

                <Text className="text-2xl font-medium">{t('profile.sections.premium')}</Text>
                <Surface className="p-4 gap-6 mt-4">
                    <TouchableOpacity
                        className="flex-row items-center gap-4"
                        onPress={navigateToUpgrade}
                        activeOpacity={0.7}
                    >
                        <Bolt size={24} color="#737272" />
                        <Text className="text-lg text-muted-foreground">{t('profile.menu.upgrade')}</Text>
                    </TouchableOpacity>
                </Surface>

                <Divider className="my-6" />

                <Text className="text-2xl font-medium">{t('profile.sections.support')}</Text>
                <Surface className="p-4 gap-6 mt-4 mb-10">
                    <TouchableOpacity className="flex-row items-center gap-4" activeOpacity={0.7}>
                        <Info size={24} color="#737272" />
                        <Text className="text-lg text-muted-foreground">{t('profile.menu.contact')}</Text>
                    </TouchableOpacity>
                </Surface>

                <Divider className="my-6" />

                <Text className="text-2xl font-medium text-red-400">{t('profile.dangerZone.title')}</Text>
                <Surface className="p-4 gap-6 mt-4 mb-10">
                    <TouchableOpacity
                        onPress={deleteAccount}
                        className="flex-row items-center gap-4" activeOpacity={0.7}>
                        <Trash size={24} color="#737272" />
                        <Text className="text-lg text-muted-foreground">{t('profile.dangerZone.deleteAccount')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={logout}
                        className="flex-row items-center gap-4" activeOpacity={0.7}>
                        <LogOut size={24} color="#737272" />
                        <Text className="text-lg text-muted-foreground">{t('profile.dangerZone.logout')}</Text>
                    </TouchableOpacity>
                </Surface>
            </ScrollView>
        </PageProvider>
    );
}