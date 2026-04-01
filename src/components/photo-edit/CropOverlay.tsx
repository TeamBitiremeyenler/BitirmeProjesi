import { useCallback, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

export type CropRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type CropTransform = {
    rect: CropRect;
    scale: number;
    offsetX: number;
    offsetY: number;
};

type DragTarget = 'pan-image' | 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom' | 'left' | 'right';

type Props = {
    crop: CropTransform;
    onCropChange: (crop: CropTransform) => void;
    containerWidth: number;
    containerHeight: number;
    aspectRatio: number | null;
};

type GestureState =
    | {
        type: 'resize' | 'pan-image';
        startCrop: CropTransform;
        target: DragTarget;
        startPageX: number;
        startPageY: number;
    }
    | {
        type: 'pinch';
        startCrop: CropTransform;
        initialDist: number;
        initialMidX: number;
        initialMidY: number;
    }
    | null;

const MIN_SIZE = 50;
const HANDLE_ZONE = 30;
const MIN_SCALE = 1;
const MAX_SCALE = 6;

function clamp(val: number, min: number, max: number) {
    return Math.min(Math.max(val, min), max);
}

function getTouchDist(touches: any[]) {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(touches: any[]) {
    return {
        x: (touches[0].pageX + touches[1].pageX) / 2,
        y: (touches[0].pageY + touches[1].pageY) / 2,
    };
}

function clampCropTransform(crop: CropTransform, containerWidth: number, containerHeight: number): CropTransform {
    const scale = clamp(crop.scale, MIN_SCALE, MAX_SCALE);
    const minOffsetX = crop.rect.x + crop.rect.width - containerWidth * scale;
    const maxOffsetX = crop.rect.x;
    const minOffsetY = crop.rect.y + crop.rect.height - containerHeight * scale;
    const maxOffsetY = crop.rect.y;

    return {
        ...crop,
        scale,
        offsetX: clamp(crop.offsetX, minOffsetX, maxOffsetX),
        offsetY: clamp(crop.offsetY, minOffsetY, maxOffsetY),
    };
}

function resizeRect(
    rect: CropRect,
    target: DragTarget,
    dx: number,
    dy: number,
    containerWidth: number,
    containerHeight: number,
    aspectRatio: number | null,
): CropRect {
    let nextRect = { ...rect };

    switch (target) {
        case 'br': {
            nextRect.width = clamp(rect.width + dx, MIN_SIZE, containerWidth - rect.x);
            nextRect.height = clamp(rect.height + dy, MIN_SIZE, containerHeight - rect.y);
            if (aspectRatio) nextRect.height = nextRect.width / aspectRatio;
            break;
        }
        case 'bl': {
            const newX = clamp(rect.x + dx, 0, rect.x + rect.width - MIN_SIZE);
            nextRect.x = newX;
            nextRect.width = rect.x + rect.width - newX;
            nextRect.height = clamp(rect.height + dy, MIN_SIZE, containerHeight - rect.y);
            if (aspectRatio) nextRect.height = nextRect.width / aspectRatio;
            break;
        }
        case 'tr': {
            nextRect.width = clamp(rect.width + dx, MIN_SIZE, containerWidth - rect.x);
            const newY = clamp(rect.y + dy, 0, rect.y + rect.height - MIN_SIZE);
            nextRect.y = newY;
            nextRect.height = rect.y + rect.height - newY;
            if (aspectRatio) nextRect.height = nextRect.width / aspectRatio;
            break;
        }
        case 'tl': {
            const newX = clamp(rect.x + dx, 0, rect.x + rect.width - MIN_SIZE);
            const newY = clamp(rect.y + dy, 0, rect.y + rect.height - MIN_SIZE);
            nextRect.x = newX;
            nextRect.y = newY;
            nextRect.width = rect.x + rect.width - newX;
            nextRect.height = rect.y + rect.height - newY;
            if (aspectRatio) nextRect.height = nextRect.width / aspectRatio;
            break;
        }
        case 'top': {
            const newY = clamp(rect.y + dy, 0, rect.y + rect.height - MIN_SIZE);
            nextRect.y = newY;
            nextRect.height = rect.y + rect.height - newY;
            if (aspectRatio) nextRect.width = nextRect.height * aspectRatio;
            break;
        }
        case 'bottom': {
            nextRect.height = clamp(rect.height + dy, MIN_SIZE, containerHeight - rect.y);
            if (aspectRatio) nextRect.width = nextRect.height * aspectRatio;
            break;
        }
        case 'left': {
            const newX = clamp(rect.x + dx, 0, rect.x + rect.width - MIN_SIZE);
            nextRect.x = newX;
            nextRect.width = rect.x + rect.width - newX;
            if (aspectRatio) nextRect.height = nextRect.width / aspectRatio;
            break;
        }
        case 'right': {
            nextRect.width = clamp(rect.width + dx, MIN_SIZE, containerWidth - rect.x);
            if (aspectRatio) nextRect.height = nextRect.width / aspectRatio;
            break;
        }
        case 'pan-image':
        default:
            break;
    }

    if (aspectRatio) {
        nextRect.width = Math.min(nextRect.width, containerWidth);
        nextRect.height = nextRect.width / aspectRatio;

        if (nextRect.height > containerHeight) {
            nextRect.height = containerHeight;
            nextRect.width = nextRect.height * aspectRatio;
        }

        nextRect.x = clamp(nextRect.x, 0, containerWidth - nextRect.width);
        nextRect.y = clamp(nextRect.y, 0, containerHeight - nextRect.height);
    }

    return nextRect;
}

export function CropOverlay({ crop, onCropChange, containerWidth, containerHeight, aspectRatio }: Props) {
    const cropRef = useRef(crop);
    cropRef.current = crop;

    const propsRef = useRef({ containerWidth, containerHeight, aspectRatio, onCropChange });
    propsRef.current = { containerWidth, containerHeight, aspectRatio, onCropChange };

    const gestureRef = useRef<GestureState>(null);
    const layoutRef = useRef({ x: 0, y: 0 });

    const detectTarget = useCallback((pageX: number, pageY: number): DragTarget => {
        const rect = cropRef.current.rect;
        const localX = pageX - layoutRef.current.x;
        const localY = pageY - layoutRef.current.y;

        const nearLeft = Math.abs(localX - rect.x) < HANDLE_ZONE;
        const nearRight = Math.abs(localX - (rect.x + rect.width)) < HANDLE_ZONE;
        const nearTop = Math.abs(localY - rect.y) < HANDLE_ZONE;
        const nearBottom = Math.abs(localY - (rect.y + rect.height)) < HANDLE_ZONE;

        if (nearTop && nearLeft) return 'tl';
        if (nearTop && nearRight) return 'tr';
        if (nearBottom && nearLeft) return 'bl';
        if (nearBottom && nearRight) return 'br';
        if (nearTop) return 'top';
        if (nearBottom) return 'bottom';
        if (nearLeft) return 'left';
        if (nearRight) return 'right';
        return 'pan-image';
    }, []);

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
            const touches = evt.nativeEvent.touches;
            if (touches.length >= 2) {
                const midpoint = getTouchMidpoint(touches);
                gestureRef.current = {
                    type: 'pinch',
                    startCrop: { ...cropRef.current, rect: { ...cropRef.current.rect } },
                    initialDist: getTouchDist(touches),
                    initialMidX: midpoint.x - layoutRef.current.x,
                    initialMidY: midpoint.y - layoutRef.current.y,
                };
                return;
            }

            const { pageX, pageY } = evt.nativeEvent;
            const target = detectTarget(pageX, pageY);
            gestureRef.current = {
                type: target === 'pan-image' ? 'pan-image' : 'resize',
                startCrop: { ...cropRef.current, rect: { ...cropRef.current.rect } },
                target,
                startPageX: pageX,
                startPageY: pageY,
            };
        },
        onPanResponderMove: (evt) => {
            const touches = evt.nativeEvent.touches;
            const currentGesture = gestureRef.current;
            const {
                containerWidth: cw,
                containerHeight: ch,
                aspectRatio: ar,
                onCropChange: onChange,
            } = propsRef.current;

            if (touches.length >= 2) {
                const midpoint = getTouchMidpoint(touches);
                const localMidX = midpoint.x - layoutRef.current.x;
                const localMidY = midpoint.y - layoutRef.current.y;

                if (!currentGesture || currentGesture.type !== 'pinch') {
                    gestureRef.current = {
                        type: 'pinch',
                        startCrop: { ...cropRef.current, rect: { ...cropRef.current.rect } },
                        initialDist: getTouchDist(touches),
                        initialMidX: localMidX,
                        initialMidY: localMidY,
                    };
                    return;
                }

                const nextScale = currentGesture.startCrop.scale * (getTouchDist(touches) / currentGesture.initialDist);
                const scaleRatio = clamp(nextScale, MIN_SCALE, MAX_SCALE) / currentGesture.startCrop.scale;
                const offsetX = localMidX - (currentGesture.initialMidX - currentGesture.startCrop.offsetX) * scaleRatio;
                const offsetY = localMidY - (currentGesture.initialMidY - currentGesture.startCrop.offsetY) * scaleRatio;

                onChange(clampCropTransform({
                    ...currentGesture.startCrop,
                    scale: clamp(nextScale, MIN_SCALE, MAX_SCALE),
                    offsetX,
                    offsetY,
                }, cw, ch));
                return;
            }

            if (!currentGesture || currentGesture.type === 'pinch') return;

            const { pageX, pageY } = evt.nativeEvent;
            const dx = pageX - currentGesture.startPageX;
            const dy = pageY - currentGesture.startPageY;

            if (currentGesture.type === 'pan-image') {
                onChange(clampCropTransform({
                    ...currentGesture.startCrop,
                    offsetX: currentGesture.startCrop.offsetX + dx,
                    offsetY: currentGesture.startCrop.offsetY + dy,
                }, cw, ch));
                return;
            }

            const nextRect = resizeRect(currentGesture.startCrop.rect, currentGesture.target, dx, dy, cw, ch, ar);
            onChange(clampCropTransform({
                ...currentGesture.startCrop,
                rect: nextRect,
            }, cw, ch));
        },
        onPanResponderRelease: () => {
            gestureRef.current = null;
        },
        onPanResponderTerminate: () => {
            gestureRef.current = null;
        },
    })).current;

    const { x, y, width, height } = crop.rect;

    return (
        <View
            style={StyleSheet.absoluteFill}
            onLayout={(e) => {
                e.target.measure((_x, _y, _w, _h, pageX, pageY) => {
                    layoutRef.current = { x: pageX, y: pageY };
                });
            }}
            {...panResponder.panHandlers}
        >
            <View style={[styles.dim, { top: 0, left: 0, right: 0, height: y }]} />
            <View style={[styles.dim, { top: y + height, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dim, { top: y, left: 0, width: x, height }]} />
            <View style={[styles.dim, { top: y, left: x + width, right: 0, height }]} />

            <View style={[styles.cropBorder, { top: y, left: x, width, height }]} pointerEvents="none">
                <View style={[styles.gridH, { top: '33.33%' }]} />
                <View style={[styles.gridH, { top: '66.66%' }]} />
                <View style={[styles.gridV, { left: '33.33%' }]} />
                <View style={[styles.gridV, { left: '66.66%' }]} />

                <View style={[styles.corner, styles.cTL]}>
                    <View style={[styles.cBar, { width: 22, height: 3, top: 0, left: 0 }]} />
                    <View style={[styles.cBar, { width: 3, height: 22, top: 0, left: 0 }]} />
                </View>
                <View style={[styles.corner, styles.cTR]}>
                    <View style={[styles.cBar, { width: 22, height: 3, top: 0, right: 0 }]} />
                    <View style={[styles.cBar, { width: 3, height: 22, top: 0, right: 0 }]} />
                </View>
                <View style={[styles.corner, styles.cBL]}>
                    <View style={[styles.cBar, { width: 22, height: 3, bottom: 0, left: 0 }]} />
                    <View style={[styles.cBar, { width: 3, height: 22, bottom: 0, left: 0 }]} />
                </View>
                <View style={[styles.corner, styles.cBR]}>
                    <View style={[styles.cBar, { width: 22, height: 3, bottom: 0, right: 0 }]} />
                    <View style={[styles.cBar, { width: 3, height: 22, bottom: 0, right: 0 }]} />
                </View>

                <View style={[styles.edgeMid, { top: -1.5, left: '50%', marginLeft: -14 }]}>
                    <View style={[styles.edgeBar, { width: 28, height: 3 }]} />
                </View>
                <View style={[styles.edgeMid, { bottom: -1.5, left: '50%', marginLeft: -14 }]}>
                    <View style={[styles.edgeBar, { width: 28, height: 3 }]} />
                </View>
                <View style={[styles.edgeMid, { left: -1.5, top: '50%', marginTop: -14 }]}>
                    <View style={[styles.edgeBar, { width: 3, height: 28 }]} />
                </View>
                <View style={[styles.edgeMid, { right: -1.5, top: '50%', marginTop: -14 }]}>
                    <View style={[styles.edgeBar, { width: 3, height: 28 }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    dim: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    cropBorder: {
        position: 'absolute',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.7)',
    },
    gridH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    gridV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    corner: {
        position: 'absolute',
        width: 22,
        height: 22,
    },
    cTL: { top: -1.5, left: -1.5 },
    cTR: { top: -1.5, right: -1.5 },
    cBL: { bottom: -1.5, left: -1.5 },
    cBR: { bottom: -1.5, right: -1.5 },
    cBar: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    edgeMid: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    edgeBar: {
        backgroundColor: '#fff',
        borderRadius: 2,
    },
});
