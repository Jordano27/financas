import { Tabs } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { colors, fontSize } from '@/constants/theme';
import { IconMenu } from '@/components/Icon';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { AppSidebar } from '@/components/AppSidebar';
import { ChatFAB } from '@/components/ChatFAB';

function HamburgerButton() {
    const { open } = useSidebar();
    return (
        <TouchableOpacity onPress={open} style={{ paddingHorizontal: 16, paddingVertical: 10 }} hitSlop={8}>
            <IconMenu color={colors.textPrimary} size={22} />
        </TouchableOpacity>
    );
}

function AppLayoutContent() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { display: 'none' },
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.textMuted,
                    tabBarLabelStyle: { fontSize: fontSize.xs },
                }}
            >
                {/* Dashboard — has its own in-content header with hamburger */}
                <Tabs.Screen name="index" options={{ headerShown: false }} />

                {/* These screens manage their own header row (hamburger + SeletorMes) */}
                <Tabs.Screen name="ganhos" options={{ headerShown: false }} />
                <Tabs.Screen name="gastos" options={{ headerShown: false }} />
                <Tabs.Screen name="contas" options={{ headerShown: false }} />
                <Tabs.Screen
                    name="mais"
                    options={{
                        headerShown: true,
                        headerTitle: '',
                        headerLeft: () => <HamburgerButton />,
                        headerStyle: { backgroundColor: colors.bg },
                        headerShadowVisible: false,
                    }}
                />

                {/* Sub-screens — hidden from tab bar */}
                <Tabs.Screen
                    name="investimentos"
                    options={{
                        href: null,
                        headerShown: true,
                        headerTitle: '',
                        headerLeft: () => <HamburgerButton />,
                        headerStyle: { backgroundColor: colors.bg },
                        headerShadowVisible: false,
                    }}
                />
                <Tabs.Screen
                    name="metas"
                    options={{
                        href: null,
                        headerShown: true,
                        headerTitle: '',
                        headerLeft: () => <HamburgerButton />,
                        headerStyle: { backgroundColor: colors.bg },
                        headerShadowVisible: false,
                    }}
                />
                <Tabs.Screen
                    name="insights"
                    options={{ href: null, headerShown: false }}
                />
                <Tabs.Screen
                    name="saude"
                    options={{ href: null, headerShown: false }}
                />
                <Tabs.Screen
                    name="relatorios"
                    options={{ href: null, headerShown: false }}
                />
                <Tabs.Screen
                    name="chatbot"
                    options={{
                        href: null,
                        headerShown: true,
                        headerTitle: '',
                        headerLeft: () => <HamburgerButton />,
                        headerStyle: { backgroundColor: colors.bg },
                        headerShadowVisible: false,
                    }}
                />
            </Tabs>

            {/* ChatFAB — visible on all screens, rendered below AppSidebar so sidebar covers it when open */}
            <ChatFAB />

            {/* Sidebar overlay — floats above all screens */}
            <AppSidebar />
        </View>
    );
}

export default function AppLayout() {
    return (
        <SidebarProvider>
            <AppLayoutContent />
        </SidebarProvider>
    );
}

