import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { api, setUnauthorizedHandler } from '@/services/api';
import { decodePayload, deleteToken, getStoredToken, saveToken } from '@/utils/token';

export interface UserPayload {
    sub: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    plan: 'free' | 'premium';
    jti: string;
    exp: number;
}

interface AuthContextValue {
    user: UserPayload | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<{ role: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ── Timeout de sessão (30 min) ────────────────────────────────────────────
    const TIMEOUT_MS = 30 * 60 * 1000;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const clearSessionTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const startSessionTimer = useCallback(() => {
        clearSessionTimer();
        timerRef.current = setTimeout(() => {
            signOut();
        }, TIMEOUT_MS);
    }, []);

    // Reinicia o timer ao voltar para o app (AppState)
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                const elapsed = Date.now() - lastActivityRef.current;
                if (user && elapsed >= TIMEOUT_MS) {
                    signOut();
                } else if (user) {
                    startSessionTimer();
                }
            } else {
                lastActivityRef.current = Date.now();
                clearSessionTimer();
            }
        });
        return () => sub.remove();
    }, [user]);

    // ── Restaurar sessão ao abrir o app ──────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const token = await getStoredToken();
                if (token) {
                    const payload = decodePayload(token) as UserPayload | null;
                    if (payload && payload.exp * 1000 > Date.now()) {
                        setUser(payload);
                        startSessionTimer();
                    } else {
                        await deleteToken();
                    }
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // ── Logout forçado por 401 ────────────────────────────────────────────────
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser(null);
            clearSessionTimer();
            router.replace('/login');
        });
    }, []);

    // ── signIn ────────────────────────────────────────────────────────────────
    const signIn = useCallback(async (email: string, password: string) => {
        const data = await api<{ token: string; role: string; name: string; plan: string }>(
            'POST', '/auth/login', { email, password },
        );
        await saveToken(data.token);
        const payload = decodePayload(data.token) as unknown as UserPayload;
        setUser(payload);
        startSessionTimer();
        return { role: data.role };
    }, []);

    // ── signOut ───────────────────────────────────────────────────────────────
    const signOut = useCallback(async () => {
        clearSessionTimer();
        try {
            const token = await getStoredToken();
            if (token) {
                await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api'}/auth/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        } catch { /* ignora erros de rede */ }
        await deleteToken();
        setUser(null);
        router.replace('/login');
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
