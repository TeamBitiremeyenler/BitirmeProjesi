import React from 'react';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';
import Animated, {
    LinearTransition,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface AnimatedTextProps {
    text: string;
    style?: StyleProp<TextStyle>;
    delayGap?: number;
    springConfig?: {
        damping?: number;
        stiffness?: number;
        mass?: number;
    };
    timingDuration?: number;
}

const DEFAULT_SPRING_CONFIG = {
    damping: 18,
    stiffness: 200,
    mass: 1,
};

const DEFAULT_TIMING_DURATION = 300;
const DEFAULT_DELAY_GAP = 15;

export function AnimatedText({
    text,
    style,
    delayGap = DEFAULT_DELAY_GAP,
    springConfig = DEFAULT_SPRING_CONFIG,
    timingDuration = DEFAULT_TIMING_DURATION,
}: AnimatedTextProps) {
    const chars = Array.from(text);
    const { damping, stiffness, mass } = { ...DEFAULT_SPRING_CONFIG, ...springConfig };
    const linearTransition = LinearTransition.springify()
        .damping(damping)
        .stiffness(stiffness)
        .mass(mass);

    return (
        <Animated.View
            style={styles.container}
            layout={linearTransition}
        >
            {chars.map((char, index) => (
                <AnimatedChar
                    key={`${char}-${index}-${text}`}
                    char={char}
                    style={style}
                    index={index}
                    delayGap={delayGap}
                    springConfig={{ damping, stiffness, mass }}
                    timingDuration={timingDuration}
                />
            ))}
        </Animated.View>
    );
}

interface AnimatedCharProps {
    char: string;
    style?: StyleProp<TextStyle>;
    index: number;
    delayGap: number;
    springConfig: {
        damping: number;
        stiffness: number;
        mass: number;
    };
    timingDuration: number;
}

function AnimatedChar({
    char,
    style,
    index,
    delayGap,
    springConfig,
    timingDuration,
}: AnimatedCharProps) {
    const delay = (index + 1) * delayGap;
    const { damping, stiffness, mass } = springConfig;

    const customEntering = () => {
        'worklet';
        return {
            initialValues: {
                opacity: 0,
                transform: [{ translateY: -15 }, { scale: 0.5 }],
            },
            animations: {
                opacity: withDelay(delay, withTiming(1, { duration: timingDuration })),
                transform: [
                    { translateY: withDelay(delay, withSpring(0, springConfig)) },
                    { scale: withDelay(delay, withTiming(1, { duration: timingDuration })) },
                ],
            },
        };
    };

    const customExiting = () => {
        'worklet';
        return {
            initialValues: {
                opacity: 1,
                transform: [{ translateY: 0 }, { scale: 1 }],
            },
            animations: {
                opacity: withDelay(delay, withTiming(0, { duration: timingDuration })),
                transform: [
                    { translateY: withDelay(delay, withSpring(15, springConfig)) },
                    { scale: withDelay(delay, withTiming(0.5, { duration: timingDuration })) },
                ],
            },
        };
    };

    return (
        <Animated.Text
            entering={customEntering}
            exiting={customExiting}
            layout={LinearTransition.springify()
                .damping(damping)
                .stiffness(stiffness)
                .mass(mass)}
            style={style}
        >
            {char}
        </Animated.Text>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
});

export default AnimatedText;