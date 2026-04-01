import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import {
    Sun, Contrast, Droplets, RotateCcw,
    Thermometer, Lightbulb, CloudSun, Moon, Focus,
} from 'lucide-react-native';

export type Adjustments = {
    brightness: number;
    contrast: number;
    saturation: number;
    exposure: number;
    warmth: number;
    tint: number;
    highlights: number;
    shadows: number;
    sharpness: number;
};

type Props = {
    adjustments: Adjustments;
    onAdjustmentsChange: (adj: Adjustments) => void;
};

type SliderConfig = {
    key: keyof Adjustments;
    label: string;
    Icon: typeof Sun;
    min: number;
    max: number;
    defaultValue: number;
    formatValue?: (raw: number, defaultVal: number) => string;
};

const percentFormat = (raw: number, defaultVal: number) => {
    const v = Math.round((raw - defaultVal) * 100);
    return v > 0 ? `+${v}` : `${v}`;
};

const zeroBasedFormat = (raw: number, _def: number) => {
    const v = Math.round(raw);
    return v > 0 ? `+${v}` : `${v}`;
};

const positiveFormat = (raw: number, _def: number) => {
    return `${Math.round(raw * 100)}`;
};

const SLIDERS: SliderConfig[] = [
    { key: 'brightness',  label: 'Brightness',  Icon: Sun,         min: 0.5, max: 1.5, defaultValue: 1,  formatValue: percentFormat },
    { key: 'exposure',    label: 'Exposure',     Icon: Lightbulb,   min: 0.5, max: 1.5, defaultValue: 1,  formatValue: percentFormat },
    { key: 'contrast',    label: 'Contrast',     Icon: Contrast,    min: 0.5, max: 2.0, defaultValue: 1,  formatValue: percentFormat },
    { key: 'highlights',  label: 'Highlights',   Icon: CloudSun,    min: 0.5, max: 1.5, defaultValue: 1,  formatValue: percentFormat },
    { key: 'shadows',     label: 'Shadows',      Icon: Moon,        min: 0.5, max: 1.5, defaultValue: 1,  formatValue: percentFormat },
    { key: 'saturation',  label: 'Saturation',   Icon: Droplets,    min: 0,   max: 2.0, defaultValue: 1,  formatValue: percentFormat },
    { key: 'warmth',      label: 'Warmth',       Icon: Thermometer, min: -100, max: 100, defaultValue: 0, formatValue: zeroBasedFormat },
    { key: 'tint',        label: 'Tint',         Icon: Droplets,    min: -100, max: 100, defaultValue: 0, formatValue: zeroBasedFormat },
    { key: 'sharpness',   label: 'Sharpness',    Icon: Focus,       min: 0,   max: 1.0, defaultValue: 0,  formatValue: positiveFormat },
];

export function AdjustmentSliders({ adjustments, onAdjustmentsChange }: Props) {
    const resetSingle = useCallback((key: keyof Adjustments, defaultVal: number) => {
        onAdjustmentsChange({ ...adjustments, [key]: defaultVal });
    }, [adjustments, onAdjustmentsChange]);

    const handleChange = useCallback((key: keyof Adjustments, val: number) => {
        onAdjustmentsChange({ ...adjustments, [key]: val });
    }, [adjustments, onAdjustmentsChange]);

    return (
        <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {SLIDERS.map(({ key, label, Icon, min, max, defaultValue, formatValue }) => {
                const value = adjustments[key];
                const isModified = Math.abs(value - defaultValue) > 0.001;
                const display = formatValue ? formatValue(value, defaultValue) : `${Math.round(value * 100)}`;

                return (
                    <View key={key} style={styles.row}>
                        <View style={styles.labelRow}>
                            <View style={[styles.iconWrap, isModified && styles.iconWrapActive]}>
                                <Icon size={13} color={isModified ? '#c7d2fe' : '#525252'} strokeWidth={2} />
                            </View>
                            <Text style={[styles.label, isModified && styles.labelModified]}>{label}</Text>
                            <Text style={[styles.value, isModified && styles.valueModified]}>
                                {display}
                            </Text>
                            {isModified && (
                                <TouchableOpacity
                                    onPress={() => resetSingle(key, defaultValue)}
                                    hitSlop={8}
                                    style={styles.resetBtn}
                                >
                                    <RotateCcw size={10} color="#525252" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={min}
                            maximumValue={max}
                            step={key === 'warmth' || key === 'tint' ? 1 : 0.01}
                            value={value}
                            onValueChange={(val) => handleChange(key, val)}
                            minimumTrackTintColor="#6366f1"
                            maximumTrackTintColor="#1a1a1a"
                            thumbTintColor="#818cf8"
                        />
                    </View>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        maxHeight: 240,
    },
    container: {
        gap: 2,
        paddingBottom: 8,
    },
    row: {
        gap: 0,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },
    iconWrap: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#141414',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapActive: {
        backgroundColor: '#312e81',
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: '#737373',
        flex: 1,
    },
    labelModified: {
        color: '#d4d4d4',
        fontWeight: '600',
    },
    value: {
        fontSize: 11,
        color: '#404040',
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
        minWidth: 32,
        textAlign: 'right',
    },
    valueModified: {
        color: '#818cf8',
    },
    resetBtn: {
        padding: 4,
    },
    slider: {
        width: '100%',
        height: 28,
    },
});
