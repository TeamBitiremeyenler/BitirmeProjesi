import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    LinearTransition, useAnimatedStyle, withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = {
    id: number;
    label: string;
    icon: string;
}

export default function MorphingTabs() {
    const tabs: Tab[] = [
        {
            id: 1,
            label: 'Home',
            icon: 'home',
        },
        {
            id: 2,
            label: 'Search',
            icon: 'search',
        },
        {
            id: 3,
            label: 'Profile',
            icon: 'person',
        },
    ]
    const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);
    const textAnimation = useAnimatedStyle(() => {
        return {
            opacity: withTiming(activeTab.id ? 1 : 0, { duration: 200 }),
        }
    }, [activeTab.id])

    const iconAnimation = useAnimatedStyle(() => {
        return {
            opacity: withTiming(activeTab.id ? 1 : 0, { duration: 200 }),
        }
    }, [activeTab.id])

    const handleTabPress = (tab: Tab) => {
        setActiveTab(tab);
    }

    const LINEAR_TRANSITION = LinearTransition.springify().mass(0.5).damping(10).stiffness(100)

    return (
        <Animated.View
            style={styles.tabsContainer}>
            {tabs.map((tab) => {
                return (
                    <Animated.View
                        key={tab.id}
                        layout={LINEAR_TRANSITION}
                        style={[
                            styles.tab,
                            activeTab.id === tab.id && styles.activeTab,
                            activeTab.id !== tab.id && styles.inactiveTab,
                        ]}
                        onTouchStart={() => handleTabPress(tab)}>
                        <Animated.View
                            layout={LINEAR_TRANSITION}
                            style={iconAnimation}
                        >
                            <Ionicons name={tab.icon as any} size={24} color={'black'} />
                        </Animated.View>
                        {
                            activeTab.id === tab.id &&
                            <Animated.Text
                                style={[styles.tabText, textAnimation]}>
                                {tab.label}
                            </Animated.Text>
                        }
                    </Animated.View>
                )
            })}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 10
    },
    tabsContainer: {
        flexDirection: 'row',
        padding: 10,
        gap: 10,
    },
    tab: {
        justifyContent: 'center',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        overflow: 'hidden',
        borderRadius: 999,
    },
    tabText: {
        fontSize: 16,
        color: '#000',
    },
    activeTab: {
        backgroundColor: 'white',
        color: '#000',
        paddingHorizontal: 20,
    },
    inactiveTab: {
        borderRadius: 999,
        backgroundColor: 'white',
        color: '#000',
    },
}); 