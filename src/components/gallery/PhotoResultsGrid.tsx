import { FlashList } from '@shopify/flash-list';
import { Image as RNImage, Pressable, StyleSheet, Text, View } from 'react-native';

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
    const formatScore = (score: number) => {
        const normalized = score > 1 ? score / 100 : score;
        return `${Math.round(Math.max(0, Math.min(1, normalized)) * 100)}%`;
    };

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
                    <RNImage
                        source={{ uri: item.uri }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                    {typeof item.score === 'number' ? (
                        <View style={styles.scoreBadge}>
                            <Text style={styles.scoreText}>{formatScore(item.score)} match</Text>
                        </View>
                    ) : null}
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
    scoreBadge: {
        position: 'absolute',
        left: 8,
        bottom: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(17,24,39,0.78)',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    scoreText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
});
