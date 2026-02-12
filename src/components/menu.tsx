import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AnimatedFab, { AnimatedFabItemProps } from './animated-fab';

interface TokenInfo {
    id: string;
    name: string;
    symbol: string;
    amount: string;
    value: string;
    change: string;
    icon: any;
}

const tokens: TokenInfo[] = [
    {
        id: 'aave',
        name: 'AAVE',
        symbol: 'AAVE',
        amount: '0.006714',
        value: '$1000.65',
        change: '4%',
        icon: 'https://bin.bnbstatic.com/image/admin_mgs_image_upload/20240711/51935450-ab9e-452c-a50a-550f8b977c6c.png',
    },
    {
        id: 'eth',
        name: 'ETH',
        symbol: 'ETH',
        amount: '3',
        value: '$600.65',
        change: '-3%',
        icon: 'https://bin.bnbstatic.com/image/admin_mgs_image_upload/20201110/3a8c9fe6-2a76-4ace-aa07-415d994de6f0.png',
    },
    {
        id: 'id',
        name: 'ID',
        symbol: 'ID',
        amount: '4022.243',
        value: '$500.24',
        change: '12%',
        icon: 'https://bin.bnbstatic.com/image/admin_mgs_image_upload/20240423/519bf329-f3e9-4aa0-a810-8361b795a890.png',
    },
    {
        id: 'glmr',
        name: 'GLM',
        symbol: 'GLM',
        amount: '1555',
        value: '$100.65',
        change: '20%',
        icon: 'https://bin.bnbstatic.com/image/admin_mgs_image_upload/20250205/20211a21-274e-42e5-858b-d54460e5f430.png',
    },
    {
        id: 'bnb',
        name: 'BNB',
        symbol: 'BNB',
        amount: '1',
        value: '$410.65',
        change: '1%',
        icon: 'https://bin.bnbstatic.com/image/admin_mgs_image_upload/20220218/94863af2-c980-42cf-a139-7b9f462a36c2.png',
    },
    {
        id: "btc",
        name: "BTC",
        symbol: "BTC",
        amount: "0.006714",
        value: "$1000.65",
        change: "12%",
        icon: "https://bin.bnbstatic.com/image/admin_mgs_image_upload/20201110/87496d50-2408-43e1-ad4c-78b47b448a6a.png"
    }
];


export function WalletMenu() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuOptions: AnimatedFabItemProps[] = [
        {
            id: 'send',
            icon: 'paper-plane',
            label: 'Send',
            description: 'Send tokens or collectibles to any address or ENS username.',
            onPress: () => {
                console.log('Send');
                setIsMenuOpen(false);
            },
        },
        {
            id: 'swap',
            icon: 'swap-horizontal',
            label: 'Swap',
            description: 'Swap your tokens without ever leaving your wallet.',
            onPress: () => {
                console.log('Swap');
                setIsMenuOpen(false);
            },
        },
        {
            id: 'receive',
            icon: 'download',
            label: 'Receive',
            description: 'Receive Ethereum based assets through your unique address.',
            onPress: () => {
                console.log('Receive');
                setIsMenuOpen(false);
            },
        },
        {
            id: 'purchase',
            icon: 'cart',
            label: 'Purchase',
            description: 'Purchase crypto using your preferred bank account or card.',
            onPress: () => {
                console.log('Purchase');
                setIsMenuOpen(false);
            },
            disabled: true,
            badge: 'US & EU Only',
        },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={{ uri: 'https://fwwyhbnhazkzcbarefpw.supabase.co/storage/v1/object/sign/component-covers/COMMONS/avatars/avatar_0.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81ZDBhNTNlMy1mNGQwLTRiNjgtYTY0NS1jMjM3YzhmNGQxZWYiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjb21wb25lbnQtY292ZXJzL0NPTU1PTlMvYXZhdGFycy9hdmF0YXJfMC5wbmciLCJpYXQiOjE3NTE3MTA2NDYsImV4cCI6MTc1NDMwMjY0Nn0.IYVAg3glymw8YzwsIWSYCSAhs-a_t1LdnaKSLNPzsYE' }}
                        style={styles.profileImage}
                    />
                    <Text style={styles.profileName}>Eren&apos;s</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="chatbubble-outline" size={24} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="scan-outline" size={24} color="black" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabs}>
                <Text style={styles.activeTab}>Tokens</Text>
                <Text style={styles.inactiveTab}>Collectibles</Text>
                <Text style={styles.balance}>$4390.65</Text>
            </View>

            <View style={styles.tokenList}>
                {tokens.map(token => (
                    <View key={token.id} style={styles.tokenItem}>
                        <View style={styles.tokenLeft}>
                            <Image source={{ uri: token.icon }} style={styles.tokenIcon} />
                            <View>
                                <Text style={styles.tokenName}>{token.name}</Text>
                                <Text style={styles.tokenAmount}>{token.amount} {token.symbol}</Text>
                            </View>
                        </View>
                        <View style={styles.tokenRight}>
                            <Text style={styles.tokenValue}>{token.value}</Text>
                            <Text style={[
                                styles.tokenChange,
                                { color: parseFloat(token.change) >= 0 ? '#34C759' : '#FF3B30' }
                            ]}>
                                {token.change}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
            <AnimatedFab
                isFabOpen={isMenuOpen}
                handleFabPress={() => setIsMenuOpen(!isMenuOpen)}
                onClickOutside={() => setIsMenuOpen(false)}
                fabIcon="add"
                backgroundColor="#000000"
                style={styles.menu}
                items={menuOptions}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        backgroundColor: 'white',
    },
    menu: {
        bottom: 24,
        right: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 16,
    },
    profileImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '600',
    },
    iconButton: {
        padding: 4,
    },
    tabs: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    activeTab: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 16,
    },
    inactiveTab: {
        fontSize: 16,
        color: '#8E8E93',
        marginRight: 16,
    },
    balance: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 'auto',
    },
    tokenList: {
        paddingHorizontal: 16,
    },
    tokenItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    tokenLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tokenIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#F2F2F7',
    },
    tokenName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    tokenAmount: {
        fontSize: 14,
        color: '#8E8E93',
    },
    tokenRight: {
        alignItems: 'flex-end',
    },
    tokenValue: {
        fontSize: 14,
        marginBottom: 4,
    },
    tokenChange: {
        fontSize: 14,
    },
}); 