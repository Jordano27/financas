import { Tabs } from 'expo-router';
import { colors, fontSize } from '@/constants/theme';
import { Text } from 'react-native';

function Icon({ symbol }: { symbol: string }) {
    return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function AdminLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
                tabBarActiveTintColor: '#f59e0b',
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: { fontSize: fontSize.xs },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Métricas', tabBarIcon: () => <Icon symbol="📊" /> }} />
            <Tabs.Screen name="usuarios" options={{ title: 'Usuários', tabBarIcon: () => <Icon symbol="👥" /> }} />
        </Tabs>
    );
}
