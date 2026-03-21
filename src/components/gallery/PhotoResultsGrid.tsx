import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

export type SearchResultPhoto = {
    id: string;
    uri: string;
    filename?: string | null;
    creationTime?: number;
    score?: number;
};

type Props = {
    photos: SearchResultPhoto[];
    onPress: (photo: SearchResultPhoto) => void;
};

const COLUMNS = 3;
const GAP = 2;

export function PhotoResultsGrid({ photos, onPress }: Props) {
    return (
        <FlashList
            data={photos}
            numColumns={COLUMNS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
                <Pressable
                    onPress={() => onPress(item)}
                    style={[
                        styles.card,
                        { marginRight: (index + 1) % COLUMNS === 0 ? 0 : GAP },
                    ]}
                >
                    <Image
                        source={{ uri: item.uri }}
                        style={styles.image}
                        contentFit="cover"
                        transition={120}
                    />
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 24,
    },
    card: {
        flex: 1,
        aspectRatio: 1,
        marginBottom: GAP,
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f2f2f2',
    },
});
