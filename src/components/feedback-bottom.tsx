import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedText } from './animated-text';
import { Toast, useToast } from 'heroui-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Smooth spring config for gestures
const SPRING_CONFIG = {
    damping: 25,
    stiffness: 300,
    mass: 0.8,
};

const SMOOTH_SPRING = {
    damping: 20,
    stiffness: 180,
    mass: 0.6,
};

// Types
export interface FeedbackOption {
    id: string;
    label: string;
}

export interface FeedbackRatingSheetProps {
    visible: boolean;
    onClose: () => void;
    onSubmit?: (data: {
        rating: number;
        selectedOptions: string[];
        comment: string;
    }) => void;
    appIcon?: React.ReactNode;
    appName?: string;
    feedbackOptions?: FeedbackOption[];
}

// Rating gradient colors
const RATING_GRADIENT_COLORS: { [key: number]: [string, string, string] } = {
    1: ['#b91c1c', '#dc2626', '#dc2626'],
    2: ['#c2410c', '#ea580c', '#ca8a04'],
    3: ['#a16207', '#eab308', '#65a30d'],
    4: ['#a16207', '#84cc16', '#22c55e'],
    5: ['#a16207', '#65a30d', '#16a34a'],
};

export function FeedbackRatingSheet({
    visible,
    onClose,
    onSubmit,
    appIcon,
    appName,
}: FeedbackRatingSheetProps) {

    const { t } = useTranslation();
    // Question text based on rating
    const getQuestionText = (rating: number): string => {
        if (rating <= 2) return t('feedback.modal.questions.first');
        if (rating === 3) return t('feedback.modal.questions.second');
        return t('feedback.modal.questions.third');
    };

    // Default feedback options
    const DEFAULT_FEEDBACK_OPTIONS: FeedbackOption[] = [
        { id: 'ai', label: t('feedback.modal.labels.ai') },
        { id: 'notification', label: t('feedback.modal.labels.notification') },
        { id: 'calendar', label: t('feedback.modal.labels.calendar') },
        { id: 'tagging', label: t('feedback.modal.labels.tagging') },
        { id: 'organization', label: t('feedback.modal.labels.organization') },
    ];
    const insets = useSafeAreaInsets();
    const [rating, setRating] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [showFullSheet, setShowFullSheet] = useState(false);

    // Animation values
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const opacity = useSharedValue(0);
    const sheetHeight = useSharedValue(280);
    const keyboardHeight = useSharedValue(0);
    const ratingSharedValue = useSharedValue(0);
    const gradientWidth = useSharedValue(0);
    const star1Scale = useSharedValue(0.8);
    const star2Scale = useSharedValue(0.8);
    const star3Scale = useSharedValue(0.8);
    const star4Scale = useSharedValue(0.8);
    const star5Scale = useSharedValue(0.8);

    // Keyboard handler
    useKeyboardHandler({
        onMove: (e) => {
            'worklet';
            keyboardHeight.value = e.height;
        },
        onEnd: (e) => {
            'worklet';
            keyboardHeight.value = e.height;
        },
    }, []);

    // Gesture context
    const context = useSharedValue({ y: 0 });

    // Calculate slider position
    const sliderWidth = SCREEN_WIDTH - 80;
    const starWidth = sliderWidth / 5;

    useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 250 });
            translateY.value = withSpring(0, SPRING_CONFIG);
            sheetHeight.value = 280;
            setShowFullSheet(false);
            setRating(0);
            setSelectedOptions([]);
            setComment('');
            ratingSharedValue.value = 0;
            gradientWidth.value = 0;
            star1Scale.value = 0.8;
            star2Scale.value = 0.8;
            star3Scale.value = 0.8;
            star4Scale.value = 0.8;
            star5Scale.value = 0.8;
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            translateY.value = withSpring(SCREEN_HEIGHT, { ...SPRING_CONFIG, stiffness: 250 });
        }
    }, [visible]);

    useEffect(() => {
        if (rating > 0 && !showFullSheet) {
            setShowFullSheet(true);
            sheetHeight.value = withSpring(520, SMOOTH_SPRING);
        }
    }, [rating]);

    const safeClose = () => {
        onClose();
    };

    const updateRating = (newRating: number) => {
        if (newRating !== rating) {
            setRating(newRating);
        }
    };

    // Sheet pan gesture - smoother with velocity consideration
    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            'worklet';
            const newTranslateY = context.value.y + event.translationY;
            // Add resistance when pulling down
            if (newTranslateY >= 0) {
                translateY.value = newTranslateY;
            } else {
                // Rubber band effect when pulling up
                translateY.value = newTranslateY * 0.3;
            }
        })
        .onEnd((event) => {
            'worklet';
            const velocity = event.velocityY;
            const shouldClose = velocity > 500 || (translateY.value > 100 && velocity > -200);

            if (shouldClose) {
                translateY.value = withSpring(SCREEN_HEIGHT, {
                    ...SPRING_CONFIG,
                    velocity: velocity,
                });
                opacity.value = withTiming(0, { duration: 200 });
                runOnJS(safeClose)();
            } else {
                translateY.value = withSpring(0, {
                    ...SPRING_CONFIG,
                    velocity: velocity,
                });
            }
        });

    // Update star scales based on rating
    const updateStarScales = (newRating: number) => {
        'worklet';
        star1Scale.value = withSpring(newRating >= 1 ? 1 : 0.8, SMOOTH_SPRING);
        star2Scale.value = withSpring(newRating >= 2 ? 1 : 0.8, SMOOTH_SPRING);
        star3Scale.value = withSpring(newRating >= 3 ? 1 : 0.8, SMOOTH_SPRING);
        star4Scale.value = withSpring(newRating >= 4 ? 1 : 0.8, SMOOTH_SPRING);
        star5Scale.value = withSpring(newRating >= 5 ? 1 : 0.8, SMOOTH_SPRING);
    };

    // Star slider gesture - smoother updates
    const starSliderGesture = Gesture.Pan()
        .onBegin((event) => {
            'worklet';
            const x = event.x;
            const newRating = Math.max(1, Math.min(5, Math.ceil(x / starWidth)));
            ratingSharedValue.value = newRating;
            gradientWidth.value = withSpring((newRating / 5) * 100, SMOOTH_SPRING);
            updateStarScales(newRating);
            runOnJS(updateRating)(newRating);
        })
        .onUpdate((event) => {
            'worklet';
            const x = event.x;
            const newRating = Math.max(1, Math.min(5, Math.ceil(x / starWidth)));
            if (newRating !== ratingSharedValue.value) {
                ratingSharedValue.value = newRating;
                gradientWidth.value = withSpring((newRating / 5) * 100, SMOOTH_SPRING);
                updateStarScales(newRating);
                runOnJS(updateRating)(newRating);
            }
        });

    const handleStarPress = (star: number) => {
        setRating(star);
        ratingSharedValue.value = star;
        gradientWidth.value = withSpring((star / 5) * 100, SMOOTH_SPRING);
        updateStarScales(star);
    };

    const toggleOption = (optionId: string) => {
        setSelectedOptions((prev) =>
            prev.includes(optionId)
                ? prev.filter((id) => id !== optionId)
                : [...prev, optionId]
        );
    };

    const { toast } = useToast();
    const handleSubmit = () => {
        onSubmit?.({
            rating,
            selectedOptions,
            comment,
        });
        toast.show({
            variant: 'success',
            label: t('feedback.toast.title'),
            description: t('feedback.toast.description'),
            icon: <Check size={24} color="#22bb33" />,

        });
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    // Animated styles
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const sheetStyle = useAnimatedStyle(() => {
        const scale = interpolate(
            translateY.value,
            [0, SCREEN_HEIGHT],
            [1, 0.95]
        );
        return {
            transform: [
                { translateY: translateY.value - keyboardHeight.value },
                { scale },
            ],
            height: sheetHeight.value,
        };
    });

    const gradientAnimatedStyle = useAnimatedStyle(() => ({
        width: `${gradientWidth.value}%`,
        opacity: gradientWidth.value > 0 ? 1 : 0,
    }));

    // Create animated styles for each star
    const star1Style = useAnimatedStyle(() => ({
        transform: [{ scale: star1Scale.value }],
    }));
    const star2Style = useAnimatedStyle(() => ({
        transform: [{ scale: star2Scale.value }],
    }));
    const star3Style = useAnimatedStyle(() => ({
        transform: [{ scale: star3Scale.value }],
    }));
    const star4Style = useAnimatedStyle(() => ({
        transform: [{ scale: star4Scale.value }],
    }));
    const star5Style = useAnimatedStyle(() => ({
        transform: [{ scale: star5Scale.value }],
    }));

    const getGradientColors = (): [string, string, string] => {
        if (rating === 0) return ['transparent', 'transparent', 'transparent'];
        return RATING_GRADIENT_COLORS[rating] || RATING_GRADIENT_COLORS[5];
    };

    const questionText = useMemo(() => getQuestionText(rating), [rating]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <BlurView intensity={40} style={styles.blurView}>
                    <Pressable style={styles.backdropTouchable} onPress={onClose} />
                </BlurView>
            </Animated.View>

            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        styles.sheet,
                        { marginBottom: insets.bottom + 16 },
                        sheetStyle,
                    ]}
                >
                    <View style={styles.handle} />

                    <View style={styles.appIconsContainer}>
                        {appIcon || (
                            <View style={styles.defaultAppIcon}>
                                <Ionicons name="chatbubble" size={24} color="#fff" />
                            </View>
                        )}
                        {appName && (
                            <View style={styles.appNameBadge}>
                                <Ionicons name="planet-outline" size={18} color="#fff" />
                            </View>
                        )}
                    </View>

                    <Text style={styles.title}>Rate your experience</Text>

                    <GestureDetector gesture={starSliderGesture}>
                        <View style={styles.starSliderContainer}>
                            <Animated.View style={[styles.sliderGradientContainer, gradientAnimatedStyle]}>
                                <LinearGradient
                                    colors={getGradientColors()}
                                    locations={[0, 0.5, 1]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.sliderGradient}
                                />
                            </Animated.View>

                            <View style={styles.starsContainer}>
                                <Pressable
                                    style={styles.starButton}
                                    onPress={() => handleStarPress(1)}
                                >
                                    <Animated.View style={star1Style}>
                                        <Ionicons name="star" size={28} color="#fff" />
                                    </Animated.View>
                                </Pressable>
                                <Pressable
                                    style={styles.starButton}
                                    onPress={() => handleStarPress(2)}
                                >
                                    <Animated.View style={star2Style}>
                                        <Ionicons name="star" size={28} color="#fff" />
                                    </Animated.View>
                                </Pressable>
                                <Pressable
                                    style={styles.starButton}
                                    onPress={() => handleStarPress(3)}
                                >
                                    <Animated.View style={star3Style}>
                                        <Ionicons name="star" size={28} color="#fff" />
                                    </Animated.View>
                                </Pressable>
                                <Pressable
                                    style={styles.starButton}
                                    onPress={() => handleStarPress(4)}
                                >
                                    <Animated.View style={star4Style}>
                                        <Ionicons name="star" size={28} color="#fff" />
                                    </Animated.View>
                                </Pressable>
                                <Pressable
                                    style={styles.starButton}
                                    onPress={() => handleStarPress(5)}
                                >
                                    <Animated.View style={star5Style}>
                                        <Ionicons name="star" size={28} color="#fff" />
                                    </Animated.View>
                                </Pressable>
                            </View>
                        </View>
                    </GestureDetector>

                    {showFullSheet && (
                        <Animated.View style={styles.expandedContent}>
                            <View style={styles.sectionTitleContainer}>
                                <AnimatedText
                                    text={questionText}
                                    style={styles.sectionTitle}
                                />
                            </View>

                            <View style={styles.chipsContainer}>
                                {DEFAULT_FEEDBACK_OPTIONS.map((option) => (
                                    <Pressable
                                        key={option.id}
                                        style={[
                                            styles.chip,
                                            selectedOptions.includes(option.id) && styles.chipSelected,
                                        ]}
                                        onPress={() => toggleOption(option.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                selectedOptions.includes(option.id) && styles.chipTextSelected,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <View style={styles.commentContainer}>
                                <Ionicons
                                    name="create-outline"
                                    size={20}
                                    color="#666"
                                    style={styles.commentIcon}
                                />
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder={t('feedback.modal.input.placeholder')}
                                    placeholderTextColor="#666"
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                />
                            </View>
                        </Animated.View>
                    )}

                    <View style={styles.buttonContainer}>
                        {showFullSheet ? (
                            <Pressable style={styles.submitButton} onPress={handleSubmit}>
                                <Text style={styles.submitButtonText}>{t('feedback.modal.buttons.submit')}</Text>
                            </Pressable>
                        ) : (
                            <Pressable style={styles.cancelButton} onPress={handleCancel}>
                                <Text style={styles.cancelButtonText}>{t('feedback.modal.buttons.cancel')}</Text>
                            </Pressable>
                        )}
                    </View>
                </Animated.View>
            </GestureDetector>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    blurView: {
        flex: 1,
    },
    backdropTouchable: {
        flex: 1,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 16,
        right: 16,
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 20,
        overflow: 'hidden',
    },
    handle: {
        width: 36,
        height: 5,
        backgroundColor: '#444',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 16,
    },
    appIconsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
    },
    defaultAppIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    appNameBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 20,
    },
    starSliderContainer: {
        height: 56,
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    sliderGradientContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        overflow: 'hidden',
        borderRadius: 16,
    },
    sliderGradient: {
        width: SCREEN_WIDTH,
        height: '100%',
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: '100%',
        paddingHorizontal: 8,
    },
    starButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    expandedContent: {
        marginTop: 24,
    },
    sectionTitleContainer: {
        minHeight: 28,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#333',
        borderRadius: 20,
    },
    chipSelected: {
        backgroundColor: '#555',
    },
    chipText: {
        fontSize: 14,
        color: '#aaa',
        fontWeight: '500',
    },
    chipTextSelected: {
        color: '#fff',
    },
    commentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
    },
    commentIcon: {
        marginRight: 12,
    },
    commentInput: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
    },
    buttonContainer: {
        marginTop: 'auto',
    },
    submitButton: {
        backgroundColor: '#fff',
        borderRadius: 28,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    cancelButton: {
        backgroundColor: '#333',
        borderRadius: 28,
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },
});

export default FeedbackRatingSheet;
