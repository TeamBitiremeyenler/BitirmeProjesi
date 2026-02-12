import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, Text, TouchableWithoutFeedback, View, ViewStyle } from 'react-native';
import Animated, { FadeInRight, LinearTransition } from 'react-native-reanimated';

export type AnimatedFabItemProps = {
    id: string;
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    description?: string;
    onPress: () => void;
    disabled?: boolean;
    badge?: string;
}

type AnimatedFabProps = {
    isFabOpen: boolean;
    handleFabPress: () => void;
    children?: React.ReactNode;
    fabIcon?: keyof typeof Ionicons.glyphMap;
    style?: ViewStyle;
    minContentHeight?: number;
    backgroundColor?: string;
    items?: AnimatedFabItemProps[];
    onClickOutside?: () => void;
}

const { width, height } = Dimensions.get('window');


const DYNAMIC_SIZE = width - 32;
const FAB_SIZE = 50;
const RADIUS = FAB_SIZE / 2;
const CONTAINER_RADIUS = 12;
const PADDING_ITEM_CONTAINER = 12;
const INNER_ITEM_RADIUS = CONTAINER_RADIUS * ((DYNAMIC_SIZE - 2 * PADDING_ITEM_CONTAINER) / DYNAMIC_SIZE);
const GAP_ITEM_CONTAINER = 10;
const SPRING_CONFIG = {
    damping: 15,
    stiffness: 150,
    mass: 0.5
}
const LINEAR_TRANSITION = LinearTransition.springify().damping(SPRING_CONFIG.damping).stiffness(SPRING_CONFIG.stiffness).mass(SPRING_CONFIG.mass);

const AnimatedFab = ({
    isFabOpen,
    handleFabPress,
    children,
    fabIcon = "add",
    style,
    minContentHeight = 300,
    backgroundColor = '#1D9BF0',
    items = [],
    onClickOutside,
}: AnimatedFabProps) => {
    const [, setContentHeight] = useState(minContentHeight);
    const fabRef = useRef<View>(null);

    const onContentLayout = (event: LayoutChangeEvent) => {
        const height = event.nativeEvent.layout.height;
        setContentHeight(Math.max(height + PADDING_ITEM_CONTAINER * 2, minContentHeight)); // Add padding
    };

    const handleClickOutside = () => {
        if (isFabOpen && onClickOutside) {
            onClickOutside();
        }
    };

    const handleFabContentPress = (event: any) => {
        // Prevent event propagation to avoid closing when clicking on content
        event.stopPropagation();
    };

    const renderDefaultItem = (item: AnimatedFabItemProps) => (
        <View
            key={item.id}
            style={[styles.menuOption, item.disabled && styles.menuOptionDisabled]}>
            <View style={styles.menuOptionIcon}>
                <Ionicons name={item.icon} size={24} color="white" />
            </View>
            <View style={styles.menuOptionContent}>
                <View style={styles.menuOptionHeader}>
                    <Text style={styles.menuOptionTitle}>{item.label}</Text>
                    {item.disabled && (
                        <View style={styles.menuOptionBadge}>
                            <Text style={styles.menuOptionBadgeText}>{item.badge}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.menuOptionDescription}>{item.description}</Text>
            </View>
        </View>
    );

    const renderContent = () => {
        if (children) {
            return (
                <TouchableWithoutFeedback onPress={handleFabContentPress}>
                    <Animated.View
                        entering={FadeInRight}
                        style={styles.fabContent}
                        onLayout={onContentLayout}
                    >
                        {children}
                    </Animated.View>
                </TouchableWithoutFeedback>
            );
        }

        if (items.length > 0) {
            return (
                <TouchableWithoutFeedback onPress={handleFabContentPress}>
                    <Animated.View
                        entering={FadeInRight}
                        style={styles.fabContent}
                        onLayout={onContentLayout}
                    >
                        {items.map((item) => renderDefaultItem(item))}
                    </Animated.View>
                </TouchableWithoutFeedback>
            );
        }

        return <Ionicons name={fabIcon} size={24} color="white" />;
    };

    return (
        <>
            {isFabOpen && (
                <TouchableWithoutFeedback onPress={handleClickOutside}>
                    <View style={[styles.overlay, { width, height }]} />
                </TouchableWithoutFeedback>
            )}
            <Animated.View
                ref={fabRef}
                layout={LINEAR_TRANSITION}
                style={[
                    styles.fab,
                    {
                        width: isFabOpen ? DYNAMIC_SIZE : FAB_SIZE,
                        height: isFabOpen ? "auto" : FAB_SIZE,
                        backgroundColor,
                        borderRadius: 8,
                    },
                    style
                ]}
            >
                {isFabOpen ? (
                    renderContent()
                ) : (
                    <TouchableWithoutFeedback onPress={handleFabPress}>
                        <View style={styles.fabIcon}>
                            <Ionicons name={fabIcon} size={24} color="white" />
                        </View>
                    </TouchableWithoutFeedback>
                )}
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        overflow: "hidden",
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabIcon: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: "hidden"
    },
    fabContent: {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        overflow: "hidden",
        borderRadius: CONTAINER_RADIUS,
        padding: PADDING_ITEM_CONTAINER,
        gap: GAP_ITEM_CONTAINER
    },

    menuOption: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: PADDING_ITEM_CONTAINER,
        borderRadius: INNER_ITEM_RADIUS,
        backgroundColor: '#1A1A1A',
    },
    menuOptionDisabled: {
        opacity: 0.9,
    },
    menuOptionIcon: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuOptionContent: {
        flex: 1,
    },
    menuOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    menuOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginRight: 8,
    },
    menuOptionBadge: {
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    menuOptionBadgeText: {
        fontSize: 12,
        color: '#8E8E93',
    },
    menuOptionDescription: {
        fontSize: 14,
        color: '#8E8E93',
        lineHeight: 18,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 999,
        backgroundColor: 'transparent',
    },
});

export default AnimatedFab;