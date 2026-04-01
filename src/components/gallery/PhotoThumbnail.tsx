import { Image as RNImage, Pressable, StyleSheet, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { getVersionedMediaUri, type Asset } from '@/src/lib/media-library';

interface Props {
    asset: Asset;
    size: number;
    onPress: (asset: Asset) => void;
    onLongPress?: (asset: Asset) => void;
    selected?: boolean;
    selectionMode?: boolean;
}

export function PhotoThumbnail({ asset, size, onPress, onLongPress, selected, selectionMode }: Props) {
    const imageRevision = asset.modificationTime ?? asset.creationTime ?? 0;
    const imageUri = getVersionedMediaUri(asset.uri, imageRevision);

    return (
        <Pressable
            onPress={() => onPress(asset)}
            onLongPress={onLongPress ? () => onLongPress(asset) : undefined}
            delayLongPress={300}
            style={{ width: size, height: size }}
        >
            <View style={styles.frame}>
                <RNImage
                    key={`${asset.id}:${imageRevision}`}
                    source={{ uri: imageUri }}
                    style={styles.img}
                    resizeMode="cover"
                    fadeDuration={0}
                    progressiveRenderingEnabled={false}
                />
                {selectionMode && (
                    <View style={[styles.overlay, selected && styles.overlaySelected]}>
                        <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
                            {selected && <CheckCircle2 size={22} color="#fff" fill="#6366f1" />}
                        </View>
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    frame: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    img: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        padding: 4,
    },
    overlaySelected: {
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkCircleSelected: {
        borderColor: '#6366f1',
        backgroundColor: 'transparent',
    },
});
