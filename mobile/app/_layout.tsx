import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '@/constants/theme';
import { StyleSheet } from 'react-native';

function RootGuard() {
    const { user, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        const inAuth = segments[0] === 'login';
        const isAdmin = user?.role === 'admin';

        if (!user && !inAuth) {
            router.replace('/login');
        } else if (user && inAuth) {
            router.replace(isAdmin ? '/(admin)' : '/(app)');
        }
    }, [user, isLoading, segments]);

    return null;
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={styles.root}>
            <ToastProvider>
                <AuthProvider>
                    <RootGuard />
                    <StatusBar style="light" />
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
                </AuthProvider>
            </ToastProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
