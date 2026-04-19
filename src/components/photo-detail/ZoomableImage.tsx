import { memo, useCallback, useEffect, useState } from 'react';
import { Image as RNImage, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

type Props = {
    uri: string;
    width: number;
    height: number;
    onZoomChange?: (zoomed: boolean) => void;
    onSingleTap?: () => void;
    onDismissRequest?: () => void;
};

function clamp(value: number, min: number, max: number) {
    'worklet';
    return Math.min(max, Math.max(min, value));
}

function ZoomableImageComponent({
    uri,
    width,
    height,
    onZoomChange,
    onSingleTap,
    onDismissRequest,
}: Props) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const zoomedShared = useSharedValue(false);
    const [isZoomed, setIsZoomed] = useState(false);

    const setZoomFlag = useCallback((zoomed: boolean) => {
        setIsZoomed((prev) => {
            if (prev !== zoomed) {
                onZoomChange?.(zoomed);
            }
            return zoomed;
        });
    }, [onZoomChange]);

    useEffect(() => {
        scale.value = 1;
        savedScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        zoomedShared.value = false;
        setZoomFlag(false);
    }, [savedScale, savedTranslateX, savedTranslateY, scale, setZoomFlag, translateX, translateY, uri, zoomedShared]);

    const updateZoomState = useCallback((zoomed: boolean) => {
        'worklet';
        if (zoomedShared.value === zoomed) return;
        zoomedShared.value = zoomed;
        runOnJS(setZoomFlag)(zoomed);
    }, [setZoomFlag, zoomedShared]);

    const animateToDefault = useCallback(() => {
        'worklet';
        scale.value = withTiming(1, { duration: 180 });
        translateX.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(0, { duration: 180 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        updateZoomState(false);
    }, [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, updateZoomState]);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((event) => {
            const nextScale = clamp(savedScale.value * event.scale, 1, 4);
            scale.value = nextScale;
            updateZoomState(nextScale > 1.01);

            const maxX = ((width * nextScale) - width) / 2;
            const maxY = ((height * nextScale) - height) / 2;
            translateX.value = clamp(savedTranslateX.value, -maxX, maxX);
            translateY.value = clamp(savedTranslateY.value, -maxY, maxY);
        })
        .onEnd(() => {
            if (scale.value <= 1.05) {
                animateToDefault();
                return;
            }

            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
            updateZoomState(true);
        });

    const panZoomedGesture = Gesture.Pan()
        .enabled(isZoomed)
        .minDistance(1)
        .minPointers(1)
        .maxPointers(1)
        .onUpdate((event) => {
            const maxX = ((width * scale.value) - width) / 2;
            const maxY = ((height * scale.value) - height) / 2;
            translateX.value = clamp(savedTranslateX.value + event.translationX, -maxX, maxX);
            translateY.value = clamp(savedTranslateY.value + event.translationY, -maxY, maxY);
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const panDismissGesture = Gesture.Pan()
        .enabled(!isZoomed)
        .activeOffsetY([-12, 12])
        .failOffsetX([-12, 12])
        .onUpdate((event) => {
            translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
            if (event.translationY > 60 && event.velocityY > 400) {
                translateY.value = 0;
                if (onDismissRequest) {
                    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                    runOnJS(onDismissRequest)();
                }
                return;
            }

            translateY.value = withTiming(0, { duration: 180 });
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(300)
        .maxDelay(260)
        .onEnd((_event, success) => {
            if (!success) return;

            runOnJS(Haptics.selectionAsync)();

            if (zoomedShared.value || scale.value > 1.05) {
                animateToDefault();
                return;
            }

            scale.value = withTiming(2.5, { duration: 180 });
            translateX.value = withTiming(0, { duration: 180 });
            translateY.value = withTiming(0, { duration: 180 });
            savedScale.value = 2.5;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            updateZoomState(true);
        });

    const singleTapGesture = Gesture.Tap()
        .numberOfTaps(1)
        .maxDuration(250)
        .onEnd((_event, success) => {
            if (!success || !onSingleTap) return;
            runOnJS(onSingleTap)();
        });

    const gesture = Gesture.Simultaneous(
        pinchGesture,
        Gesture.Race(
            panZoomedGesture,
            panDismissGesture,
            Gesture.Exclusive(doubleTapGesture, singleTapGesture),
        ),
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <View style={[styles.container, { width, height }]}>
            <GestureDetector gesture={gesture}>
                <Animated.View style={[styles.imageWrap, { width, height }, animatedStyle]}>
                    <RNImage
                        source={{ uri }}
                        style={styles.image}
                        resizeMode="contain"
                        fadeDuration={0}
                        progressiveRenderingEnabled={false}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

export const ZoomableImage = memo(ZoomableImageComponent);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    imageWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
