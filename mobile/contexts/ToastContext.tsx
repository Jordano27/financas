import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    msg: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_COLOR: Record<ToastType, string> = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
};

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
    const opacity = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(2600),
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onDone(toast.id));
    }, []);

    return (
        <Animated.View style={[styles.toast, { opacity, borderLeftColor: TYPE_COLOR[toast.type] }]}>
            <Text style={styles.text}>{toast.msg}</Text>
        </Animated.View>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counter = useRef(0);

    const toast = useCallback((msg: string, type: ToastType = 'info') => {
        const id = ++counter.current;
        setToasts(prev => [...prev, { id, msg, type }]);
    }, []);

    const remove = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <View style={styles.container} pointerEvents="none">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onDone={remove} />
                ))}
            </View>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be inside ToastProvider');
    return ctx.toast;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,
        left: spacing.md,
        right: spacing.md,
        zIndex: 9999,
        gap: spacing.sm,
    },
    toast: {
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderLeftWidth: 4,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    text: {
        color: colors.textPrimary,
        fontSize: 14,
    },
});
