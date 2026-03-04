import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';
import type { Asset } from '@/src/lib/media-library';

interface Props {
    asset: Asset;
    size: number;
    onPress: (asset: Asset) => void;
}

export function PhotoThumbnail({ asset, size, onPress }: Props) {
    return (
        <Pressable onPress={() => onPress(asset)} style={{ width: size, height: size }}>
            <Image
                source={{ uri: asset.uri }}
                style={styles.img}
                contentFit="cover"
                recyclingKey={asset.id}
                transition={150}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    img: {
        width: '100%',
        height: '100%',
    },
});
