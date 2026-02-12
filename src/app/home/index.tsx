import React, { useRef, useState } from "react";
import PageProvider from "@/src/components/page-provider";
import { Image } from "expo-image";
import { FlatList, Platform, Pressable, Text, TextInput } from "react-native"
import { useRouter } from "expo-router";
import { Divider, ScrollShadow, Surface, TextField } from "heroui-native";
import { Camera, Search, Send, Sparkle, UserRound, Calendar, MoreVertical, Plus, PlusIcon, Mic, AudioLines } from "lucide-react-native";
import { View, TouchableOpacity, ScrollView } from "react-native";
import PaywallBottomSheet from "@/src/components/paywall-bottom-sheet";
import { FeedbackRatingSheet } from "@/src/components/feedback-bottom";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CreateCollectionSheet } from "@/src/components/create-collection";
import { trackEvent } from "@/src/mixpanel"
import { CameraPermissionSheet } from "@/src/components/permissions/camera-permission";
import { useCameraPermissions } from "expo-camera";
import { NotificationPermissionSheet } from "@/src/components/permissions/notification-permission";
import { TrackingPermissionSheet } from "@/src/components/permissions/data-tracking-permission";
import { useMaxKeyboardHeight } from "@/src/shared/lib/hooks/use-max-keyboard-height";
import {
    KeyboardController,
    KeyboardStickyView,
    useKeyboardState,
} from "react-native-keyboard-controller";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAndroidNote } from "@/src/ready-to-use-screens/paywall/routes/use-android-note";
import { simulatePress } from "@/src/shared/lib/utils/simulate-press";
import { AddFileModal } from "@/src/ready-to-use-screens/input/components/add-file-modal";
import Home from "@/src/ready-to-use-screens/input/routes/home"
export type AnimatedFabItemProps = {
    id: string;
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    description?: string;
    onPress: () => void;
    disabled?: boolean;
    badge?: string;
}

export default function HomePage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuOptions: AnimatedFabItemProps[] = [
        {
            id: 'send',
            icon: 'paper-plane',
            label: 'Send',
            description: 'Send tokens or collectibles to any address or ENS username.',
            onPress: () => {
                console.log('Send');
                setIsMenuOpen(false);
            },
        },
        {
            id: 'swap',
            icon: 'swap-horizontal',
            label: 'Swap',
            description: 'Swap your tokens without ever leaving your wallet.',
            onPress: () => {
                console.log('Swap');
                setIsMenuOpen(false);
            },
        },
        {
            id: 'receive',
            icon: 'download',
            label: 'Receive',
            description: 'Receive Ethereum based assets through your unique address.',
            onPress: () => {
                console.log('Receive');
                setIsMenuOpen(false);
            },
        },
        {
            id: 'purchase',
            icon: 'cart',
            label: 'Purchase',
            description: 'Purchase crypto using your preferred bank account or card.',
            onPress: () => {
                console.log('Purchase');
                setIsMenuOpen(false);
            },
            disabled: true,
            badge: 'US & EU Only',
        },
    ];
    const { t } = useTranslation();
    const router = useRouter();
    const [searchText, setSearchText] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [contentSearch, setContentSearch] = useState<string>("");
    const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
    const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState<boolean>(false);
    const [isCameraPermissionOpen, setIsCameraPermissionOpen] = useState<boolean>(false);
    const [permission] = useCameraPermissions();
    const [isNotificationPermissionOpen, setIsNotificationPermissionOpen] = useState<boolean>(false);
    const [isTrackingPermissionOpen, setIsTrackingPermissionOpen] = useState<boolean>(false);

    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

    const [isModalVisible, setIsModalVisible] = useState(false);
    // Tracks if text input was focused before modal opened - used to restore focus state
    const [isTextInputFocused, setIsTextInputFocused] = useState(false);

    return (
        <Home />
        // <PageProvider>
        //     <ScrollView
        //         contentContainerClassName="flex flex-1"
        //         showsVerticalScrollIndicator={false}>
        //         <View className="flex-row justify-between items-center">
        //             <View className="flex-1 items-start justify-start">
        //                 <Image
        //                     style={{ width: 40, height: 40, borderRadius: 6 }}
        //                     contentFit="contain"
        //                     source={require("@/assets/logo-dark.png")} />
        //             </View>
        //             <View className="flex-row gap-4">
        //                 <TouchableOpacity
        //                     onPress={() => {
        //                         trackEvent("search_open");
        //                         setIsSearchVisible(!isSearchVisible)
        //                     }}
        //                     className="p-2 rounded-full bg-muted/10">
        //                     <Search size={24} color="#737272" />
        //                 </TouchableOpacity>
        //                 <TouchableOpacity onPress={() => {
        //                     trackEvent("calendar_go_home");
        //                     router.replace("/calendar")
        //                 }} className="p-2 rounded-full bg-muted/10">
        //                     <Calendar size={24} color="#737272" />
        //                 </TouchableOpacity>
        //                 <TouchableOpacity onPress={() => router.replace("/profile")} className="p-2 rounded-full bg-muted/10">
        //                     <UserRound size={24} color="#737272" />
        //                 </TouchableOpacity>
        //             </View>
        //         </View>
        //         {
        //             isSearchVisible && (
        //                 <View className="mt-4">
        //                     <TextField>
        //                         <TextField.Input
        //                             value={contentSearch}
        //                             onChangeText={setContentSearch}
        //                             placeholder="Enter your email" />
        //                     </TextField>
        //                 </View>
        //             )
        //         }
        //         <View className="flex-1 flex-row mt-6 gap-2">
        //             <TouchableOpacity
        //                 onPress={() => setIsOpen(true)}
        //                 className="flex-1 h-48 border border-divider p-2 rounded-md justify-center">
        //                 <FlatList
        //                     data={photos}
        //                     renderItem={renderPhotoItem}
        //                     keyExtractor={(item) => item.id}
        //                     numColumns={2}
        //                     scrollEnabled={false}
        //                     columnWrapperClassName="gap-1"
        //                     contentContainerClassName="flex-1 justify-center gap-2"
        //                 />
        //             </TouchableOpacity>

        //             <Surface className="flex-1 h-48 border border-divider overflow-hidden p-0 rounded-md">
        //                 <ScrollShadow
        //                     LinearGradientComponent={LinearGradient}
        //                     className="flex-1"
        //                     size={40}
        //                 >
        //                     {/* Use ScrollView here instead of FlatList */}
        //                     <ScrollView
        //                         contentContainerClassName="p-3"
        //                         showsVerticalScrollIndicator={false}
        //                     >
        //                         <TouchableOpacity onPress={() => router.replace('/photo-detail/32')}>
        //                             <Text className="text-xs text-muted-foreground mb-1">Jan 10, 2026</Text>
        //                             <Text className="text-sm font-bold mb-2">Collection Note</Text>
        //                             <Text className="text-sm leading-5 text-foreground">
        //                                 This is where your long text goes. Now that we are using a
        //                                 ScrollView instead of a FlatList, the "VirtualizedLists"
        //                                 error will disappear.
        //                                 {"\n\n"}
        //                                 Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        //                                 Sed do eiusmod tempor incididunt ut labore et dolore
        //                                 magna aliqua. Ut enim ad minim veniam, quis nostrud
        //                                 exercitation ullamco laboris nisi ut aliquip ex ea
        //                                 commodo consequat.
        //                             </Text>
        //                         </TouchableOpacity>
        //                     </ScrollView>
        //                 </ScrollShadow>
        //             </Surface>
        //         </View>

        //         <KeyboardStickyView
        //             offset={{ closed: keyboardOffsetClosed, opened: Platform.OS === "android" ? 36 : 24 }}
        //         >
        //             <View
        //                 style={{ borderCurve: "continuous" }}
        //                 className="p-3 bg-neutral-800 rounded-3xl border border-neutral-700/50"
        //             >
        //                 <TextInput
        //                     ref={textInputRef}
        //                     value={value}
        //                     onChangeText={setValue}
        //                     placeholder="Ask anything..."
        //                     placeholderTextColor="#737373"
        //                     selectionColor="#ffffff"
        //                     multiline
        //                     numberOfLines={5}
        //                     className="text-lg text-neutral-50 pt-4"
        //                 />

        //                 <View className="flex-row justify-between mt-5">
        //                     <View className="flex-row items-center gap-3">
        //                         <Pressable
        //                             onPress={() => {
        //                                 if (textInputRef.current?.isFocused()) {
        //                                     setIsTextInputFocused(true);
        //                                     setKeyboardOffsetClosed(
        //                                         -maxKeyboardHeight + insets.bottom - (Platform.OS === "android" ? 60 : 10)
        //                                     );
        //                                     setTimeout(() => KeyboardController.dismiss(), 200);
        //                                 }
        //                                 setIsModalVisible(true);
        //                             }}
        //                             className="p-2 rounded-full bg-neutral-700 items-center justify-center"
        //                         >
        //                             <Plus size={18} color="white" />
        //                         </Pressable>
        //                         {/* perplexity-bottom-sheet-backdrop-animation 🔼 */}
        //                         <Pressable
        //                             onPress={simulatePress}
        //                             className="p-2 rounded-full bg-neutral-700 items-center justify-center"
        //                         >
        //                             <Search size={18} color="white" />
        //                         </Pressable>
        //                     </View>

        //                     <View className="flex-row items-center gap-3">
        //                         <Pressable
        //                             onPress={simulatePress}
        //                             className="p-2 rounded-full bg-neutral-700 items-center justify-center"
        //                         >
        //                             <Mic size={18} color="white" />
        //                         </Pressable>
        //                         <Pressable
        //                             onPress={simulatePress}
        //                             className="p-2 rounded-full bg-cyan-400 items-center justify-center"
        //                         >
        //                             <AudioLines size={18} color="black" />
        //                         </Pressable>
        //                     </View>
        //                 </View>
        //             </View>
        //         </KeyboardStickyView>
        //         <AddFileModal isVisible={isModalVisible} setIsVisible={setIsModalVisible} />
        //         <TrackingPermissionSheet isOpen={isTrackingPermissionOpen} onOpenChange={setIsTrackingPermissionOpen} />
        //         <NotificationPermissionSheet isOpen={isNotificationPermissionOpen} onOpenChange={setIsNotificationPermissionOpen} />
        //         <CameraPermissionSheet onPermissionGranted={() => setIsCameraPermissionOpen(false)} isOpen={isCameraPermissionOpen} onOpenChange={setIsCameraPermissionOpen} />
        //         <CreateCollectionSheet isOpen={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen} />
        //         <FeedbackRatingSheet visible={isFeedbackModalVisible} onClose={() => setIsFeedbackModalVisible(false)} />
        //         <PaywallBottomSheet isOpen={isOpen} onOpenChange={setIsOpen} />
        //     </ScrollView>
        // </PageProvider>
    );
}