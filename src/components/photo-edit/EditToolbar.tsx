import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Crop, SlidersHorizontal, Sparkles, Pencil } from 'lucide-react-native';

export type EditTab = 'crop' | 'adjust' | 'filter' | 'draw';

type Props = {
    activeTab: EditTab;
    onTabChange: (tab: EditTab) => void;
};

const TABS: { key: EditTab; label: string; Icon: typeof Crop }[] = [
    { key: 'crop', label: 'Transform', Icon: Crop },
    { key: 'adjust', label: 'Adjust', Icon: SlidersHorizontal },
    { key: 'filter', label: 'Filters', Icon: Sparkles },
    { key: 'draw', label: 'Markup', Icon: Pencil },
];

export function EditToolbar({ activeTab, onTabChange }: Props) {
    return (
        <View style={styles.container}>
            {TABS.map(({ key, label, Icon }) => {
                const isActive = activeTab === key;
                return (
                    <TouchableOpacity
                        key={key}
                        onPress={() => onTabChange(key)}
                        style={styles.tab}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                            <Icon
                                size={20}
                                color={isActive ? '#fff' : '#6b7280'}
                                strokeWidth={isActive ? 2.2 : 1.8}
                            />
                        </View>
                        <Text style={[styles.label, isActive && styles.labelActive]}>
                            {label}
                        </Text>
                        {isActive && <View style={styles.indicator} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#151515',
        paddingTop: 6,
        paddingBottom: 4,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        gap: 3,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapActive: {
        backgroundColor: '#4f46e5',
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        color: '#6b7280',
        letterSpacing: 0.3,
    },
    labelActive: {
        color: '#c7d2fe',
        fontWeight: '700',
    },
    indicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#818cf8',
        marginTop: 1,
    },
});
