import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'fin_token';

// ── Armazenamento ────────────────────────────────────────────────────────────
export async function getStoredToken(): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(TOKEN_KEY, token); return; }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function deleteToken(): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(TOKEN_KEY); return; }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ── Decode do payload JWT (sem validar assinatura) ────────────────────────────
export function decodePayload(token: string): Record<string, unknown> | null {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}
