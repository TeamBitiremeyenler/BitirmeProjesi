import { useCallback, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Check, Palette, Pen, Highlighter, Eraser, Type } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

export type DrawTool = 'pen' | 'marker' | 'eraser';

export type DrawPath = {
    path: any; // SkPath
    color: string;
    strokeWidth: number;
    opacity: number;
};

type Props = {
    paths: DrawPath[];
    onPathsChange: (paths: DrawPath[]) => void;
    currentColor: string;
    onColorChange: (color: string) => void;
    currentStrokeWidth: number;
    onStrokeWidthChange: (width: number) => void;
    currentOpacity: number;
    onOpacityChange: (opacity: number) => void;
    currentTool: DrawTool;
    onToolChange: (tool: DrawTool) => void;
    onTextPress?: () => void;
    isTextMode?: boolean;
};

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const COLORS = [
    '#ffffff', '#c8c8c8', '#808080', '#000000',
    '#ff3b30', '#ff6b00', '#ffcc00', '#34c759',
    '#00c7be', '#007aff', '#5856d6', '#af52de',
    '#ff2d55', '#a2845e',
];

const PALETTE_GRID = [
    ['#ff3b30', '#ff6259', '#ff8a80', '#ffb3ad', '#ffd6d3'],
    ['#ff9500', '#ffb340', '#ffd180', '#ffe8bf', '#fff4e0'],
    ['#ffcc00', '#ffd633', '#ffe066', '#ffeb99', '#fff5cc'],
    ['#34c759', '#5cd679', '#85e09a', '#aeeabc', '#d7f5de'],
    ['#007aff', '#3395ff', '#66b0ff', '#99cbff', '#cce5ff'],
    ['#5856d6', '#7978de', '#9b9ae6', '#bcbcee', '#ddddf7'],
    ['#af52de', '#bf74e5', '#cf97ec', '#dfb9f3', '#efdcf9'],
    ['#ff2d55', '#ff5777', '#ff8199', '#ffabbb', '#ffd5dd'],
];

/* ═══════════════════════════════════════════════════════════════
   DrawingControls Component
   ═══════════════════════════════════════════════════════════════ */

export function DrawingControls({
    paths, onPathsChange,
    currentColor, onColorChange,
    currentStrokeWidth, onStrokeWidthChange,
    currentOpacity, onOpacityChange,
    currentTool, onToolChange,
    onTextPress,
    isTextMode,
}: Props) {
    const [paletteOpen, setPaletteOpen] = useState(false);

    const isDark = useCallback((c: string) => {
        const hex = c.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return (r * 0.299 + g * 0.587 + b * 0.114) < 140;
    }, []);

    const handlePaletteToggle = useCallback((open: boolean) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setPaletteOpen(open);
    }, []);

    const isEraser = currentTool === 'eraser';

    return (
        <View style={s.root}>
            {/* ─── ROW 1: TOOLS + TEXT + ACTIONS ─── */}
            <View style={s.topSection}>
                <View style={s.toolPills}>
                    <TouchableOpacity onPress={() => onToolChange('pen')} style={[s.pill, !isTextMode && currentTool === 'pen' && s.pillActive]}>
                        <Pen size={14} color={!isTextMode && currentTool === 'pen' ? '#fff' : '#737373'} strokeWidth={2.2} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onToolChange('marker')} style={[s.pill, !isTextMode && currentTool === 'marker' && s.pillActive]}>
                        <Highlighter size={14} color={!isTextMode && currentTool === 'marker' ? '#fff' : '#737373'} strokeWidth={2.2} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onToolChange('eraser')} style={[s.pill, !isTextMode && currentTool === 'eraser' && s.pillActive]}>
                        <Eraser size={14} color={!isTextMode && currentTool === 'eraser' ? '#fff' : '#737373'} strokeWidth={2.2} />
                    </TouchableOpacity>
                    {onTextPress && (
                        <>
                            <View style={s.divider} />
                            <TouchableOpacity onPress={onTextPress} style={[s.pill, isTextMode && s.pillActive]}>
                                <Type size={14} color={isTextMode ? '#fff' : '#737373'} strokeWidth={2.2} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* ─── ROW 2: SIZE ─── */}
            <View style={s.sliderRow}>
                <View style={[s.dotPreview, {
                    backgroundColor: isEraser ? '#555' : currentColor,
                    width: Math.max(Math.min(currentStrokeWidth * 0.7, 16), 4),
                    height: Math.max(Math.min(currentStrokeWidth * 0.7, 16), 4),
                    borderRadius: Math.max(Math.min(currentStrokeWidth * 0.7, 16), 4) / 2,
                    opacity: isEraser ? 1 : currentOpacity,
                }]} />
                <Slider
                    style={s.slider}
                    minimumValue={1}
                    maximumValue={30}
                    step={1}
                    value={currentStrokeWidth}
                    onValueChange={onStrokeWidthChange}
                    minimumTrackTintColor="#6366f1"
                    maximumTrackTintColor="rgba(255,255,255,0.1)"
                    thumbTintColor="#c7d2fe"
                />
            </View>

            {/* ─── ROW 3: OPACITY (pen/marker only) ─── */}
            {!isEraser && (
                <View style={s.sliderRow}>
                    <View style={[s.opaDot, { backgroundColor: currentColor, opacity: currentOpacity }]} />
                    <Slider
                        style={s.slider}
                        minimumValue={0.1}
                        maximumValue={1}
                        step={0.05}
                        value={currentOpacity}
                        onValueChange={onOpacityChange}
                        minimumTrackTintColor="#6366f1"
                        maximumTrackTintColor="rgba(255,255,255,0.1)"
                        thumbTintColor="#c7d2fe"
                    />
                </View>
            )}

            {/* ─── ROW 4: COLORS (pen/marker only) ─── */}
            {!isEraser && !paletteOpen && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.colorRow}>
                    {COLORS.map((c) => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => onColorChange(c)}
                            style={[s.colorDot, { backgroundColor: c }, currentColor === c && s.colorDotActive]}
                        >
                            {currentColor === c && <Check size={11} color={isDark(c) ? '#fff' : '#000'} />}
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => handlePaletteToggle(true)} style={s.palBtn}>
                        <Palette size={13} color="#fff" />
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ─── EXPANDED PALETTE ─── */}
            {!isEraser && paletteOpen && (
                <View style={s.palCard}>
                    {PALETTE_GRID.map((row, ri) => (
                        <View key={ri} style={s.palRow}>
                            {row.map((c, ci) => (
                                <TouchableOpacity
                                    key={`${ri}-${ci}`}
                                    onPress={() => { onColorChange(c); handlePaletteToggle(false); }}
                                    style={[s.palCell, { backgroundColor: c }, currentColor === c && s.palCellActive]}
                                >
                                    {currentColor === c && <Check size={9} color={isDark(c) ? '#fff' : '#000'} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

/* ═══════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════ */

const s = StyleSheet.create({
    root: {
        gap: 5,
    },

    /* ── Top section ── */
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toolPills: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'rgba(38,38,38,0.9)',
        borderRadius: 11,
        padding: 2,
    },
    pill: {
        width: 34,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillActive: {
        backgroundColor: '#4f46e5',
    },
    divider: {
        width: 1,
        height: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 2,
    },
    /* ── Sliders ── */
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 28,
    },
    dotPreview: {
        // dynamic inline
    },
    opaDot: {
        width: 12,
        height: 12,
        borderRadius: 3,
    },
    slider: {
        flex: 1,
        height: 28,
    },

    /* ── Color row ── */
    colorRow: {
        gap: 5,
        paddingHorizontal: 1,
        alignItems: 'center',
    },
    colorDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorDotActive: {
        borderColor: '#fff',
        borderWidth: 2.5,
    },
    palBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 2,
    },

    /* ── Expanded palette ── */
    palCard: {
        backgroundColor: 'rgba(30,30,30,0.95)',
        borderRadius: 10,
        paddingVertical: 5,
        paddingHorizontal: 6,
    },
    palRow: {
        flexDirection: 'row',
        gap: 3,
        marginBottom: 3,
    },
    palCell: {
        flex: 1,
        maxWidth: 38,
        height: 22,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    palCellActive: {
        borderWidth: 2,
        borderColor: '#fff',
    },
});
