import { Tabs } from 'expo-router';
import { colors, fontSize } from '@/constants/theme';
import { Text } from 'react-native';

function Icon({ symbol }: { symbol: string }) {
    return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function AppLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: { fontSize: fontSize.xs },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: () => <Icon symbol="🏠" /> }} />
            <Tabs.Screen name="ganhos" options={{ title: 'Ganhos', tabBarIcon: () => <Icon symbol="📈" /> }} />
            <Tabs.Screen name="gastos" options={{ title: 'Gastos', tabBarIcon: () => <Icon symbol="📉" /> }} />
            <Tabs.Screen name="contas" options={{ title: 'Contas', tabBarIcon: () => <Icon symbol="💳" /> }} />
            <Tabs.Screen name="mais" options={{ title: 'Mais', tabBarIcon: () => <Icon symbol="☰" /> }} />
            {/* Sub-screens — hidden from tab bar */}
            <Tabs.Screen name="investimentos" options={{ href: null }} />
            <Tabs.Screen name="metas" options={{ href: null }} />
            <Tabs.Screen name="insights" options={{ href: null }} />
            <Tabs.Screen name="saude" options={{ href: null }} />
            <Tabs.Screen name="relatorios" options={{ href: null }} />
            <Tabs.Screen name="chatbot" options={{ href: null }} />
        </Tabs>
    );
}
