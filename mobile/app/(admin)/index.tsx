import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { api } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { fmt } from '@/utils/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/constants/theme';

interface UserMetric {
    id: string;
    name: string;
    email: string;
    active: boolean;
    plan: string;
    totalMonths: number;
    currentMonth: { income: number; outflow: number; balance: number; savingsRate: number };
}

export default function AdminMetricsPage() {
    const toast = useToast();
    const [metrics, setMetrics] = useState<UserMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await api<UserMetric[]>('GET', '/admin/metrics');
            setMetrics(data);
        } catch (e: unknown) { toast(e instanceof Error ? e.message : 'Erro', 'error'); }
    }, []);

    useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
    const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, []);

    const totalUsers = metrics.length;
    const activeUsers = metrics.filter(u => u.active).length;
    const premiumUsers = metrics.filter(u => u.plan === 'premium').length;
    const avgBalance = metrics.length > 0 ? metrics.reduce((s, u) => s + u.currentMonth.balance, 0) / metrics.length : 0;

    return (
        <View style={s.root}>
            <View style={s.header}>
                <Text style={s.title}>⚙️ Admin — Métricas</Text>
            </View>

            {/* Summary */}
            <View style={s.summaryRow}>
                {[
                    { label: 'Total', value: String(totalUsers), color: colors.textPrimary },
                    { label: 'Ativos', value: String(activeUsers), color: colors.income },
                    { label: 'Premium', value: String(premiumUsers), color: '#f59e0b' },
                    { label: 'Saldo médio', value: fmt(avgBalance), color: avgBalance >= 0 ? colors.income : colors.expense },
                ].map(c => (
                    <View key={c.label} style={s.summaryCard}>
                        <Text style={[s.summaryVal, { color: c.color }]}>{c.value}</Text>
                        <Text style={s.summaryLabel}>{c.label}</Text>
                    </View>
                ))}
            </View>

            {loading ? <ActivityIndicator color="#f59e0b" style={{ marginTop: 40 }} /> : (
                <FlatList
                    data={metrics}
                    keyExtractor={u => u.id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
                    contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={s.empty}>Nenhum usuário</Text>}
                    renderItem={({ item: u }) => (
                        <View style={[s.card, !u.active && s.cardInactive]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.userName} numberOfLines={1}>{u.name}</Text>
                                    <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <View style={[s.badge, u.plan === 'premium' ? s.badgePremium : s.badgeFree]}>
                                        <Text style={[s.badgeText, u.plan === 'premium' && s.badgeTextPremium]}>{u.plan === 'premium' ? '⭐ Premium' : 'Grátis'}</Text>
                                    </View>
                                    <View style={[s.badge, u.active ? s.badgeActive : s.badgeInactive]}>
                                        <Text style={[s.badgeText, u.active ? s.badgeTextActive : s.badgeTextInactive]}>{u.active ? '● Ativo' : '○ Inativo'}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={s.statsRow}>
                                <View style={s.statItem}><Text style={s.statLabel}>Ganhos</Text><Text style={[s.statVal, { color: colors.income }]}>{fmt(u.currentMonth.income)}</Text></View>
                                <View style={s.statItem}><Text style={s.statLabel}>Saídas</Text><Text style={[s.statVal, { color: colors.expense }]}>{fmt(u.currentMonth.outflow)}</Text></View>
                                <View style={s.statItem}><Text style={s.statLabel}>Saldo</Text><Text style={[s.statVal, { color: u.currentMonth.balance >= 0 ? colors.income : colors.expense }]}>{fmt(u.currentMonth.balance)}</Text></View>
                                <View style={s.statItem}><Text style={s.statLabel}>Poupança</Text><Text style={s.statVal}>{(u.currentMonth.savingsRate ?? 0).toFixed(1)}%</Text></View>
                            </View>
                            <Text style={s.months}>{u.totalMonths} mês{u.totalMonths !== 1 ? 'es' : ''} de dados</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.lg, paddingBottom: spacing.sm },
    title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
    summaryRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.sm },
    summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
    summaryVal: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
    summaryLabel: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: fontSize.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
    cardInactive: { opacity: 0.55 },
    userName: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
    userEmail: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
    badgeFree: { backgroundColor: colors.bg },
    badgePremium: { backgroundColor: 'rgba(251,191,36,0.15)' },
    badgeActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
    badgeInactive: { backgroundColor: 'rgba(239,68,68,0.1)' },
    badgeText: { fontSize: fontSize.xs, color: colors.textMuted },
    badgeTextPremium: { color: '#f59e0b' },
    badgeTextActive: { color: colors.income },
    badgeTextInactive: { color: colors.expense },
    statsRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.xs },
    statItem: { flex: 1 },
    statLabel: { color: colors.textMuted, fontSize: 10 },
    statVal: { color: colors.textPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
    months: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xs },
});
