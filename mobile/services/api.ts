import { getStoredToken, deleteToken } from '@/utils/token';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// Callback para forçar logout — configurado pelo AuthContext
let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
    _onUnauthorized = fn;
}

export async function api<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
): Promise<T> {
    const token = await getStoredToken();
    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (res.status === 401) {
        await deleteToken();
        _onUnauthorized?.();
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    return data as T;
}
