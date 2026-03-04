import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, UserRound, Search, LayoutGrid } from 'lucide-react-native';

import { GalleryGrid } from '@/src/components/gallery/GalleryGrid';

export default function HomePage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Photos</Text>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Search size={22} color="#737272" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/albums' as any)} style={styles.iconBtn}>
                        <LayoutGrid size={22} color="#737272" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.replace('/calendar')} style={styles.iconBtn}>
                        <Calendar size={22} color="#737272" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.replace('/profile')} style={styles.iconBtn}>
                        <UserRound size={22} color="#737272" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.gallery}>
                <GalleryGrid />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    actions: { flexDirection: 'row', gap: 8 },
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
    gallery: { flex: 1 },
});